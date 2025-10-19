# Dependency Management

Linee guida per la gestione delle dipendenze nel monorepo InfluencerAI.

## Vite Version Conflict (Issue #178)

### Problema

Next.js build falliva con errore TypeScript in `vitest.config.ts` causato da conflitto tra versioni di Vite:

```
Type error: No overload matches this call.
...incompatibile Type 'Plugin$1<any>' is not assignable to type 'Plugin<any>'
```

**Root Cause**:
- `vitest@2.1.9` richiede `vite@^5.x` (peer dependency)
- `@vitejs/plugin-react@4.3.4` accetta `vite@^4.2.0 || ^5.0.0 || ^6.0.0` (peer dependency)
- pnpm interpreta `^6.0.0` come "6.x e superiori" → installa vite@7.1.10
- Next.js build esegue type-checking su **tutti** i file `.ts`, incluso `vitest.config.ts`
- TypeScript trova tipi conflittuali tra vite@5.4.20 e vite@7.1.10 e fallisce

### Soluzione Implementata

**Fix Tattico** (immediato):
- Aggiunto `vitest.config.ts` a `tsconfig.json` exclude in `apps/web`
- Previene type-checking Next.js su file di configurazione test
- Build funziona correttamente mantenendo type-safety su codice applicativo

**Fix Strategico** (parziale):
- Aggiunto `pnpm.overrides` per forzare `@vitejs/plugin-react@4.3.4`
- Entrambe le versioni vite (5.4.20 e 7.1.10) coesistono isolate
- Nessun conflitto runtime perché usate in contesti separati (build vs test)

### File Modificati

```json
// apps/web/tsconfig.json
{
  "exclude": ["node_modules", "vitest.config.ts"]
}
```

```json
// package.json (root)
{
  "pnpm": {
    "overrides": {
      "@vitejs/plugin-react": "4.3.4",
      "@vitejs/plugin-react>vite": "5.4.20",
      "vite": "5.4.20"
    }
  }
}
```

### Long-term Solution (Roadmap)

**Opzione A**: Upgrade Vitest 3.x (consigliato)
- Vitest 3.x supporta ufficialmente Vite 6.x+
- Allinea tutte le dipendenze a Vite 6.x o 7.x
- Richiede testing completo suite

**Opzione B**: Downgrade @vitejs/plugin-react
- Usare versione che supporta SOLO vite@5.x
- Mantiene stack attuale stabile
- Perde feature recenti plugin

### Prevention Measures

#### 1. CI Check per Version Conflicts

Aggiungere al workflow CI:

```yaml
# .github/workflows/ci.yml
- name: Check for Vite version conflicts
  run: |
    pnpm list vite --depth=10 > vite-versions.txt
    if grep -q "7\." vite-versions.txt && grep -q "5\." vite-versions.txt; then
      echo "::error::Multiple Vite major versions detected"
      exit 1
    fi
```

#### 2. Pre-commit Hook

```bash
# .husky/pre-commit
pnpm list vite --depth=1 | grep -E "vite [567]\."
```

#### 3. Renovate/Dependabot Configuration

```json
// renovate.json
{
  "packageRules": [
    {
      "groupName": "Vite ecosystem",
      "matchPackagePatterns": ["^vite", "^@vitejs/"],
      "matchUpdateTypes": ["major"],
      "enabled": false
    }
  ]
}
```

### Troubleshooting

**Sintomo**: Next.js build fallisce con errore TypeScript in config file
**Soluzione**: Verificare che file sia in `tsconfig.json` exclude

**Sintomo**: `pnpm list vite` mostra multiple versioni
**Soluzione**: Verificare `pnpm.overrides` in root package.json

**Sintomo**: Test Vitest falliscono dopo upgrade
**Soluzione**: Allineare vitest e vite a versioni compatibili (vedi compatibility matrix)

### Compatibility Matrix

| Vitest | Vite Compatible | @vitejs/plugin-react Compatible |
|--------|----------------|--------------------------------|
| 2.1.x  | 5.x            | 4.3.x (con vite 5.x)           |
| 3.x    | 6.x, 7.x       | 4.6.x+                         |

### References

- [pnpm overrides docs](https://pnpm.io/package_json#pnpmoverrides)
- [Vitest compatibility](https://vitest.dev/guide/compatibility.html)
- [Next.js TypeScript config](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- Issue: #178
- PR: TBD

---

## Best Practices

### 1. Peer Dependencies

**Problema**: pnpm.overrides NON funziona per peer dependencies

**Soluzione**: Usa pattern specifico
```json
{
  "pnpm": {
    "overrides": {
      "package-with-peer>peer-dep": "version"
    }
  }
}
```

### 2. Workspace Dependencies

**Sempre** usa `workspace:*` per dipendenze interne:
```json
{
  "dependencies": {
    "@influencerai/core-schemas": "workspace:*"
  }
}
```

### 3. Lock File Hygiene

- **MAI** committare con lock file inconsistente
- Rigenerare dopo ogni modifica a package.json:
  ```bash
  rm pnpm-lock.yaml && pnpm install
  ```
- Verificare diff prima di commit

### 4. Testing After Dependency Changes

```bash
# Full rebuild + test
pnpm clean  # se disponibile
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
pnpm build
pnpm test
```

### 5. Security Audits

```bash
pnpm audit --audit-level=high
pnpm audit --fix
```

---

**Ultimo aggiornamento**: 2025-10-19
**Responsabile**: DevOps Team
