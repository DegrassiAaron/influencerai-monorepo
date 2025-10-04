# Coding & Collaboration Conventions

## Branching
- Vedi `.docs/agents/BRANCHING.md`

## Commit messages
- Conventional Commits; imperativo
- Collega sempre l’issue (#123)

## Pull Request
- Template PR standard
- DoD auto + manual (maintainer)
- PR in Draft finché CI verde + review

## DoD
- Auto: lint, unit, e2e, docs, migrazioni
- Manuale: approvazione maintainer
- Sync PR ↔ Issue

## Release & Hotfix
- release/<version> da develop
- hotfix/<ticket|version> da main
- Back‑merge main → develop
