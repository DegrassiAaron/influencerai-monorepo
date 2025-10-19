# Getting Started with LoRA Training

Complete guide to training custom LoRA models for your virtual influencer using InfluencerAI.

---

## What is LoRA Training?

LoRA (Low-Rank Adaptation) is a training technique that allows you to fine-tune Stable Diffusion models to generate consistent characters, specific art styles, or custom concepts without retraining the entire model. Instead of modifying billions of parameters, LoRA creates a small "adapter" file (typically 10-200 MB) that guides the base model to produce your desired output.

In InfluencerAI, LoRA training enables you to create a unique, consistent appearance for your virtual influencer. By training on 20-50 high-quality photos, the system learns to reproduce your influencer's face, style, and characteristics across thousands of generated images and videos. This consistency is crucial for building an authentic social media presence.

The training process involves feeding your dataset (images with text descriptions) into kohya_ss, which creates a `.safetensors` file. This LoRA model can then be loaded into ComfyUI workflows alongside any Stable Diffusion base model to generate new content featuring your trained concept. The result: your virtual influencer can appear in unlimited scenarios—beach photoshoots, studio portraits, travel content—while maintaining perfect visual consistency.

---

## Prerequisites

Before starting LoRA training, ensure you have:

- [ ] **Docker infrastructure running** - Postgres, Redis, MinIO, n8n
  - See [Quick Start Guide](../../getting-started/avvio-rapido.md)

- [ ] **API and Worker services running**
  ```bash
  pnpm dev  # Starts API (3001), Web (3000), Worker
  ```

- [ ] **ComfyUI installed and running** (optional, for testing)
  - URL: `http://localhost:8188`
  - Base model downloaded to `ComfyUI/models/checkpoints/`

- [ ] **NVIDIA GPU with 8GB+ VRAM**
  - SD 1.5 (512x512): 8 GB minimum
  - SDXL (1024x1024): 16 GB recommended
  - CPU training is possible but 50-100x slower

- [ ] **50 GB free disk space**
  - Training datasets: 1-5 GB
  - Model outputs: 50-200 MB per LoRA
  - Temporary files during training

---

## Dataset Preparation Checklist

### Minimum Requirements

- [ ] **15-30 images minimum** (20-25 is ideal for most cases)
  - Style training: 50-100 images for better generalization
  - Character/face training: 15-30 high-quality images sufficient
  - Concept training: 30+ diverse examples recommended

- [ ] **Image Quality Standards**
  - Resolution: Minimum 512x512, ideally 1024x1024 pixels
  - Format: PNG or JPG (PNG preferred for quality)
  - Focus: Subject clearly visible, minimal background clutter
  - Lighting: Varied but consistent quality (avoid extreme shadows/overexposure)
  - Diversity: Multiple angles, expressions, poses (avoid 200 near-identical shots)

- [ ] **Dataset Diversity**
  - ✅ Various angles (front, side, 3/4 view)
  - ✅ Different expressions (neutral, smiling, serious)
  - ✅ Multiple poses and contexts
  - ✅ Varied lighting conditions
  - ❌ Avoid: Near-identical duplicates (causes overfitting)
  - ❌ Avoid: Low-quality or blurry images (1 bad image can degrade entire model)

### Caption Requirements

- [ ] **Caption Format**
  - One `.txt` file per image with the same filename
  - Example: `image001.png` → `image001.txt`
  - Caption content: Describe what the model should learn
  - Trigger word: Include your chosen activation keyword (e.g., "ohwx woman")

- [ ] **Caption Quality**
  - Describe everything EXCEPT what you want to be part of the trained concept
  - For style training: Caption colors, composition, mood, but not the style itself
  - For character training: Caption clothing, pose, background, but not facial features
  - Consistency: Use similar phrasing across all captions
  - Detail level: 1-2 sentences, focus on key visual elements

### Auto-Captioning Tools (Optional)

If you need to generate captions automatically:
- **BLIP/BLIP2**: General image captioning (good for backgrounds/context)
- **CLIP Interrogator**: Generates prompt-style descriptions
- **Tagging models**: Adds descriptive tags (clothing, objects, colors)

**Important**: Always review and refine auto-generated captions. They often miss important details or your specific trigger word.

### Dataset Organization

```
data/datasets/<your-influencer-name>/
├── image001.png
├── image001.txt
├── image002.png
├── image002.txt
├── ...
├── image029.png
├── image029.txt
├── image030.png
└── image030.txt
```

**File naming**: Use consistent naming (e.g., `img_001.png`, `img_002.png`) to keep files organized.

---

## Training Parameter Reference

### Critical Parameters Explained

| Parameter | Recommended Value | Description | When to Adjust |
|-----------|------------------|-------------|----------------|
| **Learning Rate** | `3e-5` to `1e-4` | Controls training speed. Higher = faster but less precise. | Lower (`3e-6` to `5e-5`) for fine details, higher (`1e-4` to `5e-4`) for faster training with more images |
| **Text Encoder LR** | `5e-5` | Learning rate specifically for text understanding | Keep at half of Unet LR for SDXL |
| **Unet Learning Rate** | `1e-4` | Learning rate for image generation network | Primary parameter to adjust for training speed |
| **Epochs** | `10-30` | Number of complete passes through dataset | More images = fewer epochs needed. Start with 20 and review earlier checkpoints |
| **Batch Size** | `1-4` | Images processed per step | Limited by VRAM: 1 for 8GB, 2-4 for 16GB+, must be divisor of total images |
| **Resolution** | `512` or `1024` | Training image size | SD 1.5: 512x512, SDXL: 1024x1024. Match your base model's native resolution |
| **Network Dimension (Rank)** | `8-32` | LoRA adapter size | 8-16 for small models, 32 for complex styles. Higher = larger file, minimal quality gain beyond 32 |
| **Network Alpha** | Half of Rank | Scaling factor for LoRA weights | Typically set to Rank ÷ 2 (e.g., Rank 32 → Alpha 16) |
| **Optimizer** | `AdamW8bit` | Training algorithm | AdamW8bit = less VRAM, sufficient accuracy. AdamW (32-bit) for maximum precision if VRAM allows |
| **Learning Rate Scheduler** | `cosine` | How learning rate changes over time | Cosine for smooth decay, constant for simple training |
| **Min SNR Gamma** | `5` | Stability improvement | Reduces training artifacts, recommended for all training |

### Recommended Presets

#### Conservative (High Quality, Slower)
```json
{
  "learning_rate": "3e-5",
  "text_encoder_lr": "5e-5",
  "unet_lr": "1e-4",
  "epochs": 30,
  "batch_size": 1,
  "network_dim": 32,
  "network_alpha": 16,
  "optimizer": "AdamW8bit",
  "lr_scheduler": "cosine",
  "min_snr_gamma": 5
}
```

#### Balanced (Recommended for Beginners)
```json
{
  "learning_rate": "1e-4",
  "epochs": 20,
  "batch_size": 2,
  "network_dim": 16,
  "network_alpha": 8,
  "optimizer": "AdamW8bit",
  "lr_scheduler": "cosine",
  "min_snr_gamma": 5
}
```

#### Fast (Quick Testing)
```json
{
  "learning_rate": "5e-4",
  "epochs": 10,
  "batch_size": 4,
  "network_dim": 8,
  "network_alpha": 4,
  "optimizer": "AdamW8bit"
}
```

### VRAM Requirements

| Configuration | Minimum VRAM | Typical Training Time (20 images) |
|---------------|--------------|-----------------------------------|
| SD 1.5, 512x512, batch 1 | 8 GB | 30-60 minutes |
| SDXL, 1024x1024, batch 1 | 16 GB | 2-4 hours |
| SDXL, 1024x1024, batch 2 | 24 GB | 1-2 hours |

**Note**: Training times assume GPU (NVIDIA RTX 3060 or better). CPU training is 50-100x slower and not recommended.

---

## Step-by-Step Training Workflow

### Step 1: Prepare Your Dataset

1. Create dataset directory:
   ```bash
   mkdir -p data/datasets/my-influencer
   ```

2. Add 20-50 high-quality images (1024x1024 recommended)

3. Create caption files:
   - Manual: Write `.txt` files matching each image filename
   - Auto: Use BLIP/CLIP tools, then review and edit
   - Include trigger word in every caption (e.g., "ohwx woman wearing red dress")

4. Verify dataset structure:
   ```bash
   ls data/datasets/my-influencer/
   # Should show: photo_001.png, photo_001.txt, photo_002.png, photo_002.txt, ...
   ```

### Step 2: Create Dataset Record via API

5. Register your dataset with the API:
   ```bash
   curl -X POST http://localhost:3001/datasets \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "kind": "lora-training",
       "path": "data/datasets/my-influencer",
       "meta": {
         "imageCount": 25,
         "resolution": "1024x1024",
         "triggerWord": "ohwx"
       }
     }'
   ```

   **Response**:
   ```json
   {
     "id": "ds_abc123",
     "kind": "lora-training",
     "path": "data/datasets/my-influencer",
     "status": "ready",
     "meta": { "imageCount": 25, "resolution": "1024x1024", "triggerWord": "ohwx" },
     "createdAt": "2025-01-15T10:30:00.000Z"
   }
   ```

   **Save the dataset ID** (`ds_abc123`) for the next step.

### Step 3: Create LoRA Configuration

6. Create a training configuration:
   ```bash
   curl -X POST http://localhost:3001/lora-configs \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "name": "my-influencer-v1",
       "description": "First training attempt for my virtual influencer",
       "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
       "epochs": 20,
       "learningRate": 0.0001,
       "batchSize": 2,
       "resolution": 1024,
       "networkDim": 16,
       "networkAlpha": 8,
       "outputPath": "data/loras/my-influencer-v1",
       "meta": {
         "triggerWord": "ohwx",
         "optimizer": "AdamW8bit",
         "lrScheduler": "cosine",
         "minSnrGamma": 5
       }
     }'
   ```

   **Response**:
   ```json
   {
     "id": "lc_xyz789",
     "name": "my-influencer-v1",
     "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
     "epochs": 20,
     "learningRate": 0.0001,
     "batchSize": 2,
     "resolution": 1024,
     "networkDim": 16,
     "networkAlpha": 8,
     "createdAt": "2025-01-15T10:35:00.000Z"
   }
   ```

   **Save the config ID** (`lc_xyz789`).

### Step 4: Start Training Job

7. Create a training job:
   ```bash
   curl -X POST http://localhost:3001/jobs \
     -H "Content-Type: application/json" \
     -H "x-tenant-id: tenant_demo" \
     -d '{
       "type": "lora-training",
       "payload": {
         "datasetId": "ds_abc123",
         "loraConfigId": "lc_xyz789"
       }
     }'
   ```

   **Response**:
   ```json
   {
     "id": "job_train123",
     "type": "lora-training",
     "status": "pending",
     "payload": {
       "datasetId": "ds_abc123",
       "loraConfigId": "lc_xyz789"
     },
     "createdAt": "2025-01-15T10:40:00.000Z"
   }
   ```

   **Save the job ID** (`job_train123`).

### Step 5: Monitor Training Progress

8. Check job status periodically:
   ```bash
   curl -X GET http://localhost:3001/jobs/job_train123 \
     -H "x-tenant-id: tenant_demo"
   ```

   **Status progression**:
   - `pending` - Job queued, waiting for worker
   - `running` - Training in progress
   - `completed` - Training finished successfully
   - `failed` - Training encountered an error

   **Response during training**:
   ```json
   {
     "id": "job_train123",
     "type": "lora-training",
     "status": "running",
     "payload": { ... },
     "result": {
       "progress": {
         "currentEpoch": 12,
         "totalEpochs": 20,
         "loss": 0.0234,
         "estimatedTimeRemaining": "45 minutes"
       }
     },
     "startedAt": "2025-01-15T10:41:00.000Z"
   }
   ```

9. View worker logs for detailed progress:
   ```bash
   docker compose -f infra/docker-compose.yml logs worker -f
   ```

   Look for output like:
   ```
   [2025-01-15 10:45:23] Epoch 1/20 - Loss: 0.0456
   [2025-01-15 10:50:12] Epoch 2/20 - Loss: 0.0389
   ...
   [2025-01-15 12:15:45] Training complete! Saved to data/loras/my-influencer-v1/
   ```

### Step 6: Validate Training Results

10. Once status is `completed`, check the result:
    ```bash
    curl -X GET http://localhost:3001/jobs/job_train123 \
      -H "x-tenant-id: tenant_demo"
    ```

    **Response**:
    ```json
    {
      "id": "job_train123",
      "status": "completed",
      "result": {
        "loraPath": "data/loras/my-influencer-v1/my-influencer-v1-final.safetensors",
        "checkpoints": [
          "my-influencer-v1-epoch-5.safetensors",
          "my-influencer-v1-epoch-10.safetensors",
          "my-influencer-v1-epoch-15.safetensors",
          "my-influencer-v1-final.safetensors"
        ],
        "finalLoss": 0.0123,
        "trainingTimeMinutes": 95
      },
      "finishedAt": "2025-01-15T12:15:00.000Z"
    }
    ```

11. Verify the output files exist:
    ```bash
    ls -lh data/loras/my-influencer-v1/
    # Should show .safetensors files (50-200 MB each)
    ```

### Step 7: Test LoRA in ComfyUI

12. Copy the final LoRA to ComfyUI:
    ```bash
    cp data/loras/my-influencer-v1/my-influencer-v1-final.safetensors \
       /path/to/ComfyUI/models/loras/
    ```

13. Load ComfyUI at `http://localhost:8188` and create a test workflow:
    - Add **Load Checkpoint** node → Select your base model (SDXL)
    - Add **Load LoRA** node → Select `my-influencer-v1-final.safetensors`
    - Set LoRA strength: `0.7` (start here, adjust 0.5-1.0)
    - Add **CLIP Text Encode (Positive)** → Enter prompt with trigger word

14. Test with various prompts:
    - `"ohwx woman in a studio portrait, professional lighting"`
    - `"ohwx woman on a beach at sunset, casual outfit"`
    - `"ohwx woman in winter clothes, snowy background"`

15. Evaluate quality:
    - ✅ Does it reproduce your influencer's appearance?
    - ✅ Does it work with different poses/contexts?
    - ✅ Is it flexible enough to follow new prompts?
    - ❌ If images look like exact copies: Overfitting (try earlier epoch checkpoint)
    - ❌ If appearance is inconsistent: Underfitting (train longer or adjust learning rate)

### Step 8: Iterate and Improve

16. If quality is insufficient:
    - Review dataset (remove low-quality images, add diversity)
    - Adjust parameters (lower learning rate for fine details, more epochs for better learning)
    - Try different epoch checkpoints (epoch 10 might be better than final epoch 20)

17. Once satisfied, integrate into production:
    - Update ComfyUI workflow templates to use your LoRA
    - Set default strength value (typically 0.6-0.8)
    - Configure trigger word in content generation prompts

18. Document your settings:
    - Save successful parameter configurations for future reference
    - Note which epoch worked best
    - Record trigger word and recommended strength

**Typical timeline**: First successful LoRA in 2-4 hours (including dataset preparation and training).

---

## Using Your LoRA in ComfyUI

### Loading LoRA Models

Once training is complete, integrate your LoRA into ComfyUI workflows for content generation:

1. **Add LoRA to ComfyUI**:
   - Copy `.safetensors` file to `ComfyUI/models/loras/`
   - Restart ComfyUI to detect new models
   - Model appears in LoRA Loader node dropdown

2. **Basic Workflow Setup**:
   ```
   Load Checkpoint → Load LoRA → CLIP Text Encode (Positive) → KSampler → VAE Decode → Save Image
   ```

3. **LoRA Loader Node Configuration**:
   - **lora_name**: Select your `my-influencer-v1-final.safetensors`
   - **strength_model**: `0.7` (controls image generation influence, range 0.0-1.0)
   - **strength_clip**: `0.7` (controls text understanding influence, range 0.0-1.0)

### Trigger Words and Prompts

Your trigger word activates the LoRA's learned concept. For best results:

**Effective Prompt Structure**:
```
"[TRIGGER_WORD] [subject description], [context/action], [style/quality modifiers]"
```

**Examples**:
- `"ohwx woman portrait, professional studio lighting, high quality, detailed"`
- `"ohwx woman walking on beach, sunset, casual summer dress, photorealistic"`
- `"ohwx woman in cafe, reading book, cozy atmosphere, natural lighting"`

**Tips**:
- Always include your trigger word at the start of the prompt
- Be specific about context, pose, and lighting
- Add quality modifiers: "high quality", "detailed", "photorealistic"

### Strength/Weight Adjustment

The `strength_model` parameter controls how strongly the LoRA influences the output:

| Strength | Effect | Use Case |
|----------|--------|----------|
| **0.3-0.5** | Subtle influence | Slight style hints, flexible interpretation |
| **0.6-0.8** | Balanced (recommended) | Clear character identity, accepts prompt variations |
| **0.9-1.0** | Maximum influence | Strong adherence to trained appearance, less flexibility |
| **> 1.0** | Overemphasized | Can cause artifacts, use cautiously for extreme effects |

**Pro tip**: Start at 0.7 and adjust based on results. Higher isn't always better—excessive strength can reduce prompt flexibility.

### Combining Multiple LoRAs

ComfyUI supports stacking multiple LoRAs for complex effects:

```
Load Checkpoint → Load LoRA (Character, 0.8) → Load LoRA (Style, 0.5) → CLIP Text Encode → KSampler
```

**Best practices**:
- Character LoRAs: Higher strength (0.7-0.9)
- Style LoRAs: Lower strength (0.3-0.6)
- Limit to 2-3 LoRAs to avoid conflicts
- Adjust strengths if results look "muddy" or conflicted

### Troubleshooting Integration Issues

| Problem | Solution |
|---------|----------|
| **LoRA not appearing in dropdown** | Verify file in correct directory, restart ComfyUI, check file extension is `.safetensors` |
| **Trigger word has no effect** | Increase `strength_clip`, verify trigger word spelling, check caption consistency during training |
| **Images look identical to training data** | Reduce `strength_model` to 0.5-0.6, check for overfitting (try earlier epoch checkpoint) |
| **Inconsistent character appearance** | Increase `strength_model` to 0.8-0.9, verify dataset had sufficient diversity during training |
| **Artifacts or distortions** | Lower strength below 0.7, check base model compatibility (SD 1.5 vs SDXL mismatch) |

**InfluencerAI Integration**: Your trained LoRAs are automatically available in the workflow templates. Configure default LoRA selection and strength in the n8n workflow settings (see [n8n Workflow Guide](06-n8n-workflow.md)).

---

## Common Pitfalls and Solutions

### Dataset Issues

> **Warning: Insufficient Dataset Size**
>
> **Problem**: Training with fewer than 10-15 images leads to poor generalization.
>
> **Symptoms**: Model only works with prompts very similar to training captions, fails on new contexts.
>
> **Solution**: Aim for 20-25 minimum. Quality > quantity: 20 diverse, high-quality images beat 50 mediocre ones.

---

> **Warning: Poor Caption Quality**
>
> **Problem**: Vague, inconsistent, or missing captions confuse the model about what to learn.
>
> **Symptoms**: LoRA produces random results, doesn't respond to trigger word, mixes unrelated concepts.
>
> **Solution**:
> - Be specific: "woman in red dress standing in park" not "woman outside"
> - Be consistent: Use similar phrasing across all captions
> - Include trigger word in EVERY caption
> - Review auto-generated captions manually—they miss important details

---

> **Warning: Near-Identical Images**
>
> **Problem**: Dataset contains 20+ photos from same photoshoot (same pose, lighting, outfit).
>
> **Symptoms**: Severe overfitting—LoRA outputs carbon copies of training images, ignores new prompts.
>
> **Prevention**:
> - Include diverse angles, expressions, poses
> - Vary lighting conditions and backgrounds
> - Mix indoor/outdoor, casual/formal contexts
> - A single duplicate-heavy batch can ruin an otherwise good dataset

---

### Training Configuration Issues

> **Warning: Wrong Resolution for Base Model**
>
> **Problem**: Training at 512x512 when using SDXL (native 1024x1024) or vice versa.
>
> **Symptoms**: Blurry outputs, poor detail, LoRA doesn't work well with base model.
>
> **Solution**:
> - **SD 1.5**: Train at 512x512
> - **SDXL**: Train at 1024x1024
> - Match your base model's native resolution

---

> **Warning: VRAM Out-of-Memory Errors**
>
> **Problem**: Batch size or resolution exceeds GPU memory capacity.
>
> **Symptoms**: Training crashes with "CUDA out of memory" or similar error.
>
> **Solution**:
> - Reduce batch size to 1
> - Lower resolution (1024 → 768 → 512)
> - Use AdamW8bit optimizer instead of AdamW
> - Enable gradient checkpointing (advanced)
> - Close other GPU-intensive applications

---

### Overfitting vs. Underfitting

> **Warning: Overfitting (Training Too Long)**
>
> **Problem**: Model memorizes training data instead of learning generalizable patterns.
>
> **Symptoms**:
> - Generated images look like exact copies of training photos
> - Model fails when prompted with new poses, contexts, or styles
> - Saturated colors, unnatural distortions
> - Artifacts appear at higher epoch counts
>
> **Solution**:
> - Use earlier epoch checkpoints (epoch 5-10 often better than epoch 20-30)
> - Reduce epochs (try 10-15 instead of 30)
> - Increase dataset diversity
> - Lower learning rate (3e-5 instead of 1e-4)
>
> **How to detect**: Test with prompt very different from training captions. If it fails completely, you've overfit.

---

> **Warning: Underfitting (Training Too Short)**
>
> **Problem**: Model hasn't learned enough to reproduce your concept consistently.
>
> **Symptoms**:
> - Output doesn't match trained character/style
> - Trigger word has minimal or no effect
> - Appearance varies wildly between generations
> - Generic results that could come from base model alone
>
> **Solution**:
> - Train for more epochs (increase from 10 to 20-30)
> - Increase learning rate (5e-5 to 1e-4)
> - Verify dataset quality (captions accurate? trigger word present?)
> - Check dataset size (need at least 15 images)
>
> **How to detect**: If shortening training makes results worse/more generic, you were underfit.

---

### LoRA Quality Issues

> **Warning: Network Dimension Too High**
>
> **Problem**: Setting Network Rank to 64, 128, or higher with no benefit.
>
> **Symptoms**: Massive file size (200+ MB), no visible quality improvement, longer training time.
>
> **Solution**:
> - Use Rank 16-32 for most cases
> - Rank 8 sufficient for simple concepts
> - Rank above 32 rarely improves quality and bloats file size

---

> **Warning: Ignoring Early Checkpoints**
>
> **Problem**: Only testing the final epoch model without reviewing intermediate checkpoints.
>
> **Symptoms**: Missing the "sweet spot" where model performs optimally (often epoch 10-15, not final).
>
> **Solution**:
> - Save checkpoints every 5 epochs
> - Test epoch 5, 10, 15, 20 before deciding on final model
> - Earlier epochs often generalize better despite higher "loss" values

---

### Production Integration Pitfalls

> **Warning: Forgetting Trigger Word in Production Prompts**
>
> **Problem**: ComfyUI workflow loads LoRA but doesn't include trigger word in generated prompts.
>
> **Symptoms**: LoRA has no visible effect, outputs look like base model alone.
>
> **Solution**:
> - Configure default trigger word in n8n workflow template
> - Add trigger word validation before generation
> - Document trigger word prominently in LoRA metadata

---

**Pro Tips for Success**:
- Start conservative: Lower learning rate, fewer epochs, review early checkpoints
- Test iteratively: Generate 5-10 test images at each checkpoint before full evaluation
- Document everything: Save parameter configurations that work for future reference
- Learn from failures: Every failed training teaches you about dataset quality and parameters

---

## Next Steps

Once you've successfully trained your first LoRA:

1. **API Integration** - Learn to automate training via API
   - See [API Reference](API-REFERENCE.md) for full endpoint documentation
   - Explore TypeScript SDK for programmatic access

2. **n8n Workflows** - Automate the entire pipeline
   - See [n8n Workflow Guide](06-n8n-workflow.md) for orchestration patterns
   - Configure automated training + generation + publishing workflows

3. **Advanced Topics** - Optimize your training
   - Multi-GPU training for faster iterations
   - Advanced parameter tuning for production quality
   - Batch processing multiple influencers

4. **Troubleshooting** - Get help when stuck
   - See [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
   - Check logs: `docker compose logs worker -f`
   - Review job status in the dashboard

5. **Production Deployment**
   - Integrate LoRAs into content generation workflows
   - Set up automated retraining schedules
   - Monitor model quality over time

---

## Related Documentation

- [Dataset Structure Guide](examples/datasets.md) - Detailed dataset organization
- [API Reference](API-REFERENCE.md) - Complete API documentation
- [Architecture Overview](../../architecture/panoramica.md) - System design
- [Quick Start](../../getting-started/avvio-rapido.md) - Initial setup
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

---

**Questions or Issues?**

If you encounter problems not covered in this guide:
1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review worker logs: `docker compose logs worker -f`
3. Verify prerequisites and environment configuration
4. Create an issue on GitHub with:
   - Training parameters used
   - Job ID and status
   - Error messages from logs
   - Dataset size and structure

Happy training! 🎨
