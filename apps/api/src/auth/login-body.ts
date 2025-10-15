import { z } from 'zod';

const LoginRequestSchema = z
  .object({
    email: z.unknown().optional(),
    password: z.unknown().optional(),
    magic: z.unknown().optional(),
  })
  .passthrough();

export interface NormalizedLoginBody {
  email: string;
  password: string;
  magic: string;
}

export function normalizeLoginBody(body: unknown): NormalizedLoginBody {
  const parsed = LoginRequestSchema.safeParse(body);
  const candidate = parsed.success ? parsed.data : {};
  const normalizeField = (value: unknown): string => {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }
    return '';
  };

  return {
    email: normalizeField(candidate.email),
    password: normalizeField(candidate.password),
    magic: normalizeField(candidate.magic),
  };
}
