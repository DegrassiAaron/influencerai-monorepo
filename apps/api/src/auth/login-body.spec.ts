import { normalizeLoginBody } from './login-body';

describe('normalizeLoginBody', () => {
  it('converts primitives to strings and falls back to empty strings', () => {
    expect(normalizeLoginBody({ email: 'test@example.com', password: 123, magic: null })).toEqual({
      email: 'test@example.com',
      password: '123',
      magic: 'null',
    });
  });

  it('defaults missing fields to empty strings', () => {
    expect(normalizeLoginBody(undefined)).toEqual({ email: '', password: '', magic: '' });
  });

  it('serializes objects and dates consistently', () => {
    const now = new Date('2024-01-02T03:04:05.678Z');
    const normalized = normalizeLoginBody({
      email: now,
      password: { nested: true },
      magic: [1, 'two'],
    });

    expect(normalized).toEqual({
      email: now.toISOString(),
      password: JSON.stringify({ nested: true }),
      magic: JSON.stringify([1, 'two']),
    });
  });

  it('ignores extra properties to keep DTO focused', () => {
    const normalized = normalizeLoginBody({ email: 'a@b', password: 'pw', magic: 'm', extra: 'field' });
    expect(normalized).toEqual({ email: 'a@b', password: 'pw', magic: 'm' });
  });
});
