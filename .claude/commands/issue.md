---
description: Lavora su una issue esistente con approccio BDD (Behavior-Driven Development)
---

# Issue Workflow - Approccio BDD

Sei un esperto sviluppatore software senior che lavora su questo progetto seguendo l'approccio BDD (Behavior-Driven Development).

**ISSUE:** $ARGUMENTS

Il tuo compito è analizzare e lavorare su questa issue utilizzando una metodologia BDD rigorosa.

## Il tuo approccio BDD:

### 1. Discovery & Analysis
- Comprendi a fondo il problema dal punto di vista del comportamento atteso
- Identifica gli stakeholder e i loro bisogni
- Formula esempi concreti di comportamento desiderato
- Valuta l'impatto sul codebase esistente

### 2. Formulation - Definisci i Comportamenti
- Scrivi scenari in formato Given-When-Then
- Identifica happy path e edge cases
- Definisci acceptance criteria verificabili
- Crea esempi concreti e comprensibili a tutti

### 3. Automation - Test First
- Scrivi prima i test basati sui comportamenti definiti
- Usa un linguaggio ubiquitario comprensibile al business
- Parti dai test di accettazione (outside-in)
- Implementa test unitari per i dettagli tecnici

### 4. Implementation
- Implementa il codice minimo per far passare i test
- Refactoring continuo mantenendo i test verdi
- **Scrivi codice che il tuo futuro sé possa modificare facilmente**
- Mantieni la corrispondenza tra comportamento e implementazione

### 5. Review Post-Implementazione
- **Rivedi il tuo lavoro e elenca cosa potrebbe essersi rotto**
- Verifica che tutti gli scenari siano coperti
- Identifica comportamenti di sistema che potrebbero essere impattati
- Suggerisci scenari di test di regressione aggiuntivi
- Valuta se la soluzione rispecchia realmente il comportamento atteso

## Principi guida BDD:

- Conversazioni collaborative prima del codice
- Esempi concreti come documentazione vivente
- Outside-in development (dall'interfaccia ai dettagli)
- Test come specifica del comportamento, non dell'implementazione
- Linguaggio ubiquitario condiviso con il business
- **Manutenibilità: codice e test devono essere comprensibili tra 6 mesi**
- Feedback rapido attraverso automazione

## Format degli Scenari:

Feature: [Nome della feature]

Scenario: [Descrizione del comportamento]
  Given [contesto iniziale]
  And [altro contesto se necessario]
  When [azione/evento]
  Then [risultato atteso]
  And [altro risultato se necessario]

Scenario: [Edge case]
  Given [contesto]
  When [azione]
  Then [risultato]

Scenario: [Gestione errori]
  Given [contesto]
  When [azione non valida]
  Then [errore atteso con messaggio chiaro]

## Workflow di Lavoro:

### Phase 0: Setup Branch (SEMPRE PER PRIMO)
1. **Recupera i dettagli della issue** con `gh issue view $ARGUMENTS`
2. **Determina il nome del branch**:
   - Se la issue ha un ID breve (es. TEST-02, API-05, CHAT-01): usa quello come nome branch
   - Se il nome è lungo o non ha ID: usa `issue-{numero}` (es. issue-445)
3. **Crea e passa al nuovo branch**: `git checkout -b {nome-branch}`
4. **Verifica che sei sul branch corretto**: `git branch --show-current`

### Phase 1: Discovery & Test
1. **Analizza la issue** e formula i comportamenti attesi in formato BDD
2. **Scrivi i test** che descrivono i comportamenti
3. **Committa i test**: `git add . && git commit -m "test: add BDD tests for {issue-id}"`

### Phase 2: Implementation
1. **Implementa** il codice minimo per far passare i test
2. **Committa l'implementazione**: `git add . && git commit -m "feat/fix: implement {issue-id}"`

### Phase 3: Refactoring & Quality
1. **Refactora** migliorando la qualità mantenendo i test verdi
2. **Committa il refactoring** (se necessario): `git add . && git commit -m "refactor: improve code quality for {issue-id}"`

### Phase 4: Documentation & Review
1. **Rivedi** identificando cosa potrebbe essersi rotto
2. **Aggiorna la documentazione** se necessario
3. **Committa la documentazione**: `git add . && git commit -m "docs: update documentation for {issue-id}"`

### Phase 5: Pull Request & Code Review (SEMPRE ALLA FINE)
1. **Push del branch**: `git push -u origin {nome-branch}`
2. **Crea la Pull Request** con:
   - `gh pr create --title "{issue-id}: {titolo-conciso}" --body "{descrizione-dettagliata}"`
   - Includi nel body: Summary, BDD scenarios, Test coverage, Breaking changes (if any)
   - Referenzia la issue con "Closes #{numero}" o "Fixes #{numero}"
3. **Richiedi code review**: Usa il sistema di review di GitHub per ottenere feedback

### Commit Message Convention:
- Test: `test: add BDD tests for {issue-id}`
- Feature: `feat: implement {issue-id} - {descrizione}`
- Fix: `fix: resolve {issue-id} - {descrizione}`
- Refactor: `refactor: improve {issue-id} implementation`
- Docs: `docs: update documentation for {issue-id}`

**IMPORTANTE:**
- SEMPRE crea un branch PRIMA di iniziare a lavorare
- SEMPRE committa le modifiche sul branch, NON su main
- SEMPRE crea una PR alla fine, NON fare merge diretto su main

Inizia analizzando la issue **$ARGUMENTS** e procedi seguendo questo workflow BDD con git branching.