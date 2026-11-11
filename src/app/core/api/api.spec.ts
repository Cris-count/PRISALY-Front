import { ApiErrorKind, toApiError } from './errors';
import { buildPath } from './path';
import { REDACTED, sanitize } from './sanitize';

describe('toApiError', () => {
  it('maps each documented status to its kind and keeps the server code', () => {
    const cases: readonly [number, ApiErrorKind][] = [
      [400, 'validation'], [401, 'unauthenticated'], [403, 'forbidden'], [404, 'not_found'],
      [409, 'conflict'], [500, 'server'], [501, 'not_implemented'],
    ];
    for (const [status, kind] of cases) {
      expect(toApiError(status, { code: 'X', message: 'm' })).toEqual({ kind, status, code: 'X', message: 'm' });
    }
  });

  it('never turns an unknown body into a success-like message', () => {
    expect(toApiError(502, '<html>')).toEqual({ kind: 'server', status: 502, code: null, message: 'El servidor respondió 502' });
  });
});

describe('sanitize', () => {
  it('hides tokens, passwords and codes at any depth but keeps descriptors', () => {
    const input = {
      accessToken: 'abc',
      tokenType: 'Bearer',
      nested: { password: 'p', codigo: '12345678', nombre: 'Ana' },
      list: [{ passwordHash: 'h' }],
    };
    expect(sanitize(input)).toEqual({
      accessToken: REDACTED,
      tokenType: 'Bearer',
      nested: { password: REDACTED, codigo: REDACTED, nombre: 'Ana' },
      list: [{ passwordHash: REDACTED }],
    });
  });
});

describe('buildPath', () => {
  it('encodes params and rejects missing ones', () => {
    expect(buildPath('/m4/sesiones/:sesionId/estado', { sesionId: 'a b' })).toBe('/m4/sesiones/a%20b/estado');
    expect(() => buildPath('/m4/sesiones/:sesionId', {})).toThrowError(/sesionId/);
  });
});
