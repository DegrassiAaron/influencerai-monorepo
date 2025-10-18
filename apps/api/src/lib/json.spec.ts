import type { JsonObject, JsonValue } from '@prisma/client/runtime/library';
import { toInputJson, toInputJsonObject } from './json';

type IsAny<T> = 0 extends 1 & T ? true : false;

describe('toInputJson helpers', () => {
  it('converts supported primitives without modification', () => {
    expect(toInputJson('value')).toBe('value');
    expect(toInputJson(42)).toBe(42);
    expect(toInputJson(true)).toBe(true);
    expect(toInputJson(null)).toBeNull();
  });

  it('converts dates and nested structures to Prisma-compatible JSON', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const result = toInputJson({ foo: date, nested: { arr: [1, 'two'] } });

    expect(result).toEqual({
      foo: date.toISOString(),
      nested: { arr: [1, 'two'] },
    });
  });

  it('skips undefined-like object entries while preserving other fields', () => {
    const fn = () => 'noop';
    const obj = toInputJsonObject({
      keep: 'value',
      dropUndefined: undefined,
      dropFunction: fn,
      dropSymbol: Symbol('token'),
      nested: { count: 1 },
    });

    expect(obj).toEqual({ keep: 'value', nested: { count: 1 } });
  });

  it('throws when encountering unsupported values', () => {
    expect(() => toInputJson(1n)).toThrow(TypeError);
    expect(() => toInputJson(Symbol('x'))).toThrow(TypeError);
    expect(() => toInputJson({ count: 1n })).toThrow(TypeError);
  });

  it('enforces Prisma.InputJsonValue typings', () => {
    const value = toInputJson({ count: 1 });
    const ensureAssignable: JsonValue = value;
    void ensureAssignable;
    type ValueIsAny = IsAny<typeof value>;
    const ensureNotAny: ValueIsAny extends true ? never : true = true;
    void ensureNotAny;
  });

  it('builds JsonObject structures', () => {
    const obj = toInputJsonObject({ name: 'demo', flag: false });
    const ensureAssignable: JsonObject = obj;
    void ensureAssignable;
    expect(obj).toEqual({ name: 'demo', flag: false });
  });
});
