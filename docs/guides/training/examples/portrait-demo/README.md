# Portrait Demo Dataset

Example dataset structure for LoRA training demonstrations.

## Overview

This directory demonstrates the correct structure for a LoRA training dataset. Due to repository size constraints, actual images are not included. Follow the instructions below to populate this dataset with your own images.

## Quick Setup

### Option 1: Use Free Stock Photos (Recommended)

Download 10-15 portrait photos from these Creative Commons sources:

1. **Unsplash** (CC0 License)
   - Search: https://unsplash.com/s/photos/portrait
   - Filter: People, Portrait, Professional
   - Download at least 1024x1024 resolution

2. **Pexels** (Free to use)
   - Search: https://www.pexels.com/search/portrait/
   - Choose diverse angles and expressions
   - Download high resolution

3. **Pixabay** (CC0 License)
   - Search: https://pixabay.com/images/search/portrait/
   - Filter by "People" category

### Option 2: Use Example URLs (For Testing)

See `example-captions.json` for a list of direct image URLs you can download programmatically.

## Dataset Structure

Once populated, your directory should look like this:

```
portrait-demo/
├── README.md                # This file
├── example-captions.json    # Caption examples in JSON format
├── image_001.png           # Portrait photo 1
├── image_001.txt           # Caption for image 1
├── image_002.png           # Portrait photo 2
├── image_002.txt           # Caption for image 2
├── image_003.png           # Portrait photo 3
├── image_003.txt           # Caption for image 3
├── ...
├── image_015.png           # Portrait photo 15
└── image_015.txt           # Caption for image 15
```

## Caption Format

Each `.txt` file should contain a single-line caption describing the image:

**Good captions** (describe context, not the subject):
```
ohwx woman wearing professional business suit in modern office, natural lighting
ohwx woman in casual summer dress at outdoor cafe, relaxed pose
ohwx woman with winter coat and scarf in snowy park, smiling
```

**Bad captions** (too vague or missing trigger word):
```
woman standing              # ❌ No trigger word, too vague
a person                    # ❌ No trigger word, not specific
beautiful woman with brown hair  # ❌ Describes features we want to TRAIN, not context
```

## Caption Guidelines

### Include in Captions
- ✅ Clothing and accessories (dress, suit, coat, hat)
- ✅ Location and background (office, park, beach, studio)
- ✅ Lighting conditions (natural light, studio lighting, golden hour)
- ✅ Pose and activity (standing, sitting, walking, reading)
- ✅ Mood and atmosphere (professional, casual, relaxed)
- ✅ **ALWAYS include your trigger word** (e.g., "ohwx woman")

### EXCLUDE from Captions
- ❌ Facial features (eyes, nose, lips - let the model learn these)
- ❌ Skin tone or ethnicity (model should learn this from images)
- ❌ Hairstyle specifics (if consistent across dataset)
- ❌ Body shape (if training a specific person)

The rule: Caption everything EXCEPT what you want the LoRA to learn as the "concept."

## Trigger Word

For this example dataset, we use **"ohwx woman"** as the trigger word. In production:

- Choose a unique, uncommon word (avoid "woman", "person", "character")
- Use consistent capitalization (all lowercase recommended)
- Popular choices: "ohwx", "sks", "znn", "xxz" + subject type
- Example: "ohwx influencer", "sks character", "myinf person"

## Image Requirements

### Resolution
- **Minimum**: 512x512 pixels
- **Recommended**: 1024x1024 pixels (for SDXL)
- **Format**: PNG or JPG (PNG preferred for quality)

### Quality Standards
- Sharp focus on subject (no blur)
- Good lighting (avoid extreme shadows or overexposure)
- Subject clearly visible (not obscured)
- Consistent quality across all images

### Diversity Requirements
- **Angles**: Front view, side profile, 3/4 view
- **Expressions**: Neutral, smiling, serious, laughing
- **Poses**: Standing, sitting, walking, close-up, full body
- **Contexts**: Indoor, outdoor, studio, natural environments
- **Lighting**: Natural light, studio, golden hour, soft/hard light

Aim for 15-25 diverse, high-quality images for first training attempt.

## Using This Dataset

### 1. Populate with Images

```bash
cd docs/guide/training/examples/portrait-demo

# Download example images (requires wget or curl)
wget -O image_001.png "https://source.unsplash.com/1024x1024/?portrait,professional"
wget -O image_002.png "https://source.unsplash.com/1024x1024/?portrait,casual"
# ... continue for 15 images
```

### 2. Create Caption Files

```bash
# Method 1: Manual (recommended for quality)
echo "ohwx woman wearing professional business suit in modern office, natural lighting" > image_001.txt
echo "ohwx woman in casual summer dress at outdoor cafe, relaxed pose" > image_002.txt
# ... continue for all images

# Method 2: Auto-caption with BLIP (requires Python + transformers)
python scripts/auto-caption.py --input . --trigger "ohwx woman"
```

### 3. Verify Dataset Structure

```bash
# Check file count (should have pairs)
ls -1 *.png | wc -l  # Count images
ls -1 *.txt | wc -l  # Count captions (should match)

# Verify caption format
head -n 1 image_*.txt
# Each should start with trigger word and describe context
```

### 4. Copy to Training Location

```bash
# Copy entire dataset to data/datasets/
cp -r . ../../../../../data/datasets/portrait-demo/

# Verify copy
ls -lh ../../../../../data/datasets/portrait-demo/
```

### 5. Start Training

Follow the [Getting Started Guide](../../GETTING-STARTED.md#step-by-step-training-workflow) to create a training job using this dataset.

## Example Training Configuration

Once your dataset is ready, use this configuration for first training:

```json
{
  "name": "portrait-demo-v1",
  "modelName": "stabilityai/stable-diffusion-xl-base-1.0",
  "datasetPath": "data/datasets/portrait-demo",
  "epochs": 20,
  "learningRate": 0.0001,
  "batchSize": 2,
  "resolution": 1024,
  "networkDim": 16,
  "networkAlpha": 8,
  "triggerWord": "ohwx",
  "outputPath": "data/loras/portrait-demo-v1"
}
```

## Expected Results

After training completes (1-2 hours for 15 images on RTX 3060):

- **Output**: `data/loras/portrait-demo-v1/portrait-demo-v1-final.safetensors` (~50-100 MB)
- **Checkpoints**: Epoch 5, 10, 15, 20 saved separately
- **Usage**: Load in ComfyUI with strength 0.6-0.8
- **Test prompts**:
  - `"ohwx woman in business attire, corporate office background"`
  - `"ohwx woman at beach during sunset, casual summer outfit"`
  - `"ohwx woman reading book in cozy library, warm lighting"`

## Troubleshooting

### Images Don't Download

If automated downloads fail:
1. Visit Unsplash/Pexels manually
2. Search for "portrait professional"
3. Download 15 images (1024x1024 minimum)
4. Rename to `image_001.png`, `image_002.png`, etc.
5. Create caption files manually

### Caption Quality Issues

If unsure about captions:
1. Use example-captions.json as template
2. Focus on clothing + location + lighting
3. Always include trigger word
4. Keep captions 1-2 sentences, descriptive

### Dataset Too Small

If you only have 10 images:
- Still trainable, but reduce epochs to 15
- Expect lower quality/flexibility
- Consider training at 512x512 to reduce VRAM needs
- Add more images when possible and retrain

## Legal and Ethical Considerations

- **Only use images you have rights to** (CC0, public domain, or own photos)
- **Respect privacy**: Don't train on photos of real people without consent
- **Avoid copyrighted content**: No celebrity photos, stock photos without license
- **Best practice**: Use your own photos or properly licensed stock images

For production influencers, commission or generate your own training images.

---

**Next Steps**:
- Populate this dataset with 15 portrait images
- Create caption files
- Follow [Getting Started Guide](../../GETTING-STARTED.md) to train your first LoRA
- Experiment with different configurations

Happy training! 🎨
