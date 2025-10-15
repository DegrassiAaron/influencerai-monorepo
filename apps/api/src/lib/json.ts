import { Prisma } from '@prisma/client';

function assertSupportedPrimitive(value: unknown): void {
  if (typeof value === 'bigint') {
    throw new TypeError('Cannot convert bigint value to JSON');
  }
  if (typeof value === 'symbol') {
    throw new TypeError('Cannot convert symbol value to JSON');
  }
  if (typeof value === 'function') {
    throw new TypeError('Cannot convert function value to JSON');
  }
}

function shouldOmitObjectEntry(value: unknown): boolean {
  return typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol';
}

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  assertSupportedPrimitive(value);

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
    if (shouldOmitObjectEntry(entry)) {
      return acc;
    }

    acc[key] = toInputJson(entry);
    return acc;
  }, {});
}
