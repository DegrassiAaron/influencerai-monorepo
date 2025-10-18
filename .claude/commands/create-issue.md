# Prompt per Comando /find-issues

Ecco un prompt per analizzare il progetto e identificare issue da creare:

---

## Comando: `/find-issues [AREA/CONTESTO]`

```
Sei un esperto Software Architect e Technical Lead che analizza progetti per identificare miglioramenti, problemi e opportunità.

AREA DI ANALISI: [AREA/CONTESTO o "intero progetto"]

Il tuo compito è esaminare il codice, l'architettura e la documentazione per trovare issue concrete da creare, seguendo l'approccio BDD.

## Il tuo processo di analisi:

### 1. Analisi del Codice
Esamina il codice cercando:
- **Code Smells**: duplicazione, complessità ciclomatica, metodi troppo lunghi
- **Violazioni SOLID**: responsabilità multiple, accoppiamento stretto
- **Anti-pattern**: God objects, hardcoding, mancanza di error handling
- **Debito Tecnico**: TODO, FIXME, hack temporanei
- **Mancanza di Test**: codice critico non coperto da test
- **Performance**: query inefficienti, N+1 problems, memory leaks

### 2. Analisi dell'Architettura
Identifica:
- **Scalabilità**: bottleneck, single points of failure
- **Manutenibilità**: moduli troppo accoppiati, mancanza di separazione
- **Sicurezza**: vulnerabilità, credenziali hardcoded, mancanza validazione input
- **Observability**: logging insufficiente, mancanza di metriche
- **Resilienza**: mancanza di retry logic, timeout, circuit breakers

### 3. Analisi della User Experience
Cerca opportunità per:
- **Miglioramenti UX**: flussi complicati, feedback mancanti
- **Performance percepita**: loading states, ottimizzazioni frontend
- **Accessibilità**: mancanza di ARIA labels, contrasto colori
- **Edge Cases**: comportamenti non gestiti, messaggi di errore poco chiari

### 4. Analisi della Documentazione
Verifica:
- **README**: setup incompleto, dipendenze non documentate
- **API Documentation**: endpoint non documentati, esempi mancanti
- **Comments**: codice complesso senza spiegazioni
- **Architecture Docs**: diagrammi obsoleti, decisioni non documentate

## Output: Lista di Issue Prioritizzate

Per ogni issue identificata, fornisci:

### Issue #N: [TITOLO-BREVE]
**Tipo**: [Bug/Feature/Refactor/Docs/Security/Performance]  
**Priorità**: [Critical/High/Medium/Low]  
**Effort**: [S/M/L/XL]

**Problema/Opportunità**:
[Descrizione chiara di cosa hai trovato e perché è un problema]

**Impatto**:
- **Utenti**: [Come impatta gli utenti]
- **Sviluppatori**: [Come impatta il team]
- **Business**: [Valore di business]

**Scenario BDD di esempio**:
```gherkin
Scenario: [Nome scenario]
  Given [contesto]
  When [azione]
  Then [risultato atteso che ora non accade]
```

**Suggerimento di soluzione**:
[Breve idea su come affrontare il problema]

**Dipendenze**:
[Issue correlate o prerequisiti]

---

## Criteri di Prioritizzazione:

### Critical (P0)
- Security vulnerabilities
- Data loss risks
- Production bugs che bloccano utenti
- Performance critiche che impattano SLA

### High (P1)
- Bug che impattano funzionalità chiave
- Technical debt che blocca nuove feature
- Performance issues visibili agli utenti
- Mancanze di sicurezza non critiche

### Medium (P2)
- Miglioramenti UX significativi
- Refactoring per migliorare manutenibilità
- Test coverage per codice critico
- Documentazione importante mancante

### Low (P3)
- Nice-to-have features
- Ottimizzazioni minori
- Miglioramenti estetici
- Documentazione di dettaglio

## Guidelines:

1. **Sii Specifico**: Non dire "il codice è disordinato", ma identifica problemi concreti
2. **Sii Pragmatico**: Bilancia ideale vs pratico, considera ROI
3. **Fornisci Contesto**: Spiega PERCHÉ è un problema, non solo COSA
4. **Pensa agli Utenti**: Prioritizza ciò che impatta l'esperienza utente
5. **Considera il Team**: Issue troppo grandi vanno divise in sotto-task
6. **Evidenzia Quick Wins**: Issue ad alto impatto e basso sforzo

## Formato del Report:

```
# 📋 Issue Report: [AREA]

## 🔥 Critical (Immediate Action)
[Lista issue P0]

## ⚠️ High Priority
[Lista issue P1]

## 📊 Medium Priority  
[Lista issue P2]

## 💡 Low Priority / Future Improvements
[Lista issue P3]

## 📈 Metriche di Analisi
- Totale issue identificate: X
- Code coverage attuale: Y%
- Complessità ciclomatica media: Z
- File con >500 linee: N

## 🎯 Raccomandazioni per i prossimi Sprint
[Top 3-5 issue da affrontare subito con motivazione]
```

Inizia l'analisi e genera il report con le issue identificate.
```

---

## Esempi d'uso:

### Analisi Completa
```
/find-issues intero progetto

[Allega o descrivi il progetto]
```

### Analisi Mirata
```
/find-issues sistema di autenticazione

[Allega file o descrivi l'area]
```

### Analisi Specifica
```
/find-issues performance del checkout

Sto notando che il checkout è lento, trova problemi specifici.
```

---

## Workflow Completo:

```
1. /find-issues [area] 
   → Analizza e identifica problemi

2. Rivedi il report e seleziona issue prioritarie

3. /create-issue [titolo]
   → Crea issue dettagliata per ogni problema identificato

4. /issue [ISSUE-ID]
   → Implementa la soluzione con approccio BDD
```

---

## Output Esempio:

Quando lanci `/find-issues sistema-login`, Claude potrebbe rispondere:

```
# 📋 Issue Report: Sistema Login

## 🔥 Critical (Immediate Action)

### Issue #1: Password memorizzate in plain text nei log
**Tipo**: Security | **Priorità**: Critical | **Effort**: M

**Problema**: Nel file AuthService.ts, le password vengono loggate 
in chiaro durante il debug, esponendo credenziali sensibili.

**Impatto**:
- Utenti: Rischio furto credenziali
- Business: Violazione GDPR, rischio reputazionale

**Scenario BDD**:
Given un utente effettua login
When il sistema logga l'operazione
Then le credenziali NON devono apparire nei log

**Soluzione suggerita**: Sanitizzare tutti i log, usare masked fields

---

## ⚠️ High Priority

### Issue #2: Manca rate limiting sul login
[...]
```

Vuoi che aggiunga specifiche categorie di analisi (Security audit, Performance audit, Code quality audit, etc.)?