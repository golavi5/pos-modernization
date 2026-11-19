import { EmissionTransientError } from '../emission.types';
import { parseEmitHttpError, parseEmitResponse, parseJsonObject, parseStatusResponse } from './plemsi.response';

/** Contract cases ported from ApiFacturame Test/PlemsiPayloadRejectionTests.cs. */
const dvBody = JSON.stringify({
  code: 500,
  success: false,
  info: 'Something went wrong',
  data: { message: 'Dígito de verificación no corresponde al número de identificación suministrado', errors: { 'customer.dv': ['x'] } },
  errCode: 'EFVE014',
});
const rejected = (reason: string) => ({ outcome: 'payload_rejected', reason });

describe('non-2xx responses', () => {
  it('validation rejection is a payload rejection with data.message', () => {
    expect(parseEmitHttpError(500, dvBody)).toEqual(rejected('Dígito de verificación no corresponde al número de identificación suministrado'));
  });
  it('resolution unavailable (errCode, plain-string data) falls back to info', () => {
    const body = JSON.stringify({ code: 400, success: false, info: 'Given resolution is not available', data: 'nope', errCode: 'EFVE003' });
    expect(parseEmitHttpError(400, body)).toEqual(rejected('Given resolution is not available'));
  });
  it('errors block without errCode is a payload rejection', () => {
    const body = JSON.stringify({ success: false, info: 'x', data: { message: 'El municipio no existe', errors: { municipality_id: ['bad'] } } });
    expect(parseEmitHttpError(422, body)).toEqual(rejected('El municipio no existe'));
  });
  it('errCode without message falls back to info', () => {
    expect(parseEmitHttpError(500, JSON.stringify({ success: false, info: 'Something went wrong', errCode: 'E1' }))).toEqual(rejected('Something went wrong'));
  });
  it('a 400 with a message but an EMPTY errCode (seen in the sandbox) is permanent too', () => {
    const body = JSON.stringify({ code: 400, success: false, info: 'Given resolution is not available', errCode: '' });
    expect(parseEmitHttpError(400, body)).toEqual(rejected('Given resolution is not available'));
  });
  it('but 401, 429 and 5xx with a message stay transient, and so does a 400 without a message', () => {
    for (const status of [401, 429, 500, 503]) {
      expect(() => parseEmitHttpError(status, JSON.stringify({ success: false, info: 'x', errCode: '' }))).toThrow(EmissionTransientError);
    }
    expect(() => parseEmitHttpError(400, JSON.stringify({ success: false, errCode: '' }))).toThrow(EmissionTransientError);
  });
  it.each([
    [502, '<html>Bad Gateway</html>'],
    [503, ''],
    [504, '   '],
  ])('gateway failure %s is transient, not a rejection', (status, raw) => {
    expect(() => parseEmitHttpError(status, raw)).toThrow(EmissionTransientError);
  });
  it('401 unauthenticated is transient', () => {
    expect(() => parseEmitHttpError(401, JSON.stringify({ success: false, info: 'Unauthenticated.' }))).toThrow(EmissionTransientError);
  });
  it('non-JSON body is transient', () => {
    expect(() => parseEmitHttpError(500, 'boom')).toThrow(EmissionTransientError);
  });
});

describe('2xx responses', () => {
  it('validation envelope with success=false is a payload rejection', () => {
    const body = parseJsonObject(JSON.stringify({ code: 200, success: false, info: 'i', data: { message: 'm', errors: { a: ['b'] } }, errCode: 'E' }));
    expect(parseEmitResponse(body)).toEqual(rejected('m'));
  });
  it('errCode only falls back to info', () => {
    expect(parseEmitResponse({ success: false, info: 'inf', errCode: 'E' })).toEqual(rejected('inf'));
  });
  it('plain failure without envelope is transient', () => {
    expect(() => parseEmitResponse({ success: false, info: 'nope' })).toThrow(EmissionTransientError);
  });
  it('null body is transient', () => {
    expect(() => parseEmitResponse(null)).toThrow(EmissionTransientError);
  });
  it('successful emission, verdict not attached yet, is pending', () => {
    expect(parseEmitResponse({ success: true, data: { cude: 'abc', QRCode: 'qr' } })).toEqual({
      outcome: 'submitted', cude: 'abc', qr: 'qr', verdict: 'pending', reason: null,
    });
  });
  it('IsValid "true" is accepted', () => {
    const r = parseEmitResponse({ success: true, data: { cude: 'abc', response: { data: { IsValid: 'true' } } } });
    expect(r).toMatchObject({ outcome: 'submitted', verdict: 'accepted' });
  });
  it('DIAN rejection (success=true, IsValid "false") is submitted+rejected with rules joined', () => {
    const r = parseEmitResponse({
      success: true,
      data: { cude: 'abc', response: { data: { IsValid: 'False', StatusDescription: 'Rechazado', ErrorMessage: { string: ['FAU06 x', 'DEAS01b y'] } } } },
    });
    expect(r).toEqual({ outcome: 'submitted', cude: 'abc', qr: null, verdict: 'rejected', reason: 'Rechazado | FAU06 x | DEAS01b y' });
  });
  it.each([
    ['bare string', 'regla suelta', 'regla suelta'],
    ['array', ['r1', 'r2'], 'r1 | r2'],
    ['{string: "x"}', { string: 'solo' }, 'solo'],
  ])('ErrorMessage as %s', (_n, em, expected) => {
    const r = parseEmitResponse({ success: true, data: { response: { data: { IsValid: 'false', ErrorMessage: em } } } });
    expect(r).toMatchObject({ verdict: 'rejected', reason: expected });
  });
});

describe('status (/one)', () => {
  it.each([
    ['Emitted', 'accepted'],
    ['Error', 'rejected'],
    ['Deleted', 'rejected'],
    ['Pending', 'pending'],
  ])('state %s -> %s', (state, verdict) => {
    expect(parseStatusResponse({ data: { state, cude: 'c', QRStr: 'q', preview: 'p' } })).toMatchObject({ verdict, cude: 'c', qr: 'q', preview: 'p' });
  });
  it('reads the rejection text from data.response', () => {
    const s = parseStatusResponse({ data: { state: 'Error', response: { data: { IsValid: 'false', StatusDescription: 'Rechazado' } } } });
    expect(s.reason).toBe('Rechazado');
  });
  it('missing data is transient', () => {
    expect(() => parseStatusResponse({})).toThrow(EmissionTransientError);
  });
});
