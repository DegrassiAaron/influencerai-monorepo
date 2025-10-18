<command>
  <name>close-issue</name>
  <usage>/close-issue #idIssue|nomeIssue</usage>
  
  <description>
  Automatizza il processo di completamento e chiusura di un'issue attraverso code review, creazione PR, validazione CI/CD e merge.
  </description>
  
  <instructions>
  Quando ricevi il comando `/close-issue` seguito da un identificativo issue (#idIssue o nomeIssue), esegui la seguente workflow:

  ## 0. Verifica Branch e PR
  - Recupera i dettagli dell'issue: `gh issue view {issue-id}`
  - Verifica se esiste già una PR collegata all'issue
  - SE la PR non esiste:
    * Verifica il branch corrente: `git branch --show-current`
    * SE non sei sul branch dell'issue, passa al branch corretto
    * Crea la PR seguendo le convenzioni del progetto (vedi comando `/issue` Phase 5)
  - SE la PR esiste:
    * Verifica lo stato della PR: `gh pr view {pr-number}`
    * Procedi con la code review

  ## 1. Code Review
  - Analizza tutto il codice correlato all'issue specificata
  - Verifica la qualità del codice, best practices e potenziali problemi
  - Genera un report di code review dettagliato includendo:
    * Modifiche implementate
    * Punti di attenzione o criticità
    * Suggerimenti per miglioramenti (se necessari)
    * Valutazione complessiva (APPROVED/CHANGES_REQUESTED)

  ## 2. Creazione Pull Request
  - Crea una PR con:
    * Titolo descrittivo che referenzia l'issue
    * Descrizione completa delle modifiche
    * Link all'issue originale
    * Checklist dei requisiti completati
    * Il report di code review nel commento iniziale

  ## 3. Monitoraggio CI/CD
  - Attendi il completamento dei test CI/CD
  - Verifica lo stato di tutti i check automatici
  - SE tutti i test passano:
    * Procedi al punto 4
  - SE i test falliscono:
    * Riporta gli errori
    * Suggerisci correzioni
    * INTERROMPI il processo (non procedere oltre)

  ## 4. Aggiornamento Issue e Definition of Done
  - Aggiorna lo stato dell'issue
  - Verifica tutti i criteri della Definition of Done (DoD)
  - Marca come completati i task della DoD
  - SE tutti i criteri DoD sono soddisfatti:
    * Chiudi l'issue con un commento riepilogativo
    * Procedi al punto 5
  - SE la DoD non è completa:
    * Indica quali criteri mancano
    * INTERROMPI il processo (mantieni issue aperta)

  ## 5. Merge della Pull Request
  - SOLO SE l'issue è stata chiusa E tutti i test CI/CD passano:
    * Effettua il merge della PR
    * Conferma l'operazione completata
    * Fornisci un riepilogo finale dell'intera workflow

  ## Output Finale
  Fornisci sempre un report strutturato che include:
  - ✅ Step completati con successo
  - ⚠️ Eventuali warning o punti di attenzione
  - ❌ Errori o blocchi riscontrati
  - 📊 Status finale dell'issue e della PR
  </instructions>

  <error_handling>
  - Se l'issue non esiste, notifica l'errore e chiedi conferma dell'identificativo
  - Se mancano permessi per operazioni (creazione PR, merge, etc.), notifica e suggerisci azioni alternative
  - Se il processo si blocca in qualsiasi step, fornisci diagnostica dettagliata
  - Non procedere mai al merge se ci sono condizioni non soddisfatte
  </error_handling>

  <examples>
  Input: /close-issue #1234
  Input: /close-issue fix-login-bug
  </examples>
</command>