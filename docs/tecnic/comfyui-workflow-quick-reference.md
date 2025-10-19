# ComfyUI Workflow Quick Reference

**Quick lookup guide for ComfyUI workflow JSON structure and common patterns**

## Workflow Structure

```json
{
  "node_id": {
    "class_type": "NodeType",
    "inputs": {
      "param": value,
      "connection": ["source_node_id", output_index]
    }
  }
}
```

## Basic Text-to-Image Flow

```
CheckpointLoader → LoraLoader (optional) → CLIPTextEncode → KSampler → VAEDecode → SaveImage
                                        ↓                  ↑
                                        EmptyLatentImage ──┘
```

## Essential Nodes

### CheckpointLoaderSimple
```json
{
  "class_type": "CheckpointLoaderSimple",
  "inputs": {
    "ckpt_name": "model.safetensors"
  }
}
```
**Outputs**: `[0: MODEL, 1: CLIP, 2: VAE]`

### LoraLoader
```json
{
  "class_type": "LoraLoader",
  "inputs": {
    "lora_name": "lora.safetensors",
    "strength_model": 1.0,
    "strength_clip": 1.0,
    "model": ["4", 0],
    "clip": ["4", 1]
  }
}
```
**Outputs**: `[0: MODEL, 1: CLIP]`

### CLIPTextEncode
```json
{
  "class_type": "CLIPTextEncode",
  "inputs": {
    "text": "prompt here",
    "clip": ["4", 1]
  }
}
```
**Outputs**: `[0: CONDITIONING]`

### EmptyLatentImage
```json
{
  "class_type": "EmptyLatentImage",
  "inputs": {
    "width": 512,
    "height": 768,
    "batch_size": 1
  }
}
```
**Outputs**: `[0: LATENT]`

### KSampler
```json
{
  "class_type": "KSampler",
  "inputs": {
    "seed": 42,
    "steps": 20,
    "cfg": 7.0,
    "sampler_name": "euler",
    "scheduler": "normal",
    "denoise": 1.0,
    "model": ["4", 0],
    "positive": ["6", 0],
    "negative": ["7", 0],
    "latent_image": ["5", 0]
  }
}
```
**Outputs**: `[0: LATENT]`

### VAEDecode
```json
{
  "class_type": "VAEDecode",
  "inputs": {
    "samples": ["3", 0],
    "vae": ["4", 2]
  }
}
```
**Outputs**: `[0: IMAGE]`

### SaveImage
```json
{
  "class_type": "SaveImage",
  "inputs": {
    "filename_prefix": "ComfyUI",
    "images": ["8", 0]
  }
}
```

## Sampler Presets

### Fast (10-15 steps)
```json
{
  "sampler_name": "euler",
  "scheduler": "normal",
  "steps": 12,
  "cfg": 6.5
}
```

### Balanced (20-25 steps)
```json
{
  "sampler_name": "euler_a",
  "scheduler": "normal",
  "steps": 20,
  "cfg": 7.5
}
```

### High Quality (25-35 steps)
```json
{
  "sampler_name": "dpmpp_2m",
  "scheduler": "karras",
  "steps": 28,
  "cfg": 8.0
}
```

## LoRA Strength Guide

| Strength | Effect |
|----------|--------|
| 0.0 | No effect |
| 0.3-0.5 | Subtle influence |
| 0.6-0.8 | Moderate (good for mixing) |
| 1.0 | Full strength (standard) |
| 1.2-1.5 | Strong (may overfit) |
| Negative | Inverse effect |

## Common Resolutions

### SD 1.5
- Square: 512x512
- Portrait: 512x768
- Landscape: 768x512

### SDXL
- Square: 1024x1024
- Portrait: 832x1216, 1024x1536
- Landscape: 1216x832, 1536x1024

## API Request Format

```typescript
POST http://comfyui:8188/prompt

{
  "client_id": "unique-id",
  "prompt": { ...workflow JSON... },
  "extra_data": {
    "metadata": { ...custom data... }
  }
}
```

**Response**:
```json
{
  "prompt_id": "job-id",
  "number": 42
}
```

## TypeScript Template Example

```typescript
function buildWorkflow(params: {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  loraPath?: string;
}) {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: params.seed,
        steps: 20,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        model: params.loraPath ? ["10", 0] : ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: "model.safetensors",
      },
    },
    // ... other nodes
  };
}
```

## Exporting Workflow API Format

1. Settings → Enable Dev mode Options
2. File → Save (API Format)
3. Saves as `workflow_api.json`

## Node Connection Format

Direct value: `"seed": 42`
Connection: `"model": ["4", 0]` (node 4, output 0)

## Common Issues

### LoRA Not Loading
- Check filename matches exactly
- Verify `.safetensors` extension
- Ensure file in `models/loras/` directory

### Blank/Black Images
- Check VAE connection
- Verify model loaded correctly
- Try different sampler/steps

### "Out of Memory" Errors
- Reduce image size
- Lower batch_size to 1
- Use smaller checkpoint
- Reduce LoRA strength or remove

## See Also

- Full Research: `docs/tecnic/research-comfyui-workflow-templates.md`
- Existing Integration: `apps/worker/src/processors/videoGeneration/comfyClient.ts`
