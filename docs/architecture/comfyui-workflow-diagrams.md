# ComfyUI Workflow Templates - Visual Diagrams

**Quick visual reference for understanding the workflow template architecture.**

Related: [Full Architecture](comfyui-workflow-templates-architecture.md) | [Summary](comfyui-workflow-templates-summary.md)

---

## System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      InfluencerAI System                             │
│                                                                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      │
│  │   NestJS     │      │   BullMQ     │      │   Worker     │      │
│  │   API        │─────▶│   Queue      │─────▶│   Service    │      │
│  └──────────────┘      └──────────────┘      └──────┬───────┘      │
│         │                                            │              │
│         │                                            │              │
│         ▼                                            ▼              │
│  ┌──────────────┐                           ┌──────────────┐       │
│  │  PostgreSQL  │                           │   ComfyUI    │       │
│  │   Database   │                           │   Templates  │◀──┐   │
│  └──────────────┘                           └──────┬───────┘   │   │
│                                                     │           │   │
│                                                     ▼           │   │
│                                             ┌──────────────┐   │   │
│                                             │   ComfyUI    │───┘   │
│                                             │   Server     │       │
│                                             └──────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  apps/worker/src/lib/comfy/                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Public API (index.ts)                    │  │
│  │  - buildImageWorkflow()                                       │  │
│  │  - validateWorkflow()                                         │  │
│  │  - ImageGenerationParams, ComfyWorkflow types                 │  │
│  └────────────────────┬─────────────────────────────────────────┘  │
│                       │                                             │
│         ┌─────────────┼─────────────┬──────────────┐               │
│         │             │             │              │               │
│         ▼             ▼             ▼              ▼               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │workflow- │  │workflow- │  │  node-   │  │templates/│          │
│  │ types.ts │  │validator │  │ factory  │  │   dir    │          │
│  │          │  │   .ts    │  │   .ts    │  │          │          │
│  │ - Zod    │  │          │  │          │  │ - basic  │          │
│  │   schemas│  │ - struct │  │ - create │  │ - lora   │          │
│  │ - TS     │  │   check  │  │   nodes  │  │ - multi  │          │
│  │   types  │  │ - conn   │  │ - helpers│  │   -lora  │          │
│  └──────────┘  │   check  │  └──────────┘  └──────────┘          │
│                └──────────┘                                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  __tests__/ directory                         │ │
│  │  - workflow-builder.test.ts                                  │ │
│  │  - workflow-validator.test.ts                                │ │
│  │  - node-factory.test.ts                                      │ │
│  │  - templates/*.test.ts                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Job to Image

```
┌──────────────┐
│ Job Created  │
│ {            │
│   prompt,    │
│   loraPath,  │
│   width,     │
│   height     │
│ }            │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ Image Generation Processor   │
│ (createImageGenerationProc)  │
└──────┬───────────────────────┘
       │
       │ Extract params
       ▼
┌──────────────────────────────┐
│ ImageGenerationParams        │
│ {                            │
│   checkpoint: "model.safet..",│
│   positivePrompt: "photo..", │
│   negativePrompt: "cartoon..",│
│   width: 512,                │
│   height: 768,               │
│   loraConfig: {              │
│     path: "lora.safet..",    │
│     strengthModel: 1.0       │
│   }                          │
│ }                            │
└──────┬───────────────────────┘
       │
       │ buildImageWorkflow(params)
       ▼
┌──────────────────────────────┐
│ Workflow Builder             │
│ - Auto-select builder        │
│ - Create nodes               │
│ - Link connections           │
└──────┬───────────────────────┘
       │
       │ Returns ComfyWorkflow JSON
       ▼
┌──────────────────────────────┐
│ ComfyUI Workflow JSON        │
│ {                            │
│   "4": {                     │
│     class_type: "Checkpoint..│
│     inputs: {...}            │
│   },                         │
│   "10": {                    │
│     class_type: "LoraLoader" │
│     inputs: {...}            │
│   },                         │
│   "3": { /* KSampler */ },   │
│   ...                        │
│ }                            │
└──────┬───────────────────────┘
       │
       │ validateWorkflowFull()
       ▼
┌──────────────────────────────┐
│ Validation Result            │
│ { valid: true, workflow }    │
└──────┬───────────────────────┘
       │
       │ submitImageJob()
       ▼
┌──────────────────────────────┐
│ ComfyUI Client               │
│ - POST /prompt               │
│ - Poll /history/:id          │
│ - Download image             │
└──────┬───────────────────────┘
       │
       │ Returns buffer + metadata
       ▼
┌──────────────────────────────┐
│ S3 Upload + DB Record        │
│ - Upload to MinIO            │
│ - Create Asset record        │
│ - Update Job status          │
└──────────────────────────────┘
```

---

## Workflow Builder Decision Tree

```
buildImageWorkflow(params)
    │
    ├─ Has params.multiLoraConfigs?
    │      │
    │      ├─ Yes (length > 0) ──────────────────────────┐
    │      │                                             │
    │      └─ No                                         │
    │          │                                         │
    │          ├─ Has params.loraConfig?                 │
    │          │      │                                  │
    │          │      ├─ Yes ─────────────────┐          │
    │          │      │                       │          │
    │          │      └─ No                   │          │
    │          │          │                   │          │
    │          │          ▼                   │          │
    │          │   ┌──────────────┐          │          │
    │          │   │buildBasic    │          │          │
    │          │   │Txt2ImgWork   │          │          │
    │          │   │flow()        │          │          │
    │          │   │              │          │          │
    │          │   │Nodes:        │          │          │
    │          │   │ - 4: Check   │          │          │
    │          │   │   point      │          │          │
    │          │   │ - 5: Latent  │          │          │
    │          │   │ - 6,7: CLIP  │◀──┐      │          │
    │          │   │ - 3: KSample │   │      │          │
    │          │   │ - 8: VAE     │   │      │          │
    │          │   │ - 9: Save    │   │      │          │
    │          │   └──────────────┘   │      │          │
    │          │                      │      │          │
    │          ▼                      │      │          │
    │   ┌──────────────┐             │      │          │
    │   │buildLora     │             │      │          │
    │   │Txt2ImgWork   │             │      │          │
    │   │flow()        │             │      │          │
    │   │              │             │      │          │
    │   │Nodes:        │             │      │          │
    │   │ - 4: Check   │             │      │          │
    │   │   point      │             │      │          │
    │   │ - 10: LoRA   │             │      │          │
    │   │ - 5: Latent  │             │      │          │
    │   │ - 6,7: CLIP  │─────────────┘      │          │
    │   │   (→ LoRA)   │                    │          │
    │   │ - 3: KSampler│                    │          │
    │   │   (→ LoRA)   │                    │          │
    │   │ - 8: VAE     │                    │          │
    │   │ - 9: Save    │                    │          │
    │   └──────────────┘                    │          │
    │                                       │          │
    ▼                                       │          │
┌──────────────┐                           │          │
│buildMultiLora│                           │          │
│Txt2ImgWork   │                           │          │
│flow()        │                           │          │
│              │◀──────────────────────────┘          │
│Nodes:        │                                      │
│ - 4: Check   │                                      │
│   point      │                                      │
│ - 10: LoRA #1│                                      │
│ - 11: LoRA #2│                                      │
│ - 12: LoRA #3│ (chained)                           │
│ - ...        │                                      │
│ - 5: Latent  │                                      │
│ - 6,7: CLIP  │──────────────────────────────────────┘
│   (→ last LoRA)
│ - 3: KSampler│
│   (→ last LoRA)
│ - 8: VAE     │
│ - 9: Save    │
└──────────────┘
```

---

## Node Connection Flow: Basic Workflow

```
┌────────────────────────┐
│ 4: CheckpointLoader    │
│ Outputs:               │
│  [0] MODEL ────────────┼──────┐
│  [1] CLIP ─────────────┼────┐ │
│  [2] VAE ──────────────┼──┐ │ │
└────────────────────────┘  │ │ │
                            │ │ │
        ┌───────────────────┘ │ │
        │   ┌─────────────────┘ │
        │   │   ┌───────────────┘
        │   │   │
        ▼   ▼   │
┌────────────────────────┐      │
│ 6: CLIPTextEncode      │      │
│ (Positive Prompt)      │      │
│ Inputs:                │      │
│  clip: [4, 1] ◀────────┼──────┘
│ Output:                │
│  [0] CONDITIONING ─────┼──────┐
└────────────────────────┘      │
                                │
        ▼                       │
┌────────────────────────┐      │
│ 7: CLIPTextEncode      │      │
│ (Negative Prompt)      │      │
│ Inputs:                │      │
│  clip: [4, 1]          │      │
│ Output:                │      │
│  [0] CONDITIONING ─────┼────┐ │
└────────────────────────┘    │ │
                              │ │
┌────────────────────────┐    │ │
│ 5: EmptyLatentImage    │    │ │
│ Output:                │    │ │
│  [0] LATENT ───────────┼──┐ │ │
└────────────────────────┘  │ │ │
                            │ │ │
        ┌───────────────────┘ │ │
        │   ┌─────────────────┘ │
        │   │   ┌───────────────┘
        │   │   │
        ▼   ▼   ▼
┌────────────────────────┐
│ 3: KSampler            │
│ Inputs:                │
│  model: [4, 0] ◀───────┼── from checkpoint
│  positive: [6, 0] ◀────┼── from CLIP encode
│  negative: [7, 0] ◀────┼── from CLIP encode
│  latent_image: [5, 0]  │
│ Output:                │
│  [0] LATENT ───────────┼──┐
└────────────────────────┘  │
                            │
                            ▼
┌────────────────────────┐
│ 8: VAEDecode           │
│ Inputs:                │
│  samples: [3, 0]       │
│  vae: [4, 2] ◀─────────┼── from checkpoint
│ Output:                │
│  [0] IMAGE ────────────┼──┐
└────────────────────────┘  │
                            │
                            ▼
┌────────────────────────┐
│ 9: SaveImage           │
│ Inputs:                │
│  images: [8, 0]        │
└────────────────────────┘
```

---

## Node Connection Flow: LoRA Workflow

```
┌────────────────────────┐
│ 4: CheckpointLoader    │
│ Outputs:               │
│  [0] MODEL ────────────┼──────┐
│  [1] CLIP ─────────────┼────┐ │
│  [2] VAE ──────────────┼──┐ │ │
└────────────────────────┘  │ │ │
                            │ │ │
        ┌───────────────────┘ │ │
        │   ┌─────────────────┘ │
        │   │                   │
        ▼   ▼                   │
┌────────────────────────┐      │
│ 10: LoraLoader         │      │
│ Inputs:                │      │
│  model: [4, 0] ◀───────┼──────┘
│  clip: [4, 1]          │
│  lora_name: "..."      │
│  strength_model: 1.0   │
│ Outputs:               │
│  [0] MODEL ────────────┼────┐
│  [1] CLIP ─────────────┼──┐ │
└────────────────────────┘  │ │
                            │ │
        ┌───────────────────┘ │
        │   ┌─────────────────┘
        │   │
        ▼   │
┌────────────────────────┐    │
│ 6: CLIPTextEncode      │    │
│ (Positive)             │    │
│ Inputs:                │    │
│  clip: [10, 1] ◀───────┼────┘
│ Output:                │
│  [0] CONDITIONING ─────┼──┐
└────────────────────────┘  │
                            │
┌────────────────────────┐  │
│ 7: CLIPTextEncode      │  │
│ (Negative)             │  │
│ Inputs:                │  │
│  clip: [10, 1]         │  │
│ Output:                │  │
│  [0] CONDITIONING ─────┼─┐│
└────────────────────────┘ ││
                           ││
┌────────────────────────┐ ││
│ 5: EmptyLatentImage    │ ││
│ Output:                │ ││
│  [0] LATENT ───────────┼┐││
└────────────────────────┘│││
                          │││
        ┌─────────────────┘││
        │   ┌──────────────┘│
        │   │   ┌───────────┘
        │   │   │
        ▼   ▼   ▼
┌────────────────────────┐
│ 3: KSampler            │
│ Inputs:                │
│  model: [10, 0] ◀──────┼── from LoRA MODEL
│  positive: [6, 0]      │
│  negative: [7, 0]      │
│  latent_image: [5, 0]  │
│ Output:                │
│  [0] LATENT ───────────┼──┐
└────────────────────────┘  │
                            │
                            ▼
┌────────────────────────┐
│ 8: VAEDecode           │
│ Inputs:                │
│  samples: [3, 0]       │
│  vae: [4, 2] ◀─────────┼── still from checkpoint
│ Output:                │
│  [0] IMAGE ────────────┼──┐
└────────────────────────┘  │
                            │
                            ▼
┌────────────────────────┐
│ 9: SaveImage           │
│ Inputs:                │
│  images: [8, 0]        │
└────────────────────────┘
```

---

## Multi-LoRA Chaining

```
Checkpoint (4)
    │
    ├─ MODEL [0] ──┐
    └─ CLIP [1] ───┼─┐
                   │ │
                   ▼ ▼
           LoRA #1 (10)
           strength: 0.7
               │
               ├─ MODEL [0] ──┐
               └─ CLIP [1] ───┼─┐
                              │ │
                              ▼ ▼
                      LoRA #2 (11)
                      strength: 1.0
                          │
                          ├─ MODEL [0] ──┐
                          └─ CLIP [1] ───┼─┐
                                         │ │
                                         ▼ ▼
                                 LoRA #3 (12)
                                 strength: 0.8
                                     │
                                     ├─ MODEL [0] ──┐
                                     └─ CLIP [1] ───┼─┐
                                                    │ │
                    ┌───────────────────────────────┘ │
                    │   ┌─────────────────────────────┘
                    │   │
                    │   ▼
                    │ CLIPTextEncode (6,7)
                    │
                    ▼
                KSampler (3)
                    │
                    ▼
                VAEDecode (8)
                    │
                    ▼
                SaveImage (9)
```

**Effect**: Each LoRA modifies the model progressively. Order matters!

---

## Type System Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                   Zod Schemas                       │
│  (Runtime validation, type inference)               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ComfyWorkflowSchema                         │   │
│  │  = z.record(z.string(), ComfyNodeSchema)    │   │
│  └────────────────┬────────────────────────────┘   │
│                   │                                │
│                   ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ ComfyNodeSchema                             │   │
│  │  = z.object({                               │   │
│  │      class_type: z.string(),                │   │
│  │      inputs: z.record(NodeInputSchema),     │   │
│  │      _meta: z.object({...}).optional()      │   │
│  │    })                                       │   │
│  └────────────────┬────────────────────────────┘   │
│                   │                                │
│                   ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ NodeInputSchema                             │   │
│  │  = z.union([                                │   │
│  │      z.string(),                            │   │
│  │      z.number(),                            │   │
│  │      z.boolean(),                           │   │
│  │      NodeConnectionSchema                   │   │
│  │    ])                                       │   │
│  └────────────────┬────────────────────────────┘   │
│                   │                                │
│                   ▼                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ NodeConnectionSchema                        │   │
│  │  = z.tuple([z.string(), z.number()])        │   │
│  │    // [node_id, output_index]               │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        │
                        │ z.infer<typeof ...>
                        ▼
┌─────────────────────────────────────────────────────┐
│             TypeScript Types                        │
│  (Compile-time checking, IDE support)               │
│                                                     │
│  type ComfyWorkflow = Record<string, ComfyNode>     │
│  type ComfyNode = { class_type: string, ... }       │
│  type NodeInput = string | number | boolean | [...]│
│  type NodeConnection = [string, number]             │
└─────────────────────────────────────────────────────┘
```

**Benefits**:
- Single source of truth (Zod schemas)
- Runtime validation
- Compile-time type safety
- Automatic type inference

---

## Extension Points

```
┌─────────────────────────────────────────────────────┐
│         Current Implementation (Phase 1-2)          │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  Basic    │  │   LoRA    │  │ Multi-LoRA│       │
│  │  Txt2Img  │  │  Txt2Img  │  │  Txt2Img  │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        │ Extension
                        ▼
┌─────────────────────────────────────────────────────┐
│         Future Extensions (Phase 3+)                │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │   SDXL    │  │ ControlNet│  │IP-Adapter │       │
│  │  Txt2Img  │  │  Img2Img  │  │  Img2Img  │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │Inpainting │  │  Upscale  │  │  Custom   │       │
│  │           │  │           │  │ Templates │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        │ Registry
                        ▼
┌─────────────────────────────────────────────────────┐
│         Template Registry System                    │
│                                                     │
│  templateRegistry.register({                        │
│    id: "custom-template",                          │
│    name: "Custom Workflow",                        │
│    category: "image",                              │
│    build: (params) => buildCustomWorkflow(params)  │
│  });                                               │
│                                                     │
│  const template = templateRegistry.get("custom..") │
│  const workflow = template.build(params);          │
└─────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

```
┌──────────────────────────────────────────────┐
│          Workflow Building Time              │
│                                              │
│  Basic Workflow:         <1ms               │
│  LoRA Workflow:          <1ms               │
│  Multi-LoRA (5):         <5ms               │
│                                              │
│          Validation Time                     │
│                                              │
│  Structure Validation:   <1ms               │
│  Connection Validation:  <1ms               │
│  Full Validation:        <2ms               │
│                                              │
│          Memory Usage                        │
│                                              │
│  Basic Workflow:         ~1KB JSON          │
│  LoRA Workflow:          ~1.5KB JSON        │
│  Multi-LoRA (5):         ~2.5KB JSON        │
│                                              │
│  1000 Concurrent Jobs:   <10MB memory       │
└──────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
buildImageWorkflow(params)
    │
    ├─ Validate with Zod
    │      │
    │      ├─ Invalid ──▶ ZodError thrown
    │      │              {
    │      │                issues: [
    │      │                  { path: ["width"],
    │      │                    message: "Not multiple of 8" }
    │      │                ]
    │      │              }
    │      │
    │      └─ Valid ──▶ Continue
    │
    ├─ Build workflow nodes
    │
    ▼
validateWorkflowFull(workflow)
    │
    ├─ Structure validation
    │      │
    │      ├─ Invalid ──▶ { valid: false, errors: [...] }
    │      │
    │      └─ Valid ──▶ Continue
    │
    ├─ Connection validation
    │      │
    │      ├─ Invalid ──▶ { valid: false, errors: [
    │      │                "Node 3 refs non-existent node 99"
    │      │              ]}
    │      │
    │      └─ Valid ──▶ Continue
    │
    ▼
submitImageJob(workflow)
    │
    ├─ Check validation result
    │      │
    │      ├─ !valid ──▶ throw Error(errors.join(', '))
    │      │
    │      └─ valid ──▶ Continue
    │
    ├─ Submit to ComfyUI
    │      │
    │      ├─ HTTP Error ──▶ throw Error("ComfyUI failed")
    │      │
    │      └─ Success ──▶ Return result
    │
    ▼
Success
```

---

## Testing Strategy Pyramid

```
                    ┌─────────┐
                    │   E2E   │
                    │  Tests  │ ← Mock ComfyUI API
                    │  (10%)  │
                    └────┬────┘
                         │
                ┌────────┴────────┐
                │  Integration    │
                │     Tests       │ ← Test workflow submission
                │     (20%)       │
                └────────┬────────┘
                         │
            ┌────────────┴────────────┐
            │   Unit Tests            │
            │   - Builders (40%)      │ ← All branches
            │   - Validators (30%)    │ ← Edge cases
            │   - Node Factory (40%)  │ ← 100% coverage
            │   (70%)                 │
            └─────────────────────────┘

Total Coverage Target: 90%+
```

---

**Related Documentation**:
- [Full Architecture](comfyui-workflow-templates-architecture.md)
- [Architecture Summary](comfyui-workflow-templates-summary.md)
- [Research Document](../tecnic/research-comfyui-workflow-templates.md)
- [Quick Reference](../tecnic/comfyui-workflow-quick-reference.md)

**Last Updated**: 2025-10-19
