import { Prisma } from '@prisma/client';

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toInputJson(item)) as Prisma.JsonArray;
  }

  if (typeof value === 'object' && value !== null) {
    return toInputJsonObject(value as Record<string, unknown>);
  }

  return null;
}

export function toInputJsonObject(value: Record<string, unknown>): Prisma.JsonObject {
  return Object.entries(value).reduce<Prisma.JsonObject>((acc, [key, entry]) => {
    acc[key] = toInputJson(entry);
    return acc;
  }, {});
}
