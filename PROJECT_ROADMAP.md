# InfluencerAI - Project Roadmap & Implementation Calendar

**Status**: 19 open issues
**Timeline**: 6 weeks (30 working days)
**Target**: Complete working demo with full automation

---

## Executive Summary

This roadmap organizes all 19 open GitHub issues into a structured 6-week implementation plan. The plan is optimized for dependencies, prioritizes P0 issues for a minimal viable demo, and enables parallel workstreams where possible.

**Completion Targets**:
- **Week 3**: Minimal viable demo (LoRA training + image generation)
- **Week 4**: Extended demo (n8n automation + monitoring)
- **Week 6**: Production-ready system (all features + docs)

---

## Issue Inventory

### Priority P0 - Critical (10 issues)
| # | Title | Area | Effort | Blocks |
|---|-------|------|--------|--------|
| 174 | Dataset GET endpoints | api | S (4h) | 177 |
| 175 | LoRA Config API | api | M (2d) | 166 |
| 176 | ComfyUI workflow templates | worker | S (4h) | 163 |
| 163 | Image generation processor | worker | M (2d) | 167, 178 |
| 179 | Demo documentation | docs | M (2d) | - |
| 166 | LoRA training UI wizard | web | L (5d) | - |
| 167 | Image generation UI | web | M (2d) | - |
| 164 | Autoposting processor | worker | L (5d) | 165 |
| 165 | Complete n8n workflow orchestration | n8n | L (5d) | - |
| 178 | End-to-end n8n LoRA pipeline | n8n | L (5d) | - |

### Priority P1 - High (8 issues)
| # | Title | Area | Effort | Blocks |
|---|-------|------|--------|--------|
| 177 | Dataset Management UI | web | M (2d) | - |
| 180 | Auto-captioning processor | worker | M (2d) | - |
| 168 | Job logs streaming API | api | M (2d) | 173 |
| 172 | Asset management API | api | M (2d) | - |
| 171 | Video generation enhancements | worker | L (3d) | - |
| 169 | Social OAuth integration | api+web | L (4d) | 164 |
| 170 | Content Plan calendar UI | web | M (2d) | - |
| 173 | Real-time monitoring dashboard | web | M (2d) | - |

### Priority P2 - Normal (1 issue)
| # | Title | Area | Effort |
|---|-------|------|--------|
| 129 | Upgrade logging & queue libs | api+worker | S (1d) |

**Total Effort**: ~50 working days (parallel execution reduces to 30 days)

---

## Dependency Analysis

### Critical Path (Longest chain)
```
175 (LoRA Config API) → 166 (Training UI) → [Manual Training] → 163 (Image Gen) → 167 (Image UI) → 178 (n8n)
= 2d + 5d + 0d + 2d + 2d + 5d = 16 days
```

### Dependency Graph
```
┌─────────────────────────────────────────────────────────────────┐
│                      FOUNDATION (Week 1)                        │
├─────────────────────────────────────────────────────────────────┤
│ #174 (Dataset GET) ──────────────────────┐                      │
│                                           ▼                      │
│ #175 (LoRA Config API) ──────┐      #177 (Dataset UI)          │
│                               ▼                                  │
│ #176 (ComfyUI Workflows) ─► #163 (Image Gen Processor)         │
│                               │                                  │
│ #179 (Documentation) ◄────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CORE FEATURES (Week 2-3)                   │
├─────────────────────────────────────────────────────────────────┤
│ #163 ──────────────┐                                            │
│                    ▼                                             │
│ #175 ─────► #166 (Training UI Wizard) ──┐                      │
│                                           ▼                      │
│ #163 ─────► #167 (Image Generation UI) ──┤                     │
│                                           ▼                      │
│ #180 (Auto-captioning)               [DEMO READY]              │
│                                           │                      │
│ #172 (Asset API)                          │                     │
└───────────────────────────────────────────┼─────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AUTOMATION (Week 4)                           │
├─────────────────────────────────────────────────────────────────┤
│ #163 + #166 + #167 ──► #178 (n8n LoRA Pipeline)               │
│                                                                  │
│ #169 (OAuth) ──────► #164 (Autoposting) ──► #165 (n8n Full)   │
│                                                                  │
│ #171 (Video Enhancements)                                       │
└─────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MONITORING & POLISH (Week 5-6)                │
├─────────────────────────────────────────────────────────────────┤
│ #168 (Logs API) ──────► #173 (Monitoring Dashboard)           │
│                                                                  │
│ #170 (Calendar UI)                                              │
│                                                                  │
│ #129 (Lib Upgrades)                                             │
│                                                                  │
│ #179 (Docs Finalization)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6-Week Implementation Calendar

### Week 1 (Days 1-5): Foundation & API Layer
**Goal**: Build API foundation and ComfyUI integration templates

| Day | Issues | Owner | Deliverables |
|-----|--------|-------|--------------|
| **Mon (D1)** | #174 Dataset GET | Backend | - GET /datasets endpoint<br>- GET /datasets/:id endpoint<br>- Zod validation schemas<br>- Tests |
| **Tue (D2)** | #175 LoRA Config (Day 1) | Backend | - LoraConfig Prisma model<br>- Migration<br>- POST /lora-configs endpoint |
| **Wed (D3)** | #175 LoRA Config (Day 2) | Backend | - GET, PATCH, DELETE endpoints<br>- Seed default configs<br>- Tests |
| **Thu (D4)** | #176 ComfyUI Workflows | DevOps | - base-lora.json template<br>- sdxl-lora.json template<br>- workflowBuilder.ts helper<br>- Testing in ComfyUI |
| **Fri (D5)** | #179 Documentation (Day 1) | Tech Writer | - DEMO.md first draft<br>- SETUP.md outline<br>- Gather screenshots |

**Milestone 1**: ✅ API foundation ready for UI integration

---

### Week 2 (Days 6-10): Core Workers & UI Foundation
**Goal**: Implement image generation processor and start UI development

| Day | Issues | Owner | Deliverables |
|-----|--------|-------|--------------|
| **Mon (D6)** | #163 Image Gen (Day 1) | Worker Dev | - imageGeneration.ts processor<br>- ComfyUI API integration<br>- Workflow template injection |
| **Tue (D7)** | #163 Image Gen (Day 2) | Worker Dev | - LoRA loading support<br>- Image download from ComfyUI<br>- MinIO upload + Asset creation<br>- Error handling & tests |
| **Wed (D8)** | #177 Dataset UI (Day 1) | Frontend | - /datasets list page<br>- DatasetCard component<br>- TanStack Query hooks |
| **Thu (D9)** | #177 Dataset UI (Day 2) | Frontend | - /datasets/[id] detail page<br>- Image gallery with captions<br>- "Use for Training" button |
| **Fri (D10)** | #180 Auto-caption (Day 1) | Worker Dev | - Python BLIP-2 script<br>- captionGeneration.ts processor<br>- POST /datasets/:id/caption endpoint |

**Parallel Track (D6-D10)**:
- **#179 Documentation (Day 2)**: Complete TROUBLESHOOTING.md, architecture diagrams

**Milestone 2**: ✅ Image generation working, dataset UI ready

---

### Week 3 (Days 11-15): Training UI & Auto-Captioning
**Goal**: Complete LoRA training UI wizard and image generation UI

| Day | Issues | Owner | Deliverables |
|-----|--------|-------|--------------|
| **Mon (D11)** | #180 Auto-caption (Day 2) | Worker Dev | - Caption batch processing<br>- Progress updates<br>- UI integration<br>- Tests |
| **Tue (D12)** | #166 Training UI (Day 1) | Frontend | - /lora/new wizard routing<br>- Step 1: Dataset selection<br>- Step 2: Config selection (using #175) |
| **Wed (D13)** | #166 Training UI (Day 2) | Frontend | - Step 3: Training params form<br>- Step 4: Review & submit<br>- Job creation |
| **Thu (D14)** | #166 Training UI (Day 3) | Frontend | - /lora/[id] progress page<br>- Real-time status polling<br>- Epoch charts |
| **Fri (D15)** | #166 Training UI (Day 4-5)<br>#167 Image UI (Day 1) | Frontend | - Training UI: Completion screen, download LoRA<br>- Image UI: /lora/[id]/generate page, prompt builder |

**Parallel Track (D11-D15)**:
- **#172 Asset API (Day 1-2)**: GET /assets, filters, pagination, collections
- **#179 Documentation (Finalize)**: Test setup guide, add video walkthrough

**Milestone 3**: 🎯 **MINIMAL VIABLE DEMO COMPLETE**
- ✅ Users can upload dataset, auto-caption, train LoRA, generate images
- ✅ End-to-end manual workflow functional

---

### Week 4 (Days 16-20): n8n Automation & Video
**Goal**: Automate workflows with n8n and enhance video generation

| Day | Issues | Owner | Deliverables |
|-----|--------|-------|--------------|
| **Mon (D16)** | #167 Image UI (Day 2) | Frontend | - Gallery view for results<br>- Image metadata display<br>- Download & share buttons |
| **Tue (D17)** | #178 n8n LoRA Pipeline (Day 1) | Integration | - Workflow design: trigger → train → test prompts<br>- LoRA training step with polling |
| **Wed (D18)** | #178 n8n LoRA Pipeline (Day 2) | Integration | - Image generation loop<br>- Video generation step |
| **Thu (D19)** | #178 n8n LoRA Pipeline (Day 3) | Integration | - Results aggregation<br>- Notification webhook<br>- Error handling |
| **Fri (D20)** | #178 n8n LoRA Pipeline (Day 4-5)<br>#171 Video (Day 1) | Integration<br>Worker | - n8n: End-to-end testing<br>- Video: TTS integration planning |

**Parallel Track (D16-D20)**:
- **#169 OAuth (Day 1-2)**: Instagram/Facebook OAuth flow, token storage
- **#172 Asset API (Complete)**: DELETE /assets, soft delete, restore

**Milestone 4**: ✅ Full automation via n8n, video enhancements started

---

### Week 5 (Days 21-25): Social Media & Monitoring
**Goal**: Complete autoposting, monitoring dashboard, OAuth integration

| Day | Issues | Owner | Deliverables |
|-----|--------|-------|--------------|
| **Mon (D21)** | #171 Video (Day 2) | Worker Dev | - Subtitle generation with Whisper<br>- Custom aspect ratios (9:16, 1:1, 16:9) |
| **Tue (D22)** | #171 Video (Day 3)<br>#169 OAuth (Day 3) | Worker<br>Backend | - Video: Loudness normalization<br>- OAuth: YouTube OAuth flow |
| **Wed (D23)** | #169 OAuth (Day 4)<br>#164 Autopost (Day 1) | Backend<br>Worker | - OAuth: TikTok integration, UI account linking<br>- Autopost: Instagram Graph API posting |
| **Thu (D24)** | #164 Autopost (Day 2) | Worker Dev | - Facebook page posting<br>- YouTube Shorts upload |
| **Fri (D25)** | #164 Autopost (Day 3) | Worker Dev | - TikTok posting (if API available)<br>- Retry logic & error handling |

**Parallel Track (D21-D25)**:
- **#168 Logs API (Day 1-2)**: WebSocket endpoint, streaming logs, Redis Pub/Sub
- **#170 Calendar UI (Day 1-2)**: ContentPlan calendar view, drag-drop scheduling

**Milestone 5**: ✅ Social media posting automated, monitoring infrastructure ready

---

### Week 6 (Days 26-30): Final Integration & Polish
**Goal**: Complete monitoring dashboard, n8n full orchestration, testing

| Day | Issues | Owner | Deliverables |
|-----|--------|-------|--------------|
| **Mon (D26)** | #164 Autopost (Day 4-5)<br>#165 n8n Full (Day 1) | Worker<br>Integration | - Autopost: Cross-platform testing<br>- n8n: Design full workflow (plan → LoRA → content → post) |
| **Tue (D27)** | #165 n8n Full (Day 2) | Integration | - Content plan generation step<br>- Caption generation for posts |
| **Wed (D28)** | #165 n8n Full (Day 3) | Integration | - Image → video → autopost chain<br>- Platform-specific formatting |
| **Thu (D29)** | #165 n8n Full (Day 4-5)<br>#173 Dashboard (Day 1) | Integration<br>Frontend | - n8n: Error recovery, notifications<br>- Dashboard: Job queue monitoring cards |
| **Fri (D30)** | #173 Dashboard (Day 2)<br>#129 Lib Upgrade | Frontend<br>DevOps | - Dashboard: System health metrics, real-time updates<br>- Upgrade: Pino 10, p-queue 9, undici 7 |

**Testing & Documentation (D26-D30)**:
- **End-to-end testing**: Full pipeline from dataset → LoRA → content → post
- **Load testing**: Multiple concurrent jobs
- **Documentation review**: Update DEMO.md, SETUP.md with all features
- **Video tutorial**: Record screencast of complete workflow

**Milestone 6**: 🎉 **PRODUCTION-READY SYSTEM COMPLETE**
- ✅ All 19 issues closed
- ✅ Full automation end-to-end
- ✅ Monitoring and observability
- ✅ Documentation and tutorials

---

## Parallel Workstreams

To maximize velocity, work can be parallelized across 3 teams:

### Team A: Backend + Worker (2 devs)
**Focus**: API endpoints, job processors, integrations

**Schedule**:
- Week 1: #174, #175, #176
- Week 2: #163, #180
- Week 3: #172
- Week 4: #171
- Week 5: #168, #169, #164
- Week 6: #165 (with Team C), #129

### Team B: Frontend (2 devs)
**Focus**: Next.js UI, components, TanStack Query

**Schedule**:
- Week 1: Setup, design system review
- Week 2: #177
- Week 3: #166, #167
- Week 4: Polish UI
- Week 5: #170
- Week 6: #173

### Team C: DevOps + Integration (1 dev)
**Focus**: n8n, ComfyUI, documentation, infrastructure

**Schedule**:
- Week 1: #176, #179
- Week 2: ComfyUI testing
- Week 3: #179 (finalize docs)
- Week 4: #178
- Week 5: #169 (OAuth support)
- Week 6: #165, #129

**Result**: 6 weeks instead of 10 weeks (40% time savings)

---

## Sprint Planning (2-week sprints)

### Sprint 1 (Weeks 1-2): Foundation
**Goals**:
- API layer complete (#174, #175)
- ComfyUI integration (#176)
- Image generation working (#163)
- Dataset UI (#177)
- Auto-captioning (#180)

**Demo**: Generate image with LoRA via API

### Sprint 2 (Weeks 3-4): User Experience
**Goals**:
- Training UI wizard (#166)
- Image generation UI (#167)
- Asset management (#172)
- n8n LoRA pipeline (#178)
- Documentation (#179)

**Demo**: Complete manual workflow via UI

### Sprint 3 (Weeks 5-6): Automation & Production
**Goals**:
- OAuth integration (#169)
- Autoposting (#164)
- Full n8n orchestration (#165)
- Video enhancements (#171)
- Monitoring dashboard (#173)
- Logs API (#168)
- Calendar UI (#170)
- Library upgrades (#129)

**Demo**: Fully automated content pipeline

---

## Risk Mitigation

### High-Risk Items

**1. ComfyUI Integration (#163, #176)**
- **Risk**: ComfyUI API changes, workflow incompatibility
- **Mitigation**: Pin ComfyUI version, test workflows weekly, maintain fallback templates
- **Contingency**: 2-day buffer for workflow debugging

**2. OAuth Complexity (#169)**
- **Risk**: Platform API changes, approval delays (TikTok especially)
- **Mitigation**: Start OAuth early, use official SDKs, mock APIs for testing
- **Contingency**: Ship without TikTok if approval blocked

**3. n8n Workflow Reliability (#165, #178)**
- **Risk**: Workflow failures, timeout issues, data loss
- **Mitigation**: Extensive error handling, idempotent operations, job persistence
- **Contingency**: Manual triggers as fallback, 3-day testing buffer

**4. LoRA Training Time (#166)**
- **Risk**: Training takes longer than expected, GPU crashes
- **Mitigation**: Test with small dataset first, implement checkpointing, monitor VRAM
- **Contingency**: Use pre-trained LoRA for demo if needed

**5. Resource Constraints**
- **Risk**: Limited GPU, storage, or developer availability
- **Mitigation**: Prioritize P0 issues, implement queuing, use cloud GPU as backup
- **Contingency**: Reduce scope to MVP (exclude P1 features)

### Medium-Risk Items

**6. Video Generation Enhancements (#171)**
- **Risk**: TTS quality issues, subtitle sync problems
- **Mitigation**: Use proven libraries (Whisper, FFmpeg), test with multiple videos
- **Contingency**: Ship with basic video first, add enhancements later

**7. Monitoring Dashboard (#173)**
- **Risk**: Real-time data sync issues, performance degradation
- **Mitigation**: Use WebSockets efficiently, implement pagination, cache metrics
- **Contingency**: Polling fallback, reduced refresh rate

---

## Success Criteria

### Week 3 Checkpoint (MVP Demo)
- [ ] User can upload 15 images
- [ ] Auto-captioning generates accurate captions
- [ ] LoRA training completes in <60 minutes
- [ ] Image generation with LoRA produces consistent results
- [ ] All operations visible in UI
- [ ] DEMO.md guide works for new users

### Week 6 Final (Production)
- [ ] All 19 GitHub issues closed
- [ ] n8n workflow runs end-to-end without manual intervention
- [ ] Content posted to at least 2 social platforms
- [ ] Monitoring dashboard shows real-time job status
- [ ] System handles 3 concurrent training jobs
- [ ] Documentation complete (DEMO, SETUP, TROUBLESHOOTING, video tutorial)
- [ ] Zero P0 bugs, <5 P1 bugs
- [ ] 90%+ uptime in week 6 testing

---

## Daily Standup Template

**Format**: 15-min sync at 9:30 AM

**Questions**:
1. What did you complete yesterday? (reference issue #)
2. What are you working on today? (reference issue #)
3. Any blockers or dependencies needed?
4. Any risks or delays?

**Example**:
```
Developer A:
- Completed: #174 Dataset GET endpoints (tested, PR merged)
- Today: Starting #175 LoRA Config API, creating Prisma model
- Blockers: Need DB migration review from Team Lead
- Risks: None

Developer B:
- Completed: #177 Dataset UI design mockups
- Today: Implementing /datasets list page, DatasetCard component
- Blockers: Waiting for #174 to merge (using mock data for now)
- Risks: None
```

---

## Weekly Review Template

**Format**: 1-hour retrospective every Friday at 4 PM

**Agenda**:
1. **Sprint progress**: Issues closed vs planned
2. **Blockers encountered**: How were they resolved?
3. **Wins**: What went well this week?
4. **Improvements**: What could be better?
5. **Next week planning**: Adjust priorities if needed

**Metrics to Track**:
- Issues closed this week
- Total remaining effort (days)
- Velocity (issues/week)
- Bugs introduced
- Demo readiness %

---

## Resource Allocation

### Development Team (5 people)

| Role | Allocation | Primary Issues |
|------|------------|----------------|
| **Backend Lead** | 100% | #174, #175, #168, #172, #169 |
| **Worker Specialist** | 100% | #163, #176, #180, #164, #171 |
| **Frontend Lead** | 100% | #166, #167, #177, #173 |
| **Frontend Dev** | 100% | #170, UI polish, testing |
| **DevOps/Integration** | 100% | #178, #165, #179, #129, infrastructure |

### External Dependencies

| Service | Purpose | Setup Time |
|---------|---------|------------|
| ComfyUI | Image/video generation | 1 day (already set up) |
| kohya_ss | LoRA training | 1 day (already set up) |
| n8n | Workflow orchestration | 2 hours (Docker) |
| MinIO | S3 storage | 30 min (Docker) |
| PostgreSQL | Database | 30 min (Docker) |
| Redis | Queue + cache | 30 min (Docker) |

### Infrastructure Costs

**Current (Local)**:
- GPU server: $0 (using existing hardware)
- OpenRouter API: ~$50/month (text generation only)
- **Total**: $50/month

**Production (Cloud)**:
- GPU instance (g4dn.xlarge): ~$500/month
- Database (RDS): ~$100/month
- Storage (S3): ~$50/month
- OpenRouter API: ~$200/month
- **Total**: ~$850/month

---

## Deployment Strategy

### Week 3: Staging Environment
- Deploy MVP to staging server
- Share demo with stakeholders
- Collect feedback, adjust priorities

### Week 4: Beta Testing
- Invite 5 beta users
- Monitor usage, capture bugs
- Iterate based on feedback

### Week 6: Production Launch
- Full system deployed to production
- Monitoring and alerting configured
- Backup and disaster recovery tested
- Announce launch 🎉

---

## Communication Plan

### Daily
- **9:30 AM**: Standup (15 min)
- **Slack**: Real-time updates in #influencerai-dev
- **GitHub**: Issue comments, PR reviews

### Weekly
- **Friday 4 PM**: Sprint retrospective (1 hour)
- **Friday 5 PM**: Demo to stakeholders (30 min)

### Bi-weekly
- **Sprint planning**: Review backlog, estimate new issues
- **Architecture review**: Discuss technical decisions

### Monthly
- **Product roadmap**: Align on long-term vision
- **Performance review**: System metrics, cost analysis

---

## Next Steps

### Immediate Actions (This Week)

1. **Team Assembly**
   - [ ] Assign owners to each issue
   - [ ] Set up Slack channels (#influencerai-dev, #influencerai-alerts)
   - [ ] Create GitHub project board with 3 columns (Todo, In Progress, Done)

2. **Environment Setup**
   - [ ] Ensure all team members have local dev environment working
   - [ ] Set up staging server (optional for Week 1-2)
   - [ ] Configure CI/CD pipeline for auto-deployment

3. **Kickoff Meeting** (2 hours)
   - [ ] Present this roadmap to team
   - [ ] Walk through dependency graph
   - [ ] Assign issues to developers
   - [ ] Answer questions, adjust timeline if needed
   - [ ] Set first sprint goal

4. **Sprint 1 Initiation**
   - [ ] Create branch: `sprint/1-foundation`
   - [ ] Start #174 (Dataset GET endpoints)
   - [ ] Start #175 (LoRA Config API)
   - [ ] Start #176 (ComfyUI workflows)

### Success Tracking

**Use this checklist to track progress**:

#### Week 1
- [ ] #174 closed
- [ ] #175 closed
- [ ] #176 closed
- [ ] #179 draft complete

#### Week 3 (MVP)
- [ ] #163 closed
- [ ] #166 closed
- [ ] #167 closed
- [ ] #177 closed
- [ ] #180 closed
- [ ] **MVP demo successful**

#### Week 6 (Production)
- [ ] All 19 issues closed
- [ ] Documentation complete
- [ ] System tested end-to-end
- [ ] **Production launch** 🚀

---

## Appendix

### Glossary

- **LoRA**: Low-Rank Adaptation, technique for fine-tuning AI models
- **ComfyUI**: Node-based interface for Stable Diffusion workflows
- **kohya_ss**: Popular LoRA training toolkit
- **n8n**: Workflow automation platform (alternative to Zapier)
- **BullMQ**: Redis-based job queue library
- **MinIO**: S3-compatible object storage
- **TanStack Query**: Data fetching/caching library for React

### References

- [Project README](./README.md)
- [CLAUDE.md](./CLAUDE.md) - Project instructions
- [GitHub Issues](https://github.com/your-org/influencerai-monorepo/issues)
- [Prisma Schema](./apps/api/prisma/schema.prisma)
- [n8n Docs](https://docs.n8n.io/)
- [ComfyUI Wiki](https://github.com/comfyanonymous/ComfyUI/wiki)

### Contact

**Questions or blockers?**
- Slack: #influencerai-dev
- Email: team@influencerai.dev
- GitHub Discussions: [Link to discussions]

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Next Review**: End of Week 1 (adjust based on velocity)
