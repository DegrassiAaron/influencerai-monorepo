declare module '@influencerai/sdk' {
  export type JobResponse = {
    id: string;
    [key: string]: unknown;
  };

  export class InfluencerAIClient {
    constructor(baseUrl?: string);
    updateJob(id: string, update: { status?: string; result?: unknown; costTok?: number }): Promise<void>;
    createJob(spec: unknown): Promise<JobResponse>;
  }
}

declare module '@influencerai/prompts' {
  export function imageCaptionPrompt(input: string): string;
  export function videoScriptPrompt(caption: string, durationSec: number): string;
}
