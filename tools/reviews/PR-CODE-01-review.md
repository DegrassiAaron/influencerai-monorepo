Panoramica
- Implementazione solida: centralizza error handling (APIError, handleResponse) e timeouts (fetchWithTimeout), con refactor del client e test Vitest mirati. Coerente con CODE-01 e non invasiva.

Punti Di Forza
- Errori tipizzati con status, body, url, method utili per UI e logging.
- Timeout gestito via AbortController con distinzione chiara tra timeout (408) e network (0).
- Test unitari coprono happy-path, non-OK, network error e timeout.
- Export InfluencerAIAPIError per instanceof nei consumer.

Osservazioni
- Response non espone method: in handleResponse il campo method sarà quasi sempre undefined. Valutare passaggio esplicito di method/url dal chiamante o estendere la signature per contesto richiesta.
- Status 204/205: attualmente handleResponse restituirà stringa vuota. Per API REST può essere preferibile undefined per no-content.
- JSON malformato in success path: se content-type è JSON ma il body è malformato, response.json() rilancia un errore generico. Potrebbe essere utile incapsularlo in APIError per coerenza.
- Test client.test.ts: l’assert toBeInstanceOf(InfluencerAIAPIError as any) può essere semplificato a InfluencerAIAPIError.

Suggerimenti
- Configurabilità timeout: aggiungere un parametro opzionale nel costruttore di InfluencerAIClient (timeoutMs?: number) usato da tutti i metodi.
- Miglioria handleResponse: accettare opzionalmente { url, method } per popolare sempre i campi di APIError; gestire esplicitamente 204/205 tornando undefined.
- Utility per narrowing: esportare un type guard isAPIError(e: unknown): e is APIError per semplificare l’uso nei consumer/TanStack Query.
- Copertura test: aggiungere casi per listJobs, createContentPlan, health e per 204/205 se adottate la modifica.
- Documentazione: snippet nel README del package con esempio di handling errori e mapping messaggi UI.

Checklist DoD
- APIError class: fatto
- handleResponse helper: fatto
- Client aggiornato (create/get/list/content-plan/health): fatto
- Timeout 30s: fatto
- Unit test error handling: fatto
- Nota per app/web con TanStack Query: inclusa; da verificare a runtime
