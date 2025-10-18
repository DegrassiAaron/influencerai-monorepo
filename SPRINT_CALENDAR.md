# InfluencerAI - Sprint Calendar (6 Settimane)

**Periodo**: 30 giorni lavorativi
**Team**: 5 sviluppatori (2 backend, 2 frontend, 1 devops)
**Obiettivo**: Sistema completo funzionante con demo end-to-end

---

## 📅 Calendario Dettagliato Giorno per Giorno

### 🔵 SETTIMANA 1 - Foundation & API Layer (5 giorni)
**Obiettivo**: Costruire fondamenta API e template ComfyUI

| Giorno | Data | Team Backend | Team Frontend | Team DevOps | Deliverable |
|--------|------|--------------|---------------|-------------|-------------|
| **Lun D1** | - | **#174** Dataset GET endpoints<br>└ GET /datasets<br>└ GET /datasets/:id<br>└ Zod schemas | Setup ambiente<br>Review design system | Setup infra Docker<br>Verify ComfyUI | API dataset pronto |
| **Mar D2** | - | **#175** LoRA Config API (1/2)<br>└ Prisma model<br>└ Migration<br>└ POST /lora-configs | Studio #177 mockups<br>Componenti base | **#176** ComfyUI (1/2)<br>base-lora.json design | DB schema aggiornato |
| **Mer D3** | - | **#175** LoRA Config API (2/2)<br>└ GET, PATCH, DELETE<br>└ Seed defaults<br>└ Tests | Inizio **#177** (1/2)<br>/datasets list page<br>DatasetCard component | **#176** ComfyUI (2/2)<br>sdxl-lora.json<br>workflowBuilder.ts | LoRA Config API completo |
| **Gio D4** | - | Review + merge PRs<br>Supporto #163 planning | **#177** (2/2)<br>/datasets/[id] page<br>Gallery + captions | **#179** Docs (1/3)<br>DEMO.md draft<br>Screenshots | ComfyUI workflows pronti |
| **Ven D5** | - | Inizio **#163** (1/2)<br>imageGeneration.ts<br>ComfyUI API integration | Finish #177<br>Test con mock data | **#179** Docs (2/3)<br>SETUP.md<br>Architecture diagrams | ✅ Milestone 1: API ready |

**Sprint Review Venerdì**: Demo API endpoints, ComfyUI templates, Dataset UI

---

### 🟢 SETTIMANA 2 - Core Workers & UI Foundation (5 giorni)
**Obiettivo**: Processore image generation funzionante + UI datasets

| Giorno | Data | Team Backend | Team Frontend | Team DevOps | Deliverable |
|--------|------|--------------|---------------|-------------|-------------|
| **Lun D6** | - | **#163** Image Gen (2/2)<br>└ LoRA loading<br>└ MinIO upload<br>└ Asset creation | Polish **#177**<br>Responsive fixes<br>Loading states | Test ComfyUI workflows<br>Verify LoRA loading | Image gen processor completo |
| **Mar D7** | - | **#180** Auto-caption (1/2)<br>└ Python BLIP-2 script<br>└ Processor setup | Inizio **#166** (1/5)<br>Wizard routing<br>Step 1: Dataset select | **#179** Docs (3/3)<br>TROUBLESHOOTING.md<br>Test setup guide | BLIP-2 integration |
| **Mer D8** | - | **#180** Auto-caption (2/2)<br>└ Batch processing<br>└ Progress updates<br>└ Tests | **#166** (2/5)<br>Step 2: Config select<br>Using #175 API | Supporto testing<br>Log debugging | Auto-caption completo |
| **Gio D9** | - | Inizio **#172** Asset API (1/2)<br>└ GET /assets<br>└ Filters, pagination | **#166** (3/5)<br>Step 3: Training params<br>Form validation | Review docs<br>Create video tutorial | Asset API foundation |
| **Ven D10** | - | **#172** Asset API (2/2)<br>└ Collections<br>└ Soft delete | **#166** (4/5)<br>Step 4: Review & submit<br>Job creation API call | Final doc review<br>Publish DEMO.md | ✅ Milestone 2: Image gen working |

**Sprint Review Venerdì**: Demo image generation con LoRA, auto-captioning, dataset management

---

### 🟡 SETTIMANA 3 - Training UI & Automation Prep (5 giorni)
**Obiettivo**: Completare UI training wizard e preparare automazione n8n

| Giorno | Data | Team Backend | Team Frontend | Team DevOps | Deliverable |
|--------|------|--------------|---------------|-------------|-------------|
| **Lun D11** | - | Supporto frontend<br>Bug fixes API | **#166** (5/5)<br>/lora/[id] progress page<br>Real-time polling | Studio **#178** n8n<br>Workflow design | Training wizard completo |
| **Mar D12** | - | Fix issues da testing<br>Performance tuning | **#167** Image Gen UI (1/2)<br>/lora/[id]/generate<br>Prompt builder | **#178** (1/5)<br>Webhook trigger setup<br>LoRA training step | Image gen UI started |
| **Mer D13** | - | Monitoring #168 (1/2)<br>WebSocket endpoint<br>Redis Pub/Sub | **#167** Image Gen UI (2/2)<br>Gallery view<br>Download buttons | **#178** (2/5)<br>Polling logic<br>Error handling | Logs API foundation |
| **Gio D14** | - | **#168** Logs API (2/2)<br>Streaming implementation<br>Tests | Test **#167**<br>Integration con #163<br>Bug fixes | **#178** (3/5)<br>Image gen loop<br>Test prompts | Real-time logs working |
| **Ven D15** | - | Final testing<br>Performance review | **#170** Calendar UI (1/2)<br>Calendar view component<br>Date picker | **#178** (4/5)<br>Video generation step<br>Asset collection | 🎯 **MVP DEMO READY** |

**Sprint Review Venerdì**: **DEMO COMPLETO MANUALE** - Upload → Caption → Train → Generate

---

### 🟠 SETTIMANA 4 - n8n Automation & Video (5 giorni)
**Obiettivo**: Automazione completa con n8n e miglioramenti video

| Giorno | Data | Team Backend | Team Frontend | Team DevOps | Deliverable |
|--------|------|--------------|---------------|-------------|-------------|
| **Lun D16** | - | **#169** OAuth (1/4)<br>Instagram OAuth flow<br>Token storage | **#170** Calendar UI (2/2)<br>Drag-drop scheduling<br>Event creation | **#178** (5/5)<br>Results aggregation<br>Notification webhook<br>End-to-end test | n8n LoRA pipeline completo |
| **Mar D17** | - | **#169** OAuth (2/4)<br>Facebook OAuth<br>Graph API integration | Testing e polish UI<br>Accessibility fixes | **#171** Video (1/3)<br>TTS integration<br>Whisper setup | OAuth foundation |
| **Mer D18** | - | **#169** OAuth (3/4)<br>YouTube OAuth<br>API v3 integration | Supporto testing<br>UI bug fixes | **#171** Video (2/3)<br>Subtitle generation<br>Aspect ratios (9:16, 1:1) | Multi-platform OAuth |
| **Gio D19** | - | **#169** OAuth (4/4)<br>TikTok integration<br>UI account linking | Inizio **#173** (1/2)<br>Dashboard layout<br>Job queue cards | **#171** Video (3/3)<br>Loudness normalization<br>FFmpeg pipeline | OAuth completo |
| **Ven D20** | - | **#164** Autopost (1/5)<br>Instagram posting<br>Graph API | **#173** Dashboard (2/2)<br>Real-time updates<br>System health metrics | Test video enhancements<br>Integration testing | ✅ Milestone 4: Automation ready |

**Sprint Review Venerdì**: Demo automazione n8n end-to-end

---

### 🔴 SETTIMANA 5 - Social Media & Monitoring (5 giorni)
**Obiettivo**: Completare autoposting e monitoring dashboard

| Giorno | Data | Team Backend | Team Frontend | Team DevOps | Deliverable |
|--------|------|--------------|---------------|-------------|-------------|
| **Lun D21** | - | **#164** Autopost (2/5)<br>Facebook page posting<br>Error handling | Testing **#173**<br>Performance optimization | **#165** n8n Full (1/5)<br>Content plan generation<br>OpenRouter integration | Facebook posting |
| **Mar D22** | - | **#164** Autopost (3/5)<br>YouTube Shorts upload<br>API v3 integration | Bug fixes dashboard<br>Mobile responsive | **#165** n8n Full (2/5)<br>Caption generation<br>Prompt templates | YouTube posting |
| **Mer D23** | - | **#164** Autopost (4/5)<br>TikTok posting (if API)<br>Retry logic | UI polish generale<br>Design consistency | **#165** n8n Full (3/5)<br>Image → video chain<br>Platform formatting | Multi-platform posting |
| **Gio D24** | - | **#164** Autopost (5/5)<br>Cross-platform testing<br>Analytics tracking | Final UI reviews<br>Prepare demo scenarios | **#165** n8n Full (4/5)<br>Error recovery<br>Notifications | Autoposting completo |
| **Ven D25** | - | Code review<br>Documentation update | Load testing UI<br>Performance profiling | **#165** n8n Full (5/5)<br>End-to-end testing<br>Workflow docs | ✅ Milestone 5: Social media ready |

**Sprint Review Venerdì**: Demo pubblicazione automatica su social

---

### 🟣 SETTIMANA 6 - Final Integration & Launch (5 giorni)
**Obiettivo**: Testing finale, polish, documentazione, launch

| Giorno | Data | Team Backend | Team Frontend | Team DevOps | Deliverable |
|--------|------|--------------|---------------|-------------|-------------|
| **Lun D26** | - | **#129** Lib upgrades (1/2)<br>Pino 10, p-queue 9<br>Migration testing | End-to-end testing<br>Bug reporting | Production deployment<br>CI/CD setup | Library upgrades |
| **Mar D27** | - | **#129** (2/2)<br>undici 7<br>Final tests | UI testing completo<br>Edge cases | Monitoring setup<br>Alerting config | All libs updated |
| **Mer D28** | - | Bug fixes P0<br>Performance tuning | Bug fixes UI<br>Polish animations | Load testing<br>Stress testing | Bug-free system |
| **Gio D29** | - | Final code review<br>Security audit | Final accessibility<br>SEO optimization | Documentation final<br>Video tutorial complete | Production-ready |
| **Ven D30** | - | Deployment support<br>Monitoring | Launch day support<br>User onboarding | **PRODUCTION LAUNCH**<br>Post-launch monitoring | 🎉 **LAUNCH!** |

**Sprint Review Venerdì**: **CELEBRATION** - Sistema completo in produzione!

---

## 📊 Riassunto Milestone

| Week | Milestone | Issue Chiuse | Demo Capability |
|------|-----------|--------------|-----------------|
| **1** | API Foundation | #174, #175, #176 | Endpoints funzionanti |
| **2** | Core Workers | #163, #177, #180, #172 | Image generation + auto-caption |
| **3** | **MVP DEMO** | #166, #167, #168, #170 | 🎯 Training + generation manuale completo |
| **4** | Automation | #178, #171, #169 | n8n pipeline automatico |
| **5** | Social Media | #164, #165, #173 | Pubblicazione multi-piattaforma |
| **6** | **PRODUCTION** | #129 | 🚀 Sistema completo live |

---

## 🎯 Checklist Settimanale

### Week 1 ✅
- [ ] #174 Dataset GET endpoints merged
- [ ] #175 LoRA Config API merged
- [ ] #176 ComfyUI workflows testati
- [ ] #177 Dataset UI funzionante
- [ ] #179 DEMO.md draft completo

### Week 2 ✅
- [ ] #163 Image generation processor funzionante
- [ ] #180 Auto-captioning testato
- [ ] #172 Asset API completo
- [ ] #166 Training wizard (50% completo)

### Week 3 🎯 MVP
- [ ] #166 Training wizard (100% completo)
- [ ] #167 Image generation UI completo
- [ ] #168 Logs API streaming funzionante
- [ ] **MVP demo eseguito con successo**
- [ ] Stakeholder feedback raccolto

### Week 4 ✅
- [ ] #178 n8n LoRA pipeline end-to-end
- [ ] #169 OAuth multi-platform setup
- [ ] #171 Video enhancements (TTS, subtitles)
- [ ] #173 Dashboard real-time

### Week 5 ✅
- [ ] #164 Autoposting su 3+ piattaforme
- [ ] #165 n8n workflow completo (plan → post)
- [ ] Test stress con job concorrenti
- [ ] Performance tuning completato

### Week 6 🚀 LAUNCH
- [ ] #129 Library upgrades completati
- [ ] Tutte le 19 issue chiuse
- [ ] Testing end-to-end superato
- [ ] Documentazione completa pubblicata
- [ ] Video tutorial registrato
- [ ] Sistema deployato in produzione
- [ ] Monitoring attivo
- [ ] **LAUNCH PUBBLICO** 🎉

---

## 👥 Assegnazione Issue per Developer

### Backend Lead (Dev A)
| Week | Issues | Focus |
|------|--------|-------|
| 1-2 | #174, #175, #172 | API foundation, LoRA configs, Assets |
| 3-4 | #168, #169 | Logs streaming, OAuth |
| 5-6 | #164 (support), #129 | Autoposting review, upgrades |

### Worker Specialist (Dev B)
| Week | Issues | Focus |
|------|--------|-------|
| 1-2 | #163, #176, #180 | Image gen, ComfyUI, Auto-caption |
| 3-4 | #171 | Video enhancements (TTS, subtitles) |
| 5-6 | #164 | Autoposting implementation |

### Frontend Lead (Dev C)
| Week | Issues | Focus |
|------|--------|-------|
| 1-2 | #177 | Dataset management UI |
| 3-4 | #166, #167 | Training wizard, Image gen UI |
| 5-6 | #173 | Monitoring dashboard |

### Frontend Dev (Dev D)
| Week | Issues | Focus |
|------|--------|-------|
| 1-2 | Support #177 | Components, design system |
| 3-4 | #170 | Calendar UI |
| 5-6 | Testing, polish | Bug fixes, accessibility |

### DevOps/Integration (Dev E)
| Week | Issues | Focus |
|------|--------|-------|
| 1-2 | #176, #179 | ComfyUI workflows, Documentation |
| 3-4 | #178, #171 (support) | n8n LoRA pipeline |
| 5-6 | #165, deployment | Full n8n workflow, production |

---

## 🔥 Critical Path (Non Spostabile)

Questi task **devono** essere completati in ordine sequenziale:

```
Day 1-3: #174 + #175 (API foundation)
         ↓
Day 4-7: #176 + #163 (ComfyUI + Image gen)
         ↓
Day 11-15: #166 + #167 (Training UI + Image UI)
         ↓
Day 16-20: #178 (n8n automation)
         ↓
Day 21-25: #165 (Full orchestration)
         ↓
Day 30: LAUNCH
```

**Qualsiasi ritardo su questi task ritarda l'intero progetto!**

---

## ⚠️ Risk Management

### High-Risk Giorni

| Day | Risk | Mitigation | Buffer |
|-----|------|------------|--------|
| **D4** | ComfyUI workflow non funziona | Test early, fallback to manual | +1 day |
| **D7** | Image gen integration issues | Pre-test API, mock responses | +1 day |
| **D15** | MVP demo fallisce | Daily testing, pre-demo rehearsal | +2 days |
| **D20** | n8n timeout/errors | Extensive error handling | +2 days |
| **D25** | Social API rejections | Mock APIs, skip TikTok if needed | +1 day |

**Total buffer**: 7 giorni extra disponibili se necessario

---

## 📈 Tracking Metrics

### Metriche Giornaliere (Track in standup)
- Issue chiuse oggi: X
- PR merged oggi: X
- Bug aperti oggi: X
- Test coverage: X%

### Metriche Settimanali (Track in retrospective)
- Velocity (issue/settimana): Target 3-4
- Lead time (giorni da inizio a chiusura): Target <5
- Bug escape rate: Target <10%
- Code review turnaround: Target <4 ore

### Metriche Milestone
- **Week 3**: MVP demo success rate: Target 100%
- **Week 6**: Production uptime: Target >95%
- **Week 6**: Documentation completeness: Target 100%

---

## 🎉 Celebrazioni

### Week 3 (MVP)
- [ ] Team lunch/dinner
- [ ] Demo recording per marketing
- [ ] Social media announcement (optional)

### Week 6 (Launch)
- [ ] Launch party 🎊
- [ ] Public announcement
- [ ] Blog post pubblicato
- [ ] Video tutorial live su YouTube

---

## 📞 Support Contacts

**Blockers?** Contatta:
- **Technical Lead**: [Nome] - Slack @lead
- **Product Manager**: [Nome] - Slack @pm
- **DevOps**: [Nome] - Slack @devops

**Escalation Path**:
1. Discuss in daily standup
2. Post in #influencerai-blockers
3. Tag @lead for immediate help
4. Schedule 1:1 if still blocked

---

**Ultimo aggiornamento**: 2025-10-18
**Prossima revisione**: Fine Week 1 (aggiusta velocity se necessario)
**Versione**: 1.0
