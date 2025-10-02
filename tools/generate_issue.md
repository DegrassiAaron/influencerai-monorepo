### Contesto

È stata definita un'interfaccia utente su Lovable.dev (mockup/prototipo). Occorre
implementarla nell'app web allineando layout, componenti e routing, mantenendo
coerenza con il design system (shadcn/ui) e le API esistenti.


### Riferimenti

- Link al progetto Lovable.dev: (inserire URL)


### DoD

- [ ] Shell applicativa (layout, sidebar, header) aderente al design Lovable.dev

- [ ] Pagine e route principali create (nomi/percorsi coerenti con mockup)

- [ ] Componenti UI mappati su shadcn/ui o componenti condivisi interni

- [ ] Stati di caricamento/errore e vuoto previsti e testati

- [ ] Integrazione dati tramite TanStack Query e client SDK

- [ ] Responsività e accessibilità base (focus, aria-label, contrasto)

- [ ] Documentazione rapida di mapping screen -> route -> componenti


### Dipendenze

- [WEB-06] Shell applicativa e design system shadcn/ui

- [API-03] Esporre CRUD dei job e integrazione con BullMQ

- [API-04] Endpoint Content Plan con integrazione OpenRouter

- [API-05] Dataset ingestion e storage su MinIO
