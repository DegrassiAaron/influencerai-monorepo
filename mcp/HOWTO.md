# Guida MCP per Claude Code

## 📚 Panoramica

Questo documento fornisce istruzioni dettagliate su come utilizzare i server MCP (Model Context Protocol) disponibili tramite prompt in Claude Code.

## 🔧 MCP Disponibili

1. **Sequential Thinking** - Ragionamento step-by-step e pianificazione
2. **GitHub Project Manager** - Gestione completa progetti GitHub
3. **Memory Bank** - Memoria persistente con ricerca semantica
4. **Playwright** - Automazione browser e testing E2E
5. **Knowledge Graph** - Grafo di conoscenza e analisi dipendenze
6. **n8n** - Gestione workflow e automazioni
7. **Magic** - Funzionalità AI avanzate
8. **Claude Context** - Gestione contesto conversazionale (sempre attivo)

---

## 🎯 Quando Usare Quale MCP

### Sequential Thinking

**Usa quando:**

- Devi pianificare architetture complesse
- Serve decomposizione di task in step
- Necessiti analisi metodica di un problema
- Vuoi strategia prima dell'implementazione

**Parole chiave trigger:** "pianifica", "strategia", "step-by-step", "analizza", "pensa metodicamente"

**Esempi:**

```bash
claude.code "Pianifica l'architettura per un sistema di autenticazione con OAuth2"

claude.code "Analizza step-by-step come ottimizzare questo componente React"

claude.code "Pensa metodicamente alla migrazione da REST a GraphQL"
```

---

### GitHub Project Manager

**Usa quando:**

- Devi creare/gestire branch, commit, PR
- Cerchi issue o commit history
- Gestisci milestone e release
- Analizzi repository

**Parole chiave trigger:** "branch", "commit", "PR", "issue", "repository", "merge"

**Esempi:**

```bash
claude.code "Crea branch feature/user-profile e inizializza la struttura"

claude.code "Cerca issue aperte relative a performance"

claude.code "Mostra gli ultimi 5 commit su CartService.ts"

claude.code "Crea PR per mergare feature/cart in develop con checklist completa"
```

---

### Memory Bank

**Usa quando:**

- Vuoi recuperare decisioni/pattern passati
- Devi salvare convenzioni per riferimento futuro
- Cerchi "come abbiamo fatto X in passato"
- Mantieni consistenza su progetti

**Parole chiave trigger:** "ricorda", "abbiamo già", "salva in memoria", "pattern usato", "convenzioni"

**Esempi per RECUPERARE:**

```bash
claude.code "Ricorda: quali pattern usiamo per gestione stato?"

claude.code "Abbiamo già implementato rate limiting? Come?"

claude.code "Recupera dalla memoria le convenzioni di naming per API endpoints"
```

**Esempi per SALVARE:**

```bash
claude.code "Implementa autenticazione JWT e SALVA IN MEMORIA il pattern usato"

claude.code "Dopo il refactoring, memorizza le decisioni architetturali prese"

claude.code "Salva in memory bank: struttura cartelle per feature modules"
```

---

### Playwright

**Usa quando:**

- Testing E2E di UI/UX
- Automazione browser
- Screenshot e video testing
- Validazione user flows completi

**Parole chiave trigger:** "test E2E", "playwright", "screenshot", "automatizza browser", "user flow"

**Esempi:**

```bash
claude.code "Scrivi test Playwright per il flusso di login completo"

claude.code "Usa Playwright per testare che il carrello persista dopo refresh"

claude.code "Crea test E2E del checkout con screenshot ad ogni step"

claude.code "Automatizza: vai su /products, aggiungi 3 items, verifica totale"
```

**Test responsivi:**

```bash
claude.code "Test Playwright su iPhone 12, iPad e Desktop per la home page"

claude.code "Screenshot comparativi mobile vs desktop della dashboard"
```

---

### Knowledge Graph

**Usa quando:**

- Analizzi dipendenze tra componenti
- Serve impact analysis di modifiche
- Mappi relazioni in architettura
- Debugging di effetti a cascata

**Parole chiave trigger:** "dipendenze", "impatto", "quali componenti usano", "relazioni", "mappa"

**Esempi:**

```bash
claude.code "Usa knowledge graph: quali componenti dipendono da UserContext?"

claude.code "Analizza impatto di modificare la struttura di User model"

claude.code "Mappa relazioni tra tutti i servizi nel microservizio auth"

claude.code "Quali file saranno affetti modificando l'API di PaymentService?"
```

---

### n8n

**Usa quando:**

- Setup workflow CI/CD
- Automazioni con trigger temporali
- Integrazioni tra servizi (GitHub, Slack, etc)
- Task schedulati

**Parole chiave trigger:** "automatizza", "workflow", "trigger", "schedule", "integra"

**Esempi:**

```bash
claude.code "Crea workflow n8n: trigger su push → run tests → deploy staging"

claude.code "Automatizza con n8n: ogni lunedì genera report PR mergiate"

claude.code "Setup n8n: su nuova issue GitHub → crea task Linear → notifica Slack"

claude.code "Workflow deployment automatico quando test Playwright passano"
```

---

### Magic

**Usa quando:**

- Analisi dati complesse
- Generazione report o contenuti
- Pattern recognition avanzato
- Task che richiedono AI reasoning superiore

**Parole chiave trigger:** "analizza pattern", "genera report", "AI avanzato", "insights"

**Esempi:**

```bash
claude.code "Usa Magic per analizzare log e identificare pattern di errori"

claude.code "Genera report esecutivo da metriche performance degli ultimi 3 mesi"

claude.code "Analizza con AI il codebase e suggerisci ottimizzazioni architetturali"
```

---

## 🔄 Workflow Comuni

### 1. Implementare Nuova Feature (Completo)

```bash
# Step 1: Pianifica
claude.code "Pianifica (sequential) implementazione sistema notifiche real-time con WebSocket"

# Step 2: Setup repository
claude.code "Crea branch feature/notifications e struttura file base (github)"

# Step 3: Ricorda pattern
claude.code "Ricorda (memory): pattern WebSocket usati in altri progetti"

# Step 4: Implementa
claude.code "Implementa NotificationService seguendo il piano, commit progressivi"

# Step 5: Testa
claude.code "Scrivi test Playwright per notifiche: ricezione, dismissal, filtering"

# Step 6: Salva conoscenza
claude.code "Salva in memory: pattern notifiche real-time con reconnection logic"

# Step 7: PR
claude.code "Crea PR feature/notifications → develop con descrizione e checklist"
```

### 2. Bug Fixing

```bash
# Step 1: Analizza contesto
claude.code "Analizza (knowledge graph) dipendenze di CartTotal component"

# Step 2: Ricerca storico
claude.code "Cerca issue simili già risolti (memory + github)"

# Step 3: Pianifica fix
claude.code "Pianifica (sequential) il debug: verifica useMemo, dependency array, selectors"

# Step 4: Implementa
claude.code "Crea branch fix/cart-total-reactivity e applica fix"

# Step 5: Test regressione
claude.code "Test Playwright che replica il bug e verifica il fix"

# Step 6: Documenta
claude.code "Salva in memory: cart calculations require deep equality checks"

# Step 7: PR
claude.code "Crea PR con fix e link a issue #45"
```

### 3. Refactoring

```bash
# Step 1: Analizza
claude.code "Usa knowledge graph per mappare tutte le dipendenze di ProductPage"

# Step 2: Pianifica
claude.code "Pianifica (sequential) splitting di ProductPage in 4 componenti"

# Step 3: Branch
claude.code "Crea branch refactor/product-page-components (github)"

# Step 4: Ricorda convenzioni
claude.code "Ricorda (memory): convenzioni per component splitting nel progetto"

# Step 5: Refactora
claude.code "Esegui refactoring seguendo il piano"

# Step 6: Test non-regressione
claude.code "Test Playwright completi su ProductPage + screenshot comparison"

# Step 7: PR
claude.code "Crea PR refactoring con before/after metrics"
```

### 4. Setup Deployment Pipeline

```bash
# Step 1: Pianifica pipeline
claude.code "Pianifica (sequential) pipeline CI/CD: test → build → staging → prod"

# Step 2: Workflow automation
claude.code "Crea workflow n8n: trigger su tag → build → test → deploy"

# Step 3: Test automation
claude.code "Setup Playwright smoke tests automatici post-deploy"

# Step 4: Monitoring
claude.code "n8n workflow: monitor errori → alert Slack → create GitHub issue"

# Step 5: Documenta
claude.code "Salva in memory: deployment pipeline configuration e best practices"
```

### 5. Code Review

```bash
# Step 1: Fetch PR
claude.code "Mostra PR #67 e fetch branch localmente (github)"

# Step 2: Analizza impatto
claude.code "Usa knowledge graph: PR modifica UserContext, quali componenti impattati?"

# Step 3: Verifica pattern
claude.code "Ricorda (memory): la PR segue i nostri pattern per profile pages?"

# Step 4: Test manuale
claude.code "Test Playwright locale della branch: profile rendering, edit, upload"

# Step 5: Review
claude.code "Commenta su PR con checklist review completa"
```

---

## 🚫 Come EVITARE MCP Specifici

### Disabilitazione Esplicita

```bash
# Evita GitHub (solo codice, no commit)
claude.code "SENZA usare git, mostra solo il codice per login form"

# Evita Sequential (quick fix)
claude.code "Quick fix SENZA pianificazione: aggiungi validazione email"

# Evita Playwright (solo unit test)
claude.code "Solo unit test Jest, NON E2E: testa calculateTotal()"

# Evita Memory Bank (approccio fresco)
claude.code "IGNORA precedenti, fresh approach per autenticazione"

# Evita Knowledge Graph (modifica diretta)
claude.code "SENZA analizzare dipendenze, modifica solo questo file"

# Evita n8n (esecuzione manuale)
claude.code "Esegui manualmente SENZA automation"
```

---

## 📋 Template di Prompt

### Template Base

```
[AZIONE] [COSA] [CON MCP] [SENZA MCP] [CONTESTO]
```

### Esempi Completi

```bash
# Feature completa con tutti i MCP rilevanti
claude.code "Pianifica (sequential) e implementa (github) autenticazione OAuth,
testa (playwright), salva pattern (memory), SENZA automation n8n"

# Bug fix rapido minimalista
claude.code "Quick fix validazione in LoginForm.tsx,
solo codice SENZA branch/test/pianificazione"

# Refactoring guidato
claude.code "Analizza dipendenze (knowledge graph), pianifica (sequential),
implementa (github), testa (playwright), documenta (memory)"

# Setup automation
claude.code "Crea workflow n8n per deploy quando test playwright passano,
notifica Slack, SENZA modificare codice applicazione"

# Analisi architetturale
claude.code "Usa magic per analizzare codebase, knowledge graph per dipendenze,
genera report ottimizzazioni, SENZA implementare modifiche"
```

---

## 🎨 Combinazioni MCP Potenti

### Pattern: Research → Plan → Implement → Test → Document

```bash
claude.code "Ricerca (memory + github) pattern auth esistenti,
pianifica (sequential) nuovo sistema OAuth,
implementa (github),
testa (playwright),
salva (memory) decisioni"
```

### Pattern: Analyze → Refactor → Validate

```bash
claude.code "Analizza (knowledge graph) dipendenze OrderService,
pianifica (sequential) refactoring,
implementa (github),
valida (playwright) non-regressione"
```

### Pattern: Automate → Monitor → Alert

```bash
claude.code "Automatizza (n8n) deploy pipeline,
monitora (playwright) smoke tests,
alert (n8n + github) su failures"
```

---

## ⚡ Quick Reference

### MCP per Fase di Sviluppo

| Fase                | MCP Primari                 | MCP Secondari           |
| ------------------- | --------------------------- | ----------------------- |
| **Planning**        | Sequential                  | Memory, Knowledge Graph |
| **Setup**           | GitHub                      | Sequential, Memory      |
| **Implementazione** | GitHub                      | Sequential, Memory      |
| **Testing**         | Playwright                  | Sequential, Memory      |
| **Bug Fixing**      | GitHub, Knowledge Graph     | Memory, Sequential      |
| **Refactoring**     | Sequential, Knowledge Graph | GitHub, Memory          |
| **Deployment**      | n8n, GitHub                 | Playwright, Magic       |
| **Code Review**     | GitHub, Knowledge Graph     | Memory, Sequential      |
| **Performance**     | Magic, Playwright           | Sequential, Memory      |
| **Automation**      | n8n                         | Playwright, GitHub      |

### Task Semplici vs Complessi

**Task Semplice (1 MCP):**

```bash
claude.code "Fix typo in README (solo github)"
claude.code "Aggiungi console.log per debug (no mcp)"
```

**Task Medio (2-3 MCP):**

```bash
claude.code "Pianifica (sequential) e implementa (github) validator email"
```

**Task Complesso (4+ MCP):**

```bash
claude.code "Analizza (knowledge graph), pianifica (sequential),
implementa (github), testa (playwright), automatizza (n8n), documenta (memory)"
```

---

## 💡 Best Practices

### 1. Sii Esplicito sui MCP Desiderati

```bash
# ✅ CHIARO
claude.code "Usa sequential per pianificare, poi github per implementare"

# ❌ VAGO
claude.code "Implementa feature carrello"
```

### 2. Usa Parentesi per Chiarezza

```bash
claude.code "Analizza (knowledge graph) dipendenze poi refactora (github) SENZA test (no playwright)"
```

### 3. Sequenza Logica

```bash
# ✅ ORDINE LOGICO
Sequential → Memory (ricerca) → GitHub → Playwright → Memory (salva)

# ❌ DISORDINATO
GitHub → Sequential → Memory → GitHub → Sequential
```

### 4. Minimizza per Task Semplici

```bash
# ✅ MINIMALISTA per fix veloce
claude.code "Correggi validazione email in utils.ts"

# ❌ OVER-ENGINEERING per task semplice
claude.code "Pianifica, analizza dipendenze, crea branch, test E2E per fix typo"
```

### 5. Combina Sapientemente

```bash
# ✅ SMART COMBINATION
claude.code "Ricorda pattern (memory), pianifica (sequential), implementa (github)"

# ❌ MCP RIDONDANTI
claude.code "Usa sequential e magic e claude context per pianificare"
# (Claude Context è sempre attivo, Magic ridondante per pianificazione)
```

---

## 🔍 Troubleshooting

### Claude non usa l'MCP che voglio

**Soluzione:** Sii più esplicito

```bash
# Invece di:
claude.code "Testa il login"

# Scrivi:
claude.code "Usa Playwright per test E2E del login flow"
```

### Claude usa troppi MCP

**Soluzione:** Specifica cosa NON usare

```bash
claude.code "Fix rapido SENZA branch/test/pianificazione: correggi typo"
```

### Voglio workflow multi-step chiaro

**Soluzione:** Numera gli step

```bash
claude.code "Step 1: pianifica (sequential).
Step 2: ricorda pattern (memory).
Step 3: implementa (github).
Step 4: testa (playwright)"
```

### Non ricordo quale MCP serve

**Soluzione:** Descrivi il task, Claude sceglierà

```bash
claude.code "Voglio implementare auth, testarlo e salvare il pattern per dopo"
# Claude userà automaticamente: Sequential, GitHub, Playwright, Memory
```

---

## 📖 Esempi Completi Real-World

### Esempio 1: Feature E-commerce "Wishlist"

```bash
# Sessione completa
claude.code "Ricorda (memory): abbiamo pattern per feature user-specific?
Pianifica (sequential) implementazione wishlist con persistenza DB e UI.
Crea issue e branch (github) feature/wishlist"

# [Claude pianifica e crea branch]

claude.code "Implementa backend API /wishlist seguendo il piano, commit progressivi"

# [Claude implementa e committa]

claude.code "Implementa frontend components per wishlist seguendo pattern esistenti"

# [Claude implementa UI]

claude.code "Test Playwright: aggiungi/rimuovi items, persistenza, sync con backend"

# [Claude scrive e esegue test]

claude.code "Se test OK, crea PR con descrizione completa e salva pattern in memory"

# [Claude crea PR e documenta]
```

### Esempio 2: Performance Optimization

```bash
claude.code "Usa Magic per analizzare bundle size e identificare bottleneck.
Pianifica (sequential) ottimizzazioni.
Ricorda (memory) precedenti optimization wins"

# [Claude analizza e pianifica]

claude.code "Crea branch perf/optimize-bundle (github) e implementa:
- Code splitting
- Lazy loading
- Tree shaking"

# [Claude implementa]

claude.code "Test Playwright performance: lighthouse score, load time, FCP, LCP.
Confronta prima/dopo"

# [Claude testa]

claude.code "Se metrics migliorati, crea PR con grafici before/after.
Salva (memory) tecniche che hanno funzionato meglio"
```

### Esempio 3: Security Audit + Fix

```bash
claude.code "Pianifica (sequential) security audit completo:
XSS, CSRF, SQL injection, auth bypass.
Ricorda (memory) security issues passati"

# [Claude pianifica audit]

claude.code "Analizza (knowledge graph) quali endpoint API sono protetti vs pubblici"

# [Claude mappa security surface]

claude.code "Test Playwright per scenari security:
- XSS injection attempts
- Auth bypass
- CSRF attacks
Salva findings"

# [Claude esegue security tests]

claude.code "Crea issue (github) per ogni vulnerability trovata.
Per critical issues crea branch fix/security-* e implementa fix"

# [Claude crea issues e applica fix]

claude.code "Setup n8n workflow: daily dependency scan, alert su CVE, auto-create issues"

# [Claude automatizza security monitoring]

claude.code "Salva in memory: security checklist e remediation patterns usati"
```

---

## 🎓 Advanced Patterns

### Pattern: Multi-Repo Coordination

```bash
claude.code "Analizza (knowledge graph) dipendenze tra repo frontend e backend.
Pianifica (sequential) breaking change API.
Crea branch su entrambi (github) sync/api-v2.
Setup n8n per deploy coordinato"
```

### Pattern: Legacy Refactoring

```bash
claude.code "Usa Magic per analizzare legacy code patterns.
Knowledge graph per mappare ogni dipendenza.
Sequential per pianificare refactoring incrementale.
Memory per trackare progresso e decisioni.
Playwright per test regressione continua"
```

### Pattern: Feature Flag Rollout

```bash
claude.code "Implementa feature flag (github).
Setup n8n workflow: gradual rollout 10% → 50% → 100%.
Playwright monitoring ad ogni step.
Magic per analizzare metriche.
Auto-rollback su errori"
```

---

## 📚 Appendice: Glossario Comandi

### Comandi Memory Bank

```bash
"Ricorda [cosa]"
"Abbiamo già [fatto cosa]?"
"Salva in memoria [cosa]"
"Recupera pattern per [cosa]"
"Memorizza decisione: [cosa]"
```

### Comandi GitHub

```bash
"Crea branch [nome]"
"Commit [messaggio]"
"Cerca issue [filtro]"
"Crea PR [da] → [a]"
"Mostra commit che modificano [file]"
```

### Comandi Playwright

```bash
"Test E2E [flusso]"
"Screenshot [pagina] su [device]"
"Automatizza: [azioni]"
"Valida [condizione] con Playwright"
```

### Comandi Sequential

```bash
"Pianifica [task]"
"Analizza step-by-step [problema]"
"Strategia per [obiettivo]"
"Pensa metodicamente a [cosa]"
```

### Comandi Knowledge Graph

```bash
"Analizza dipendenze di [componente]"
"Quali componenti usano [cosa]?"
"Mappa relazioni [scope]"
"Impact analysis di [modifica]"
```

### Comandi n8n

```bash
"Automatizza [workflow]"
"Setup trigger [evento] → [azione]"
"Workflow: [sequenza]"
"Integra [servizio] con [servizio]"
```

---

## 🚀 Quick Start

### Per iniziare velocemente:

1. **Task semplice:** Usa prompt diretto senza MCP espliciti

   ```bash
   claude.code "Aggiungi validazione email"
   ```

2. **Task medio:** Specifica 1-2 MCP

   ```bash
   claude.code "Pianifica (sequential) e implementa (github) login"
   ```

3. **Task complesso:** Workflow multi-MCP
   ```bash
   claude.code "Ricerca (memory), pianifica (sequential), implementa (github),
   testa (playwright), automatizza (n8n), documenta (memory)"
   ```

### Regola d'oro:

> **Meno è meglio.** Usa solo gli MCP necessari per il task specifico.

---

## 📞 Support

Se Claude non si comporta come previsto:

1. Sii più esplicito sui MCP desiderati
2. Usa "SENZA [mcp]" per escludere
3. Numera gli step per workflow chiari
4. Riferisci questo documento: "Segui le linee guida MCP nel file md"

---

**Versione:** 1.0  
**Ultimo aggiornamento:** Ottobre 2025
