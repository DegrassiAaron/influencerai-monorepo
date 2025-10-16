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
- `WORKER_BULL_BOARD_USER` / `WORKER_BULL_BOARD_PASSWORD`: credentials required to expose the Bull Board UI.
- `WORKER_MONITOR_PORT`: port for the monitoring server (default `3031`).
- `WORKER_MONITOR_HOST`: interface for the monitoring server (default `0.0.0.0`).
- `WORKER_ALERT_WEBHOOK_URL`: optional HTTP endpoint notified after consecutive job failures.
- `WORKER_ALERT_FAILURE_THRESHOLD`: failure streak length before triggering the webhook (default `3`).
- `BULL_BOARD_PORT`: port for the Bull Board dashboard and metrics server (default `3030`).
- `BULL_BOARD_HOST`: host interface for the monitoring server (default `0.0.0.0`).
- `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD`: optional basic auth credentials for Bull Board.
- `WORKER_METRICS_PREFIX`: prefix used for Prometheus metrics (default `influencerai_worker_`).
- `ALERT_WEBHOOK_URL`: optional webhook URL notified after consecutive job failures.
- `ALERT_FAILURE_THRESHOLD`: number of consecutive failures before triggering the webhook (default `3`).

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

## Monitoring & metrics

- The worker exposes Bull Board and a Prometheus `/metrics` endpoint on `http://<BULL_BOARD_HOST>:<BULL_BOARD_PORT>`.
- Configure basic auth by setting `BULL_BOARD_USER` and `BULL_BOARD_PASSWORD`.
- Prometheus metrics cover queue depth (`*_queue_jobs_waiting`), failures (`*_queue_jobs_failed`) and job duration histogram (`*_job_duration_seconds`).
- Set `ALERT_WEBHOOK_URL` (e.g. an n8n or Slack webhook) to receive JSON payloads when `ALERT_FAILURE_THRESHOLD` consecutive failures occur on a queue.

Manual test with ComfyUI

1. Export the ComfyUI workflow graph you want to use and serialize it as JSON. Set the env var `COMFYUI_VIDEO_WORKFLOW_JSON` with that JSON string (or tailor the processor to inject node inputs downstream).
2. Start ComfyUI with the REST server enabled (default `http://127.0.0.1:8188`).
3. Run `pnpm --filter @influencerai/worker dev` and enqueue a `video-generation` job via the API (payload requires `caption`, `script`, optional persona/context/duration).
4. The worker logs the ComfyUI prompt id, polls until completion, then runs FFmpeg with the configured aspect ratio/audio filter.
5. Verify the processed video is uploaded to MinIO under `video-generation/<jobId>/final.mp4` and that the signed URL appears in the job result.

## Manual test for LoRA training

1. Prepare a minimal dataset directory with a couple of sample images and note its absolute path.
2. Configure the worker with `LORA_TRAINING_DRY_RUN=1` (or enqueue a job with `{ dryRun: true }`) to validate the command without executing kohya_ss.
3. Enqueue a `lora-training` job specifying the dataset path and desired output directory. Include a `trainingName` to make the output folder deterministic.
4. Tail the worker logs: you should see the rendered kohya_ss command preview together with throttled progress updates.
5. Inspect the job via the API: the result payload includes the command preview, the resolved output directory and the streamed log excerpts, confirming the orchestration is wired correctly.

## Monitoring & alerting

- Provide `WORKER_BULL_BOARD_USER` and `WORKER_BULL_BOARD_PASSWORD` to start the embedded monitoring server automatically.
- The Bull Board UI is available at `http://<WORKER_MONITOR_HOST>:<WORKER_MONITOR_PORT>/bull-board` and requires HTTP basic auth.
- Prometheus metrics are served at `/metrics`, exposing queue counts (`worker_queue_jobs`) and job duration histograms (`worker_job_duration_seconds`).
- When `WORKER_ALERT_WEBHOOK_URL` is set, the worker posts a JSON payload to that endpoint after the configured number of consecutive failures (default 3). The streak resets on the next successful completion.
