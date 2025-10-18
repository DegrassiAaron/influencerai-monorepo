# Riferimento Variabili d'Ambiente

Documentazione completa di tutte le variabili d'ambiente utilizzate nel progetto.

---

## File .env Principale (Root)

### Environment

| Variabile | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `NODE_ENV` | `development\|production\|test` | `development` | Ambiente esecuzione |
| `LOG_LEVEL` | `error\|warn\|info\|debug` | `info` | Livello logging |

### Database

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `DATABASE_URL` | string | ✅ | Connection string PostgreSQL |

**Esempio**:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/influencerai
```

### Redis

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `REDIS_URL` | string | ✅ | Connection string Redis |

**Esempio**:
```bash
REDIS_URL=redis://localhost:6379
# Con password: redis://:password@localhost:6379
```

### MinIO / S3

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `S3_ENDPOINT` | string | ✅ | Endpoint MinIO/S3 |
| `S3_KEY` | string | ✅ | Access Key |
| `S3_SECRET` | string | ✅ | Secret Key |
| `S3_BUCKET` | string | ✅ | Bucket name per assets |
| `S3_REGION` | string | No | Regione S3 (default: `us-east-1`) |
| `S3_FORCE_PATH_STYLE` | boolean | No | Forza path-style per MinIO (default: `true`) |

**Esempio**:
```bash
S3_ENDPOINT=http://localhost:9000
S3_KEY=minio
S3_SECRET=minio12345
S3_BUCKET=assets
S3_FORCE_PATH_STYLE=true
```

### Autenticazione

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `JWT_SECRET` | string | ✅ | Secret per firmare JWT token |
| `JWT_EXPIRES_IN` | string | No | Durata token (default: `7d`) |

**Esempio**:
```bash
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d
```

**⚠️ Sicurezza**: In produzione, usa stringa random di almeno 32 caratteri.

### OpenRouter API

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `OPENROUTER_API_KEY` | string | ✅ | API key OpenRouter |
| `OPENROUTER_BASE_URL` | string | No | Base URL (default: `https://openrouter.ai/api/v1`) |

**Esempio**:
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
```

Ottieni chiave gratuita su: https://openrouter.ai/keys

### ComfyUI

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `COMFYUI_URL` | string | No | URL ComfyUI API (default: `http://localhost:8188`) |
| `COMFYUI_TIMEOUT` | number | No | Timeout richieste ms (default: `300000` = 5 min) |

**Esempio**:
```bash
COMFYUI_URL=http://192.168.1.100:8188  # GPU machine remota
COMFYUI_TIMEOUT=600000  # 10 minuti per video generation
```

### n8n

| Variabile | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `N8N_WEBHOOK_URL` | string | No | Base URL per webhook n8n (default: `http://localhost:5678`) |

**Esempio**:
```bash
N8N_WEBHOOK_URL=https://n8n.example.com
```

### Limiti e Configurazione

| Variabile | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `MAX_UPLOAD_SIZE` | string | `100MB` | Max dimensione file upload |
| `MAX_DATASET_IMAGES` | number | `5000` | Max immagini per dataset |
| `MONTHLY_OPENROUTER_BUDGET` | number | `150.00` | Budget mensile USD |

### Feature Flags

| Variabile | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `ENABLE_CACHING` | boolean | `true` | Abilita caching OpenRouter |
| `ENABLE_RATE_LIMITING` | boolean | `true` | Abilita rate limiting API |
| `ENABLE_AUTO_CAPTIONS` | boolean | `false` | Auto-captioning con BLIP/CLIP |

---

## File .env App-Specific

### API (`apps/api/.env`)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `PORT` | `3001` | Porta server API |
| `CORS_ORIGIN` | `http://localhost:3000` | Origin permessi CORS |
| `SWAGGER_ENABLED` | `true` | Abilita Swagger UI |

### Web (`apps/web/.env.local`)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | URL API backend |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Abilita analytics |

### Worker (`apps/worker/.env`)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `QUEUE_CONCURRENCY_CONTENT_GEN` | `3` | Job concorrenti content generation |
| `QUEUE_CONCURRENCY_VIDEO_GEN` | `2` | Job concorrenti video generation |
| `QUEUE_CONCURRENCY_LORA_TRAINING` | `1` | Job concorrenti LoRA training |

---

## Template .env.example

```bash
# ===== Environment =====
NODE_ENV=development
LOG_LEVEL=debug

# ===== Database =====
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/influencerai

# ===== Redis =====
REDIS_URL=redis://localhost:6379

# ===== MinIO S3 =====
S3_ENDPOINT=http://localhost:9000
S3_KEY=minio
S3_SECRET=minio12345
S3_BUCKET=assets
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# ===== JWT =====
JWT_SECRET=change-this-to-a-random-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# ===== OpenRouter =====
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ===== ComfyUI =====
COMFYUI_URL=http://localhost:8188
COMFYUI_TIMEOUT=300000

# ===== n8n =====
N8N_WEBHOOK_URL=http://localhost:5678

# ===== Limits =====
MAX_UPLOAD_SIZE=100MB
MAX_DATASET_IMAGES=5000
MONTHLY_OPENROUTER_BUDGET=150.00

# ===== Feature Flags =====
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
ENABLE_AUTO_CAPTIONS=false
```

---

## Validazione

Il sistema valida automaticamente le variabili d'ambiente all'avvio.

**Esempio validation**:
```typescript
// apps/api/src/config/env.validation.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENROUTER_API_KEY: z.string().min(20),
  JWT_SECRET: z.string().min(32),
});

// Valida all'avvio
envSchema.parse(process.env);
```

---

## Best Practices

1. **Non committare `.env`**: Sempre in `.gitignore`
2. **Usa `.env.example`**: Template versionato
3. **Rotate secrets**: JWT/API keys ogni 90 giorni
4. **Environment-specific**: `.env.development`, `.env.production`
5. **Validation**: Valida all'avvio app per fail-fast

---

## Riferimenti

- [Avvio Rapido](./avvio-rapido.md)
- [Setup Locale](./sviluppo-locale.md)
- [Deployment](../architecture/deployment.md)
