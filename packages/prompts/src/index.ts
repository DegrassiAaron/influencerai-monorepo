export const contentPlanPrompt = (persona: string, theme: string) => `
You are helping create a content plan for a virtual influencer with the following persona:
${persona}

Theme: ${theme}

Generate 3-5 post ideas with captions and hashtags suitable for Instagram, TikTok, and YouTube Shorts.
Return the response as a JSON array with this structure:
[
  {
    "caption": "engaging caption text",
    "hashtags": ["tag1", "tag2", "tag3"]
  }
]
`;

export const imageCaptionPrompt = (context: string) => `
Describe this image for AI image generation training. Be specific about:
- Subject appearance and pose
- Lighting and atmosphere
- Background and setting
- Style and mood

Context: ${context}

Provide a concise, detailed caption (max 77 tokens).
`;

export const videoScriptPrompt = (caption: string, duration: number) => `
Create a ${duration}-second video script for this social media post:
${caption}

Include:
- Opening hook (1-2 seconds)
- Main content beats
- Call to action

Format as timestamped beats.
`;
