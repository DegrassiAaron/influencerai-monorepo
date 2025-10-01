Panoramica
- Rafforza la chiamata OpenRouter in API (ContentPlansService) con gestione errori completa, timeout 60s, retry con backoff, validazione output e test (unit + e2e). Allinea il backend agli standard introdotti nello SDK.

Punti Di Forza
- Gestione 429 con supporto a Retry-After (secondi o data) e backoff esponenziale con jitter.
- Distinzione chiara tra errori: non-OK (status/body), timeout (AbortController), network (fetch) con errori tipizzati utili al controller/telemetria.
- Validazione dell’output: garantisce array di post normalizzato { caption, hashtags[] } prima dell’uso/salvataggio.
- Verifica startup su OPENROUTER_API_KEY per fail-fast e DX migliore.
- Test completi (ok, 4xx/5xx, 429→success, timeout, JSON malformato) incl. e2e con mock di OpenRouter via fetch/undici.

Osservazioni
- Limiti retry: assicurarsi che solo 429/5xx siano ritentati; 4xx (es. 400) non dovrebbero fare retry.
- Token usage: se OpenRouter fornisce usage/costi, valutare persistenza nel Job (campi result/meta) oltre al logging.
- Validazione: oggi è “leggera”; se già presente `zod` nel progetto, potrebbe valere introdurre uno schema formale (vedi anche CODE-03).
- Telemetria: utile log strutturato (livello warn per retry, error per fail) e metriche (retry_count, rate_limited).

Suggerimenti
- Estrazione client: creare un piccolo client OpenRouter riusabile (timeout, retry, headers, parse) per futuri servizi.
- Parametrizzare: massimi retry/backoff via config/env con default sensati.
- Circuit breaker: opzionale ma utile in caso di 5xx prolungati per proteggere l’API.
- Controller mapping: rivedere mapping degli errori verso HTTP status coerenti (es. 502/503 verso client) con messaggi sicuri.

Checklist DoD
- response.ok/status handling: fatto
- timeout 60s via AbortController: fatto
- 429 con Retry-After: fatto
- validazione struttura response: fatto
- logging token usage: fatto
- retry con exponential backoff: fatto
- handling timeout/network: fatto
- check OPENROUTER_API_KEY in bootstrap: fatto
- unit test con mock fetch: fatto
- e2e test con nock: fatto
