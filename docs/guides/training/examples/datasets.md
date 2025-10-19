# Dataset Structure Guide

Complete guide to organizing and preparing datasets for LoRA training in InfluencerAI.

---

## Overview

A properly structured dataset is critical for successful LoRA training. This guide covers file organization, naming conventions, image requirements, caption format, and best practices.

---

## Directory Structure

### Basic Structure

```
data/datasets/<dataset-name>/
├── image_001.png       # Image file
├── image_001.txt       # Caption file (same name as image)
├── image_002.png
├── image_002.txt
├── image_003.png
├── image_003.txt
├── ...
├── image_025.png
└── image_025.txt
```

**Key Requirements**:
- One directory per dataset
- Each image must have a corresponding caption file with identical filename
- Images and captions in the same directory
- Consistent naming scheme (e.g., `image_001`, `image_002`, not mixed formats)

### Alternative Caption Format (JSON)

Some workflows support a single JSON manifest:

```
data/datasets/<dataset-name>/
├── captions.json       # Single file with all captions
├── image_001.png
├── image_002.png
├── image_003.png
├── ...
└── image_025.png
```

**captions.json format**:
```json
{
  "image_001.png": "ohwx woman wearing professional suit in office, natural lighting",
  "image_002.png": "ohwx woman in casual dress at outdoor cafe, relaxed pose",
  "image_003.png": "ohwx woman with winter coat in snowy park, walking pose"
}
```

**Note**: Individual `.txt` files are more compatible with kohya_ss and recommended for InfluencerAI.

---

## Naming Conventions

### Recommended Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| **Sequential numbers** | `img_001.png`, `img_002.png`, ... | General purpose, easy sorting |
| **Descriptive names** | `portrait_front.png`, `portrait_side.png` | Small datasets, manual curation |
| **Category prefix** | `studio_001.png`, `outdoor_001.png` | Organized by context/type |
| **Original filenames** | `DSC_1234.jpg`, `IMG_5678.jpg` | Preserving source names |

**Best Practice**: Use sequential numbering (`image_001`, `image_002`) with zero-padding for datasets > 10 images.

### What to Avoid

- ❌ Spaces in filenames (`my image 001.png`)
- ❌ Special characters (`image#1.png`, `photo@studio.jpg`)
- ❌ Mixed naming schemes (`img1.png`, `image_002.png`, `photo003.jpg`)
- ❌ Very long filenames (keep under 50 characters)

**Why**: Some tools (including kohya_ss) have issues with non-alphanumeric characters or spaces.

---

## Image Requirements

### File Formats

**Supported**:
- PNG (recommended - lossless, preserves quality)
- JPG/JPEG (acceptable - some compression artifacts)
- WebP (supported but less common)

**Not Supported**:
- GIF (no animation support)
- BMP (inefficient file size)
- TIFF (not typically supported by training tools)

### Resolution Requirements

| Base Model | Recommended Resolution | Minimum Resolution |
|------------|----------------------|-------------------|
| **SD 1.5** | 512x512 | 512x512 (native) |
| **SDXL** | 1024x1024 | 1024x1024 (native) |
| **Custom** | Match model's native training resolution | At least 512x512 |

**Important**:
- Train at the base model's native resolution for best results
- All images should be the same resolution within a dataset
- Rectangular images are supported but square is recommended

### Image Quality Standards

**Required Quality**:
- ✅ Sharp focus on subject (no motion blur)
- ✅ Good lighting (subject clearly visible)
- ✅ Minimal noise or compression artifacts
- ✅ Subject not obscured or cropped awkwardly

**Diversity Requirements**:
- ✅ Multiple angles (front, side, 3/4 view)
- ✅ Various expressions (neutral, smiling, serious)
- ✅ Different poses and contexts
- ✅ Varied lighting conditions
- ❌ Avoid: Near-identical duplicates (causes overfitting)
- ❌ Avoid: Extreme variations that confuse the model

### Dataset Size Guidelines

| Purpose | Minimum Images | Optimal Images | Maximum Images |
|---------|---------------|----------------|----------------|
| **Character/Face** | 15 | 20-30 | 50 |
| **Style Training** | 30 | 50-100 | 200+ |
| **Concept Training** | 20 | 30-50 | 100 |

**Rule of Thumb**: Start with 20-25 high-quality, diverse images. Add more only if needed.

---

## Caption Format

### Caption File Structure

Each caption file (`.txt`) contains a single line of text:

```
ohwx woman wearing professional business suit in modern office, natural lighting
```

**Format Rules**:
- One line per file (no newlines)
- UTF-8 encoding
- Plain text (no formatting, no markdown)
- Typically 10-50 words
- MUST include trigger word

### Effective Caption Structure

```
[TRIGGER_WORD] [subject] [clothing/appearance], [location/context], [lighting/mood], [additional details]
```

**Examples**:

**Good Captions**:
```
ohwx woman in red evening gown, luxury hotel ballroom, soft chandelier lighting
ohwx woman wearing casual jeans and white t-shirt, urban street, golden hour sunlight
ohwx woman in business suit, corporate office background, professional studio lighting
```

**Bad Captions**:
```
woman standing                                    # ❌ No trigger word, too vague
beautiful woman with brown hair and blue eyes    # ❌ Describes features to TRAIN, not context
a person                                         # ❌ No trigger word, not specific
ohwx                                             # ❌ Only trigger word, no context
```

### What to Include in Captions

**DO Caption**:
- ✅ Clothing and accessories
- ✅ Location and background
- ✅ Lighting conditions
- ✅ Pose and activity
- ✅ Mood and atmosphere
- ✅ Camera angle (if relevant: "close-up", "full body")

**DON'T Caption** (features the model should learn):
- ❌ Facial features (eyes, nose, lips)
- ❌ Skin tone or ethnicity
- ❌ Hairstyle (if consistent across dataset)
- ❌ Body shape (if training specific person)
- ❌ Age, gender (if consistent)

**Principle**: Caption everything EXCEPT what you want the LoRA to learn as the core concept.

### Trigger Word Selection

Your trigger word activates the trained LoRA. Choose carefully:

**Good Trigger Words**:
- ✅ Unique, uncommon words (`ohwx`, `sks`, `znn`, `xxz`)
- ✅ Nonsense syllables unlikely in normal prompts
- ✅ Combined with subject type (`ohwx woman`, `sks character`)
- ✅ Consistent capitalization (all lowercase recommended)

**Bad Trigger Words**:
- ❌ Common words (`woman`, `person`, `character`)
- ❌ Existing concepts (`celebrity`, `model`, `influencer`)
- ❌ Multi-word phrases (`my custom character`)
- ❌ Special characters (`@mychar`, `#influencer`)

**Examples**:
- `ohwx woman` - Good (unique + subject)
- `sks influencer` - Good (unique + subject)
- `myinf person` - Good (unique + generic subject)
- `woman` - Bad (too common, conflicts with base model)

---

## Dataset Preparation Workflow

### Step 1: Gather Source Images

**Option 1: Use Your Own Photos**
- Take 20-30 photos with varied angles, lighting, contexts
- Use good quality camera (smartphone OK if 12MP+)
- Ensure consistent subject across all images
- Avoid extreme variations (same person, not different people)

**Option 2: Stock Photos (CC0/Public Domain)**

Recommended sources:
- **Unsplash**: https://unsplash.com (CC0 License)
- **Pexels**: https://www.pexels.com (Free to use)
- **Pixabay**: https://pixabay.com (CC0 License)
- **Wikimedia Commons**: https://commons.wikimedia.org (Various licenses, check each)

**Legal Note**: Only use images you have rights to. Don't train on copyrighted photos without permission.

**Option 3: Generated Images**
- Use Stable Diffusion to generate consistent character images
- Requires careful prompting for consistency
- Good for fictional characters, not real people

### Step 2: Process and Organize Images

1. **Create dataset directory**:
   ```bash
   mkdir -p data/datasets/my-influencer
   cd data/datasets/my-influencer
   ```

2. **Resize images to target resolution**:
   ```bash
   # Using ImageMagick
   for img in *.jpg; do
     convert "$img" -resize 1024x1024^ -gravity center -extent 1024x1024 "processed_$img"
   done

   # Using Python (PIL/Pillow)
   python scripts/resize_images.py --input . --output . --size 1024
   ```

3. **Rename to sequential format**:
   ```bash
   # Using bash
   counter=1
   for img in processed_*.jpg; do
     mv "$img" "image_$(printf "%03d" $counter).jpg"
     counter=$((counter + 1))
   done
   ```

4. **Convert to PNG (optional but recommended)**:
   ```bash
   for img in *.jpg; do
     convert "$img" "${img%.jpg}.png"
     rm "$img"
   done
   ```

### Step 3: Create Captions

**Option A: Manual Captioning (Recommended for Quality)**
```bash
# Create caption files manually
echo "ohwx woman wearing professional suit in office, natural lighting" > image_001.txt
echo "ohwx woman in casual dress at cafe, relaxed pose" > image_002.txt
# ... continue for all images
```

**Option B: Auto-Captioning with BLIP**

Install dependencies:
```bash
pip install transformers pillow torch
```

Create `scripts/auto_caption.py`:
```python
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
import os
import sys

# Load BLIP model
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

dataset_path = sys.argv[1] if len(sys.argv) > 1 else "."
trigger_word = sys.argv[2] if len(sys.argv) > 2 else "ohwx woman"

# Process each image
for filename in sorted(os.listdir(dataset_path)):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        image_path = os.path.join(dataset_path, filename)
        image = Image.open(image_path).convert("RGB")

        # Generate caption
        inputs = processor(image, return_tensors="pt")
        output = model.generate(**inputs, max_new_tokens=50)
        caption = processor.decode(output[0], skip_special_tokens=True)

        # Prepend trigger word
        final_caption = f"{trigger_word}, {caption}"

        # Save caption file
        caption_filename = os.path.splitext(filename)[0] + ".txt"
        caption_path = os.path.join(dataset_path, caption_filename)
        with open(caption_path, 'w', encoding='utf-8') as f:
            f.write(final_caption)

        print(f"Captioned: {filename} -> {final_caption}")
```

Run:
```bash
python scripts/auto_caption.py data/datasets/my-influencer "ohwx woman"
```

**Option C: Template Captions**

For quick testing:
```bash
# Create simple template captions
for i in {001..025}; do
  echo "ohwx woman portrait, professional photography, high quality" > "image_$i.txt"
done
```

**Note**: Template captions work for basic testing but reduce model quality. Manual or BLIP captions are much better.

### Step 4: Verify Dataset Structure

```bash
cd data/datasets/my-influencer

# Check image count
ls -1 *.png | wc -l

# Check caption count (should match image count)
ls -1 *.txt | wc -l

# Verify each image has a caption
for img in *.png; do
  caption="${img%.png}.txt"
  if [ ! -f "$caption" ]; then
    echo "Missing caption: $caption"
  fi
done

# Sample captions to verify trigger word presence
head -n 1 *.txt | grep "ohwx"
```

### Step 5: Register Dataset via API

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

---

## Example Datasets

### Portrait Dataset

**Purpose**: Train consistent character appearance for virtual influencer

**Structure**:
- 25 images, 1024x1024, PNG
- Trigger word: `ohwx woman`
- Diverse angles, expressions, contexts
- Consistent lighting quality

**Caption Style**:
```
ohwx woman wearing elegant evening dress at upscale restaurant, warm ambient lighting
ohwx woman in casual jeans and sweater at home library, soft natural window light
ohwx woman wearing business suit in modern office, professional lighting
```

### Style Dataset

**Purpose**: Train specific art style (e.g., oil painting, watercolor)

**Structure**:
- 50-100 images, 1024x1024
- Trigger word: `xyzoil style` (unique + descriptive)
- Varied subjects (portraits, landscapes, still life)
- Consistent artistic technique

**Caption Style**:
```
xyzoil style painting of mountain landscape, vibrant colors, impressionist brushwork
xyzoil style portrait of elderly man, dramatic lighting, rich textures
xyzoil style still life with fruits and flowers, classical composition
```

### Concept Dataset

**Purpose**: Train specific object or concept (e.g., custom product, logo)

**Structure**:
- 30 images, 512x512
- Trigger word: `abcproduct item`
- Multiple views and contexts
- Consistent object identity

**Caption Style**:
```
abcproduct item on white background, product photography, studio lighting
abcproduct item in modern kitchen setting, natural environment, soft daylight
abcproduct item held in hand, lifestyle context, outdoor lighting
```

---

## External Resources

### Dataset Sources

- **Civitai**: https://civitai.com/tag/dataset - Community-shared training datasets
- **HuggingFace Datasets**: https://huggingface.co/datasets - Large-scale image datasets
- **Unsplash Collections**: https://unsplash.com/collections - Curated photo collections

### Auto-Captioning Tools

- **BLIP**: https://github.com/salesforce/BLIP - Image captioning model
- **CLIP Interrogator**: https://huggingface.co/spaces/pharma/CLIP-Interrogator - Reverse engineer prompts
- **WD14 Tagger**: https://huggingface.co/SmilingWolf/wd-v1-4-moat-tagger-v2 - Anime/booru-style tagging

### Image Processing Tools

- **ImageMagick**: https://imagemagick.org - Command-line image processing
- **Python PIL/Pillow**: https://pillow.readthedocs.io - Python image library
- **GIMP**: https://www.gimp.org - Free image editor (GUI)

---

## Common Mistakes and Solutions

### Mistake 1: Inconsistent Image Sizes

**Problem**: Dataset contains mixed resolutions (512x512, 768x768, 1024x1024).

**Solution**: Resize all images to target resolution before training:
```bash
python scripts/resize_images.py --input data/datasets/my-influencer --size 1024
```

### Mistake 2: Missing or Mismatched Captions

**Problem**: `image_003.png` exists but `image_003.txt` is missing.

**Solution**: Verify with script:
```bash
for img in data/datasets/my-influencer/*.png; do
  caption="${img%.png}.txt"
  [ ! -f "$caption" ] && echo "Missing: $caption"
done
```

### Mistake 3: Trigger Word Inconsistency

**Problem**: Some captions use `ohwx woman`, others use `ohwx`, some forget entirely.

**Solution**: Validate captions:
```bash
grep -L "ohwx" data/datasets/my-influencer/*.txt
# Lists caption files missing trigger word
```

### Mistake 4: Near-Duplicate Images

**Problem**: 20 photos from same photoshoot (same pose, lighting, outfit).

**Solution**: Manually review dataset, remove duplicates, ensure diversity:
- Different angles (front, side, 3/4)
- Different expressions
- Different contexts/backgrounds
- Different lighting conditions

### Mistake 5: Poor Caption Quality

**Problem**: Captions like "a woman" or "photo of a person in a room".

**Solution**: Be specific:
- **Bad**: "woman in room"
- **Good**: "ohwx woman wearing red cocktail dress in luxury hotel suite, warm evening lighting"

---

## Advanced Topics

### Multi-Concept Datasets

Train multiple concepts in one LoRA by organizing subdirectories:

```
data/datasets/multi-concept/
├── concept_a/
│   ├── image_001.png
│   ├── image_001.txt  # "cpta woman ..."
│   └── ...
└── concept_b/
    ├── image_001.png
    ├── image_001.txt  # "cptb style ..."
    └── ...
```

Each subdirectory has a unique trigger word (`cpta`, `cptb`).

### Regularization Images

Prevent overfitting by including generic images:

```
data/datasets/with-regularization/
├── training/          # Your specific concept
│   ├── image_001.png
│   └── ...
└── regularization/    # Generic examples
    ├── reg_001.png
    └── ...
```

Use 2-5x regularization images compared to training images.

### Data Augmentation

Increase dataset size artificially:
- Horizontal flip (careful: breaks text/logos)
- Slight rotation (±5 degrees)
- Color jitter (brightness, contrast, saturation)
- Cropping variations

**Note**: Augmentation is built into kohya_ss - usually not needed manually.

---

## Next Steps

Once your dataset is ready:

1. **Register Dataset**: See [API Reference](../API-REFERENCE.md#create-dataset)
2. **Create Config**: See [Getting Started](../GETTING-STARTED.md#step-3-create-lora-configuration)
3. **Start Training**: See [Getting Started](../GETTING-STARTED.md#step-4-start-training-job)
4. **Troubleshoot**: See [Troubleshooting Guide](../TROUBLESHOOTING.md) if issues arise

---

**Questions?**
- Check [Getting Started Guide](../GETTING-STARTED.md) for complete workflow
- Review [API Reference](../API-REFERENCE.md) for programmatic dataset management
- See [portrait-demo README](portrait-demo/README.md) for working example

Happy dataset preparation! 📸
