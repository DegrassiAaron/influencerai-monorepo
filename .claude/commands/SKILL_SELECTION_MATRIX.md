# Skill Selection Matrix

> **Purpose**: Guide for automatically selecting the right skill based on task context in `/work` and `/debug` workflows.
> **Last Updated**: 2025-10-19
> **Version**: 1.0

---

## Decision Flowchart

```
┌─────────────────────────────────────────────┐
│ Task Type Identification                    │
└─────────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Is task about        │
         │ TEST patterns?       │
         └──────────────────────┘
              │           │
          YES │           │ NO
              ▼           ▼
    ┌─────────────────┐   ┌──────────────────────┐
    │ Use Skill:      │   │ Is task about        │
    │ - testing       │   │ BOILERPLATE code?    │
    │ - webapp-testing│   └──────────────────────┘
    │   (E2E only)    │         │           │
    └─────────────────┘     YES │           │ NO
                                ▼           ▼
                    ┌─────────────────┐   ┌──────────────────────┐
                    │ Use Skill:      │   │ Is task about        │
                    │ - development   │   │ DOCUMENTATION?       │
                    └─────────────────┘   └──────────────────────┘
                                                │           │
                                            YES │           │ NO
                                                ▼           ▼
                                    ┌─────────────────┐   ┌──────────────────┐
                                    │ Use Skill:      │   │ Use Agent:       │
                                    │ - development   │   │ - deep-think-dev │
                                    └─────────────────┘   │ - typescript-exp │
                                                          │ OR               │
                                                          │ Use MCP:         │
                                                          │ - Context7       │
                                                          │ - Magic          │
                                                          │ - Sequential     │
                                                          └──────────────────┘
```

---

## Skill Selection Table

| Task Type | Context | Skill | Alternative (Agent/MCP) | When to Use Skill | When to Use Alternative |
|-----------|---------|-------|------------------------|-------------------|-------------------------|
| **Unit Testing** | Backend (C#) | `testing` | Agent: `deep-think-developer` | Need test structure, AAA pattern, naming conventions | Domain-specific assertions, business logic tests |
| **Unit Testing** | Frontend (TS) | `testing` | Agent: `typescript-expert-developer` | Need Jest/Vitest patterns, mocking examples | Component-specific logic, React hooks testing |
| **E2E Testing** | Frontend UI | `webapp-testing` | MCP: Playwright direct | Need page object model, user workflows, accessibility | Simple selector-based tests (no complex workflows) |
| **Code Generation** | Boilerplate | `development` | Agent: `deep-think-developer`, `typescript-expert-developer` | CLI apps, project setup, utilities | Domain business logic, complex algorithms |
| **Documentation** | Structure | `development` | Agent: `doc-researcher-optimizer` | README format, docstring conventions | Framework-specific docs (use Context7 MCP) |
| **Architecture** | Design decisions | N/A | Agent: `system-architect`, `strategic-advisor` | Never (no skill for architecture) | Always use Agent for architecture |
| **Code Review** | Quality analysis | N/A | Agent: `deep-think-developer`, `typescript-expert-developer` | Never (no skill for review) | Always use Agent for code review |
| **UI Components** | React/Next.js | N/A | MCP: `magic_generate` | Never (no skill for UI gen) | Always use Magic MCP for new UI components |
| **Framework Docs** | Best practices | N/A | MCP: `upstash-context-7` | Never (no skill for docs lookup) | Always use Context7 for up-to-date framework docs |

---

## Skill Details

### 1. `testing` Skill

**Location**: Local (`.claude/skills/testing/`)

**Provides**:
- Unit test structure patterns (pytest, xUnit, Jest, Vitest)
- Test naming conventions
- Arrange-Act-Assert (AAA) pattern
- Mocking and stubbing examples
- Code coverage strategies

**When to Use**:
- ✅ Phase 3 (/work): Writing BDD tests (get structure)
- ✅ Step 4C (/debug): Creating regression tests
- ✅ Need test scaffolding or patterns

**When NOT to Use**:
- ❌ Domain-specific assertions (Agent handles business logic)
- ❌ Complex integration test scenarios (Agent + Context7)
- ❌ E2E tests (use `webapp-testing` instead)

**Example Usage**:
```bash
# In /work Phase 3 or /debug Step 4C
Skill("testing")
# → Returns: pytest patterns (adapt to xUnit/Jest)
# → Use: Structure your tests with returned patterns
```

---

### 2. `webapp-testing` Skill

**Location**: Marketplace (plugin: `example-skills@anthropic-agent-skills`)

**Provides**:
- Playwright E2E test patterns
- Page Object Model structure
- User workflow testing
- Accessibility testing patterns
- Visual regression testing

**When to Use**:
- ✅ Phase 5 (/work): E2E tests for frontend features
- ✅ Step 4C (/debug): Reproducing UI errors end-to-end
- ✅ DoD requires E2E testing

**When NOT to Use**:
- ❌ Backend-only features
- ❌ Unit tests (use `testing` skill)
- ❌ API integration tests (Agent + Testcontainers)

**Example Usage**:
```bash
# In /work Phase 5 (if frontend + DoD requires E2E)
Skill("webapp-testing")
# → Returns: Playwright patterns, page objects, selectors
# → Use: Create E2E test for user workflows
```

---

### 3. `development` Skill

**Location**: Local (`.claude/skills/development/`)

**Provides**:
- Project setup patterns (virtual env, dependencies)
- CLI application structure
- Git workflow best practices
- Documentation conventions (README, docstrings)
- Error handling patterns
- Logging best practices

**When to Use**:
- ✅ Phase 4 (/work): Boilerplate code generation
- ✅ Phase 8 (/work): Documentation updates (structure)
- ✅ Step 4D (/debug): Troubleshooting docs structure

**When NOT to Use**:
- ❌ Business logic implementation (Agent handles)
- ❌ Framework-specific patterns (use Context7 MCP)
- ❌ UI component generation (use Magic MCP)

**Example Usage**:
```bash
# In /work Phase 8 or /debug Step 4D
Skill("development")
# → Returns: Documentation structure, README format
# → Use: Apply structure to your specific content
```

---

## Skill vs Agent vs MCP

### When to Use Skills
**Characteristics**:
- Generic, framework-agnostic patterns
- Battle-tested best practices
- Boilerplate and scaffolding
- Structure and conventions

**Examples**:
- Test structure (AAA pattern)
- README template
- CLI argument parsing pattern

### When to Use Agents
**Characteristics**:
- Domain-specific business logic
- Context-aware code generation
- Complex reasoning and planning
- Code review and analysis

**Examples**:
- Influencer CRUD logic
- RAG service implementation
- Architecture design decisions

### When to Use MCP Tools
**Characteristics**:
- External service integration
- Up-to-date framework documentation
- AI-powered specialized tasks
- Repository operations

**Examples**:
- Context7: React 18 docs lookup
- Magic: Generate new UI component
- Sequential: Multi-step reasoning chain
- GitHub: Create PR, manage issues

---

## Priority Rules

**Decision Priority** (apply in order):

1. **Is task generic pattern/structure?** → Skill
2. **Is task framework-specific docs?** → MCP (Context7)
3. **Is task UI component generation?** → MCP (Magic)
4. **Is task domain business logic?** → Agent
5. **Is task architecture/planning?** → Agent
6. **Is task GitHub operation?** → MCP (GitHub)

**Conflict Resolution**:
- If both Skill and Agent can handle → **Use Skill first** for patterns, then Agent for implementation
- If both MCP and Agent can handle → **Use MCP** for external data (Context7), Agent for reasoning
- If uncertain → **Default to Agent** (most flexible)

---

## Integration Points

### In `/work` Command

| Phase | Skill Usage | Purpose |
|-------|-------------|---------|
| **Phase 3** (Test-First) | `testing` | Get test structure before writing BDD tests |
| **Phase 5** (Local Tests) | `webapp-testing` | Get E2E patterns if frontend + DoD requires E2E |
| **Phase 8** (Update Issue DoD) | `development` | Get docs structure if DoD requires docs update |

### In `/debug` Command

| Step | Skill Usage | Purpose |
|------|-------------|---------|
| **Step 4C** (Unit/Integration Tests) | `testing` | Get test patterns before creating regression tests |
| **Step 4C** (E2E, frontend only) | `webapp-testing` | Get E2E patterns if error is UI-related |
| **Step 4D** (Documentation) | `development` | Get troubleshooting docs structure |

---

## Real-World Examples

### Example 1: Backend API Feature (/work)
```
Issue: #API-05 "Add streaming SSE endpoint"
Stack: Backend (C#)

Phase 3 (Testing):
  Decision: Need unit test structure → Use Skill
  Action: Skill("testing") → Get xUnit patterns
  Result: 12 unit tests with AAA structure

Phase 8 (Docs):
  Decision: DoD requires API docs → Use Skill for structure
  Action: Skill("development") → Get README format
  Result: Updated docs/api/streaming.md

Skills: testing, development
Agents: deep-think-developer
MCP: Context7 (ASP.NET Core docs)
```

### Example 2: Frontend UI Feature (/work)
```
Issue: #UI-166 "Create influencer management UI"
Stack: Frontend (React, Next.js)

Phase 3 (Testing):
  Decision: Need Jest test structure → Use Skill
  Action: Skill("testing") → Get Jest patterns
  Result: 15 unit tests for CRUD operations

Phase 5 (E2E):
  Decision: DoD requires E2E → Use Skill
  Action: Skill("webapp-testing") → Get Playwright patterns
  Result: 3 E2E tests (create, edit, delete flows)

Phase 8 (Docs):
  Decision: Update user guide → Use Skill
  Action: Skill("development") → Get docs structure
  Result: Updated docs/guides/influencers.md

Skills: testing, webapp-testing, development
Agents: typescript-expert-developer
MCP: Context7 (React 18), Magic (form components only)
```

### Example 3: Debug Frontend Error (/debug)
```
Error: TS2339: Property 'chatId' does not exist on type 'StreamingResponse'
Stack: Frontend (TypeScript)

Step 4C (Testing):
  Decision: Need Jest test → Use Skill
  Action: Skill("testing") → Get test patterns
  Result: 8 unit tests for StreamingResponse type

Step 4C (E2E, optional):
  Decision: Error affects UI → Use Skill
  Action: Skill("webapp-testing") → Get E2E patterns
  Result: 1 E2E test for streaming chat flow

Step 4D (Docs):
  Decision: Update troubleshooting → Use Skill
  Action: Skill("development") → Get docs structure
  Result: Added TS2339 entry to troubleshooting.md

Skills: testing, webapp-testing, development
Agents: typescript-expert-developer
MCP: Context7 (TypeScript), Sequential (analysis)
```

---

## Common Mistakes to Avoid

❌ **Using Skill for Domain Logic**
```bash
# WRONG: Using development skill for business logic
Skill("development")  # To write influencer CRUD logic
```
```bash
# CORRECT: Use Agent for domain logic
Agent: deep-think-developer  # Writes influencer CRUD with business rules
```

❌ **Using Agent for Generic Patterns**
```bash
# WRONG: Using Agent to get test structure
Agent: deep-think-developer  # To learn Jest syntax
```
```bash
# CORRECT: Use Skill for generic patterns
Skill("testing")  # Get Jest structure, then Agent writes specific tests
```

❌ **Using MCP for Generic Patterns**
```bash
# WRONG: Using Context7 for test patterns
MCP: Context7  # To get Jest testing patterns
```
```bash
# CORRECT: Use Skill for patterns, Context7 for framework-specific docs
Skill("testing")  # Get test structure
MCP: Context7("jest")  # Get Jest 29 specific features/API changes
```

---

## Quick Reference Card

| Need | Use This | Example |
|------|----------|---------|
| Test structure | `testing` skill | `Skill("testing")` |
| E2E patterns | `webapp-testing` skill | `Skill("webapp-testing")` |
| Boilerplate code | `development` skill | `Skill("development")` |
| Docs structure | `development` skill | `Skill("development")` |
| Domain logic | Agent | `deep-think-developer`, `typescript-expert-developer` |
| Framework docs | Context7 MCP | `mcp__upstash-context-7__get-library-docs` |
| UI components | Magic MCP | `mcp__magic__magic_generate` |
| Planning | Agent | `strategic-advisor`, `system-architect` |
| Code review | Agent | `deep-think-developer`, `typescript-expert-developer` |
| GitHub ops | GitHub MCP | `mcp__github-project-manager__*` |

---

**End of Skill Selection Matrix**
