import { spawn } from 'child_process';

type LogFn = (...args: any[]) => void;

export type LoggerLike = {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
};

export type FfmpegRunner = {
  aspectRatio: string;
  audioFilter: string;
  preset: string;
  run: (input: {
    inputPath: string;
    outputPath: string;
    aspectRatio: string;
    audioFilter: string;
    preset: string;
  }) => Promise<void>;
};

export function buildAspectRatioFilter(aspectRatio: string): string {
  const [wStr, hStr] = aspectRatio.split(':');
  const width = Number(wStr);
  const height = Number(hStr);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'scale=-2:1080:force_original_aspect_ratio=decrease,setsar=1';
  }
  const ratio = width / height;
  let targetWidth: number;
  let targetHeight: number;
  if (ratio >= 1) {
    targetWidth = 1920;
    targetHeight = Math.round(targetWidth / ratio);
  } else {
    targetHeight = 1920;
    targetWidth = Math.round(targetHeight * ratio);
  }
  targetWidth = Math.max(2, Math.round(targetWidth / 2) * 2);
  targetHeight = Math.max(2, Math.round(targetHeight / 2) * 2);
  return `scale=${targetWidth}:-2:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
}

export function createFfmpegRunner(logger: LoggerLike): FfmpegRunner {
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const aspectRatio = process.env.FFMPEG_ASPECT_RATIO || '9:16';
  const audioFilter = process.env.FFMPEG_AUDIO_FILTER || 'loudnorm=I=-16:TP=-1.5:LRA=11';
  const preset = process.env.FFMPEG_VIDEO_PRESET || 'medium';

  return {
    aspectRatio,
    audioFilter,
    preset,
    run: ({ inputPath, outputPath, aspectRatio: ar, audioFilter: af, preset: pr }) =>
      new Promise<void>((resolve, reject) => {
        const args = [
          '-y',
          '-i',
          inputPath,
          '-vf',
          buildAspectRatioFilter(ar),
          '-af',
          af,
          '-c:v',
          'libx264',
          '-preset',
          pr,
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          outputPath,
        ];

        logger.info({ args }, 'Running FFmpeg post-processing');

        const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';

        proc.stderr?.on('data', (chunk) => {
          stderr += chunk.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            if (stderr.trim()) {
              logger.info({ stderr: stderr.trim() }, 'FFmpeg completed with diagnostics');
            }
            resolve();
          } else {
            logger.error({ code, stderr: stderr.trim() }, 'FFmpeg failed');
            reject(new Error(`FFmpeg exited with code ${code ?? -1}`));
          }
        });

        proc.on('error', (err) => {
          logger.error({ err }, 'Unable to start FFmpeg');
          reject(err);
        });
      }),
  };
}
