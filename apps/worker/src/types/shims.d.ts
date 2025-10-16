// Minimal shims to satisfy TypeScript for third-party and workspace imports
declare module '@influencerai/prompts' {
  export const contentPlanPrompt: (persona: string, theme: string) => string;
  export const imageCaptionPrompt: (context: string) => string;
  export const videoScriptPrompt: (caption: string, duration: number) => string;
}

declare module '@aws-sdk/client-s3' {
  // minimal types used by this worker
  export class S3Client {
    constructor(opts?: any);
    send(command: any): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(opts?: any);
  }
  export class GetObjectCommand {
    constructor(opts?: any);
  }
}

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(
    client: any,
    command: any,
    opts?: { expiresIn?: number } | { expiresInSeconds?: number } | any
  ): Promise<string>;
}
