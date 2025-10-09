Worker (BullMQ)

- Purpose: process queues `content-generation`, `video-generation` and `lora-training` and sync job status to the API.

Env variables
- `API_BASE_URL` or `WORKER_API_URL`: base URL of API (default `http://localhost:3001`).
- `REDIS_HOST` (default `localhost`), `REDIS_PORT` (default `6379`).
- `BULL_PREFIX`: optional Redis key prefix to isolate queues per env/test.
- `WORKER_JOB_ATTEMPTS`: number of attempts when enqueuing jobs from API (default 3; configured in API).
- `WORKER_JOB_BACKOFF_DELAY_MS`: backoff base delay for retries (default 5000; configured in API).
- `COMFYUI_API_URL`: base URL of ComfyUI REST server (default `http://127.0.0.1:8188`).
- `COMFYUI_CLIENT_ID`: identifier passed to ComfyUI prompt submissions (default `influencerai-worker`).
- `COMFYUI_TIMEOUT_MS`: HTTP timeout for ComfyUI requests (default `120000`).
- `COMFYUI_POLL_INTERVAL_MS`: delay between polling attempts for ComfyUI job status (default `5000`).
- `COMFYUI_MAX_POLL_ATTEMPTS`: max polling attempts before failing (default `120`).
- `COMFYUI_VIDEO_WORKFLOW_JSON`: optional JSON string merged into the prompt payload (e.g. serialized workflow graph).
- `FFMPEG_PATH`: path to ffmpeg binary (default `ffmpeg`).
- `FFMPEG_ASPECT_RATIO`: desired output aspect ratio (default `9:16`).
- `FFMPEG_AUDIO_FILTER`: ffmpeg audio filter applied during post-processing (default `loudnorm=I=-16:TP=-1.5:LRA=11`).
- `FFMPEG_VIDEO_PRESET`: ffmpeg preset for libx264 encoding (default `medium`).

Behavior
- On job start: PATCH `/jobs/:id` with `status=running`.
- On success: PATCH with `status=succeeded` and a result payload.
- On failure: PATCH with `status=failed` and error info.
- Lightweight internal retry is applied for PATCH requests.
- Video jobs submit prompts to ComfyUI, poll `/history/:promptId`, post-process the output with FFmpeg and upload the final MP4 to MinIO (signed URLs are attached to the job result).

Run locally
- Ensure Redis is running.
- Build SDK if not built: `pnpm --filter @influencerai/sdk build`.
- Dev: `pnpm --filter @influencerai/worker dev`.

Manual test with ComfyUI
1. Export the ComfyUI workflow graph you want to use and serialize it as JSON. Set the env var `COMFYUI_VIDEO_WORKFLOW_JSON` with that JSON string (or tailor the processor to inject node inputs downstream).
2. Start ComfyUI with the REST server enabled (default `http://127.0.0.1:8188`).
3. Run `pnpm --filter @influencerai/worker dev` and enqueue a `video-generation` job via the API (payload requires `caption`, `script`, optional persona/context/duration).
4. The worker logs the ComfyUI prompt id, polls until completion, then runs FFmpeg with the configured aspect ratio/audio filter.
5. Verify the processed video is uploaded to MinIO under `video-generation/<jobId>/final.mp4` and that the signed URL appears in the job result.
