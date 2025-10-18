# InfluencerAI - Quick Reference Guide

**Ultimo aggiornamento**: 2025-10-18

---

## 🎯 Obiettivi Rapidi

| Milestone | Quando | Cosa |
|-----------|--------|------|
| **Foundation** | Week 1 | API + ComfyUI templates pronti |
| **Core Workers** | Week 2 | Image generation funzionante |
| **MVP DEMO** 🎯 | Week 3 (D15) | Upload → Train → Generate completo |
| **Automation** | Week 4 | n8n pipeline automatico |
| **Social Media** | Week 5 | Pubblicazione multi-piattaforma |
| **PRODUCTION** 🚀 | Week 6 (D30) | Sistema live in produzione |

---

## 📋 Daily Standup Template (9:30 AM)

### Format (15 min max)

**Ogni developer risponde**:

1. ✅ **Completed yesterday**: (issue #, PR link)
2. 🔨 **Working today**: (issue #, task description)
3. 🚧 **Blockers**: (dependencies, questions)
4. ⚠️ **Risks**: (delays, technical challenges)

### Esempio

```
Dev A (Backend):
✅ Yesterday: #174 Dataset GET endpoints - PR #234 merged
🔨 Today: #175 LoRA Config API - creating Prisma model & migration
🚧 Blockers: Need DB migration review from @lead
⚠️ Risks: None

Dev B (Worker):
✅ Yesterday: #176 ComfyUI workflows - base-lora.json tested
🔨 Today: #163 Image gen processor - ComfyUI API integration
🚧 Blockers: Waiting for #176 final review
⚠️ Risks: ComfyUI timeout issues - testing solutions

Dev C (Frontend):
✅ Yesterday: #177 Dataset UI - DatasetCard component complete
🔨 Today: #177 Dataset detail page - image gallery
🚧 Blockers: Using mock data until #174 merges
⚠️ Risks: None
```

---

## 🗓️ Weekly Sprint Goals

### Week 1: Foundation ✅
**Goal**: API endpoints + ComfyUI templates
- #174 Dataset GET
- #175 LoRA Config API
- #176 ComfyUI workflows
- #177 Dataset UI (start)
- #179 Docs (draft)

**Demo**: Show API responses, ComfyUI workflow JSON

---

### Week 2: Core Workers ✅
**Goal**: Image generation working end-to-end
- #163 Image generation processor
- #177 Dataset UI (complete)
- #180 Auto-captioning
- #172 Asset API

**Demo**: Generate image with LoRA via API

---

### Week 3: MVP Demo 🎯
**Goal**: Complete manual workflow via UI
- #166 Training wizard
- #167 Image generation UI
- #168 Logs API
- #170 Calendar UI
- #178 n8n LoRA pipeline (start)

**Demo**: **Upload → Auto-caption → Train LoRA → Generate image**

---

### Week 4: Automation ✅
**Goal**: n8n orchestration + video enhancements
- #178 n8n LoRA pipeline (complete)
- #169 OAuth integration
- #171 Video enhancements
- #173 Dashboard

**Demo**: Trigger n8n workflow, auto-generates 3 images + videos

---

### Week 5: Social Media ✅
**Goal**: Multi-platform posting + monitoring
- #164 Autoposting
- #165 Complete n8n workflow
- Testing & polish

**Demo**: Full pipeline → Auto-post to Instagram + YouTube

---

### Week 6: Production 🚀
**Goal**: Launch ready system
- #129 Library upgrades
- Final testing
- Documentation
- **PRODUCTION DEPLOYMENT**

**Demo**: Public launch announcement

---

## 🔥 Critical Blockers Resolution

### Blocker: Waiting for PR merge

**Action**:
1. Tag reviewer in GitHub PR
2. Mention in Slack #influencerai-dev
3. If urgent, DM reviewer directly
4. Escalate to @lead if >4 hours

---

### Blocker: API not working

**Action**:
1. Check Docker services: `docker compose ps`
2. View logs: `docker compose logs api -f`
3. Restart if needed: `docker compose restart api`
4. Check Redis/Postgres: `docker compose logs redis postgres`
5. Ask in Slack #influencerai-dev with error message

---

### Blocker: ComfyUI not responding

**Action**:
1. Check ComfyUI running: `http://localhost:8188`
2. View ComfyUI logs: Check console output
3. Restart ComfyUI server
4. Test workflow in UI first before API
5. Check VRAM usage: `nvidia-smi`

---

### Blocker: LoRA training failing

**Action**:
1. Check dataset format: images + .txt captions
2. Verify kohya_ss config file
3. Check GPU memory: `nvidia-smi`
4. Review kohya_ss logs
5. Reduce batch size if OOM error

---

### Blocker: n8n workflow errors

**Action**:
1. Check n8n UI: `http://localhost:5678`
2. View execution logs in n8n
3. Test each node individually
4. Verify webhook URL accessible
5. Check API credentials in n8n

---

## 🧪 Quick Testing Commands

### Run all tests
```bash
pnpm test
```

### Test specific package
```bash
pnpm --filter api test
pnpm --filter worker test
pnpm --filter web test
```

### Run in watch mode
```bash
pnpm --filter api test:watch
```

### Check database
```bash
cd apps/api
pnpm dlx prisma studio
```

### Check Docker services
```bash
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f
```

### Check Redis queue
```bash
docker exec -it redis redis-cli
> KEYS bull:*
> LLEN bull:image-generation:waiting
```

### Check MinIO
```bash
# Access UI: http://localhost:9001
# Login: minio / minio12345
```

---

## 📊 Issue Status Quick View

### P0 (Critical) - 10 issues

| # | Title | Status | Owner | ETA |
|---|-------|--------|-------|-----|
| 174 | Dataset GET endpoints | 🔨 In Progress | Dev A | D1 |
| 175 | LoRA Config API | 📋 Todo | Dev A | D2-3 |
| 176 | ComfyUI workflows | 🔨 In Progress | Dev E | D2-4 |
| 163 | Image gen processor | 📋 Todo | Dev B | D6-7 |
| 179 | Documentation | 🔨 In Progress | Dev E | D5-15 |
| 166 | Training UI wizard | 📋 Todo | Dev C | D12-15 |
| 167 | Image gen UI | 📋 Todo | Dev C | D15-16 |
| 164 | Autoposting | 📋 Todo | Dev B | D23-25 |
| 165 | n8n full workflow | 📋 Todo | Dev E | D26-28 |
| 178 | n8n LoRA pipeline | 📋 Todo | Dev E | D17-20 |

### P1 (High) - 8 issues

| # | Title | Status | Owner | ETA |
|---|-------|--------|-------|-----|
| 177 | Dataset UI | 🔨 In Progress | Dev C | D3-4 |
| 180 | Auto-captioning | 📋 Todo | Dev B | D7-8 |
| 168 | Logs API | 📋 Todo | Dev A | D13-14 |
| 172 | Asset API | 📋 Todo | Dev A | D9-10 |
| 171 | Video enhancements | 📋 Todo | Dev B | D17-19 |
| 169 | OAuth integration | 📋 Todo | Dev A | D16-19 |
| 170 | Calendar UI | 📋 Todo | Dev D | D14-15 |
| 173 | Dashboard | 📋 Todo | Dev C | D19-20 |

### P2 (Normal) - 1 issue

| # | Title | Status | Owner | ETA |
|---|-------|--------|-------|-----|
| 129 | Library upgrades | 📋 Todo | Dev E | D26-27 |

**Legend**: 📋 Todo | 🔨 In Progress | 👀 In Review | ✅ Done | 🚫 Blocked

---

## 👤 Developer Workload

### Dev A (Backend Lead)
**Current Sprint**: Week 1
- **Active**: #174 (D1)
- **Next**: #175 (D2-3)
- **Later**: #172 (D9-10), #168 (D13-14), #169 (D16-19)

### Dev B (Worker Specialist)
**Current Sprint**: Week 1-2
- **Active**: Testing #176 workflows
- **Next**: #163 (D6-7)
- **Later**: #180 (D7-8), #171 (D17-19), #164 (D23-25)

### Dev C (Frontend Lead)
**Current Sprint**: Week 1-2
- **Active**: #177 (D3-4)
- **Next**: #166 (D12-15)
- **Later**: #167 (D15-16), #173 (D19-20)

### Dev D (Frontend Dev)
**Current Sprint**: Week 1-3
- **Active**: Supporting #177
- **Next**: #170 (D14-15)
- **Later**: Testing, polish

### Dev E (DevOps/Integration)
**Current Sprint**: Week 1-2
- **Active**: #176 (D2-4), #179 (D5-15)
- **Next**: #178 (D17-20)
- **Later**: #165 (D26-28), deployment

---

## 🚨 Escalation Matrix

| Issue | First Contact | Escalate After | Final Escalation |
|-------|---------------|----------------|------------------|
| **Code blocker** | Teammate in Slack | 2 hours | @tech-lead |
| **PR review delayed** | Tag reviewer | 4 hours | @tech-lead |
| **Infrastructure down** | @devops in Slack | 30 min | @infra-team |
| **API integration issue** | @backend-lead | 1 hour | @tech-lead |
| **Dependency blocked** | Issue owner | 1 day | @product-manager |
| **Scope creep** | @tech-lead | Immediately | @product-manager |

---

## 📞 Contacts

| Role | Name | Slack | GitHub | Email |
|------|------|-------|--------|-------|
| **Tech Lead** | TBD | @lead | @lead | lead@... |
| **Backend Lead** | Dev A | @dev-a | @dev-a | a@... |
| **Worker Specialist** | Dev B | @dev-b | @dev-b | b@... |
| **Frontend Lead** | Dev C | @dev-c | @dev-c | c@... |
| **Frontend Dev** | Dev D | @dev-d | @dev-d | d@... |
| **DevOps** | Dev E | @dev-e | @dev-e | e@... |

---

## 🔗 Quick Links

### Documentation
- [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) - Strategia completa 6 settimane
- [SPRINT_CALENDAR.md](./SPRINT_CALENDAR.md) - Calendario giorno-per-giorno
- [DEMO.md](./DEMO.md) - Guida demo rapido
- [SETUP.md](./SETUP.md) - Setup dettagliato ambiente
- [CLAUDE.md](./CLAUDE.md) - Istruzioni progetto

### Tools
- **GitHub Issues**: https://github.com/your-org/influencerai/issues
- **GitHub Projects**: https://github.com/your-org/influencerai/projects
- **Slack Workspace**: https://influencerai.slack.com
- **n8n**: http://localhost:5678
- **ComfyUI**: http://localhost:8188
- **MinIO Console**: http://localhost:9001
- **Prisma Studio**: `cd apps/api && pnpm dlx prisma studio`

### CI/CD
- **GitHub Actions**: https://github.com/your-org/influencerai/actions
- **Deployment Status**: TBD

---

## 🎯 Today's Focus (Update Daily)

**Current Day**: D1 (Week 1, Monday)
**Sprint**: Foundation
**Team Focus**: API endpoints + ComfyUI setup

### Today's Goals
- [ ] #174 Dataset GET endpoints - Dev A (Backend)
- [ ] #177 Dataset UI mockups - Dev C (Frontend)
- [ ] #176 ComfyUI workflow design - Dev E (DevOps)
- [ ] Setup Docker environment - All devs

### Today's Standup (9:30 AM)
- Review yesterday's progress
- Identify blockers
- Sync dependencies

### Today's Code Freeze: 5:00 PM
- Merge completed PRs
- Update issue status
- Prepare tomorrow's tasks

---

## 💡 Pro Tips

### For Backend Devs
- Use Prisma Studio for quick DB inspection
- Test endpoints with Thunder Client/Postman
- Write tests before implementation (TDD)
- Use Zod for runtime validation
- Keep transactions short

### For Frontend Devs
- Use TanStack Query DevTools
- Test with React DevTools
- Follow shadcn/ui patterns
- Use TypeScript strict mode
- Test loading/error states

### For Worker Devs
- Monitor BullMQ Dashboard
- Test with small payloads first
- Use Redis CLI for queue inspection
- Implement idempotent operations
- Add comprehensive error handling

### For DevOps
- Pin Docker image versions
- Use health checks
- Monitor resource usage
- Keep secrets in .env
- Document all infrastructure changes

---

## 📈 Success Metrics

### Daily
- [ ] At least 1 PR merged
- [ ] Zero blocking issues >4 hours
- [ ] All tests passing
- [ ] Standup completed in 15 min

### Weekly
- [ ] 3-4 issues closed
- [ ] Sprint goal achieved
- [ ] Demo successful
- [ ] Documentation updated

### Milestone
- [ ] Week 3: MVP demo passes
- [ ] Week 6: Production launch
- [ ] Zero P0 bugs in production
- [ ] 95%+ uptime

---

**Aggiornato**: Ogni giorno alle 17:00
**Owner**: Tech Lead
**Revisione**: Ogni Venerdì in retrospective
