import { DianVerdict, DocumentStatus, EmitResult, EmissionTransientError } from '../emission.types';
import { STATES_REJECTED, STATE_ACCEPTED } from './plemsi.constants';

type Json = Record<string, unknown>;
/** What parsing can know; the adapter adds the send moment. */
export type ParsedEmit = Exclude<EmitResult, { outcome: 'submitted' }> | Omit<Extract<EmitResult, { outcome: 'submitted' }>, 'issuedAt'>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Parses a body that may be anything; returns null unless it is a JSON object. */
export function parseJsonObject(raw: string): Json | null {
  try {
    return obj(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Payload rejection = the provider refused the data itself (an `errCode`, or a
 * non-empty `data.errors`). Permanent: must not trigger contingency numbering.
 * Gateway errors, transport failures and 401 are not. Ported from ApiFacturame
 * (PlemsiPayloadRejectionExtensions / ElectResponse.IsPayloadRejection).
 */
export function payloadRejectionReason(body: Json | null): string | null {
  if (!body) return null;
  const data = obj(body.data);
  const errors = obj(data?.errors);
  const isRejection = !!str(body.errCode) || (!!errors && Object.keys(errors).length > 0);
  if (!isRejection) return null;
  return str(data?.message) ?? str(body.info) ?? str(body.errCode) ?? 'Rejected by provider';
}

/** DIAN's own verdict inside the provider response. `IsValid` arrives as the string "true"/"false". */
function dianVerdict(response: unknown): { verdict: DianVerdict; reason: string | null } {
  const d = obj(obj(response)?.data);
  const isValid = str(d?.IsValid)?.toLowerCase();
  if (isValid === 'true') return { verdict: 'accepted', reason: null };
  if (isValid !== 'false') return { verdict: 'pending', reason: null };
  const parts: string[] = [];
  const status = str(d?.StatusDescription);
  if (status) parts.push(status);
  // ErrorMessage may be {"string": [...]}, {"string": "..."}, a bare string or an array.
  const em = d?.ErrorMessage;
  const rules = obj(em) ? (em as Json).string : em;
  if (Array.isArray(rules)) parts.push(...rules.map(String).filter((s) => s.trim()));
  else if (rules !== undefined && rules !== null && obj(rules) === null) parts.push(String(rules));
  return { verdict: 'rejected', reason: parts.length ? parts.join(' | ') : null };
}

/** 2xx response of a POST emission. */
export function parseEmitResponse(body: Json | null): ParsedEmit {
  if (!body) throw new EmissionTransientError('Empty or non-JSON response from provider');
  const rejection = payloadRejectionReason(body);
  if (body.success !== true) {
    if (rejection) return { outcome: 'payload_rejected', reason: rejection };
    throw new EmissionTransientError('Provider answered success=false without a rejection envelope');
  }
  const data = obj(body.data);
  const { verdict, reason } = dianVerdict(data?.response);
  return { outcome: 'submitted', cude: str(data?.cude), qr: str(data?.QRCode), verdict, reason };
}

/** Client-error statuses that mean "this request will never work as sent". */
const PERMANENT_STATUSES = [400, 409, 422];

/**
 * Non-2xx: a payload rejection if the body says so, otherwise transient. A 400/409/422
 * with a JSON `success:false` and a message is also permanent even without `errCode`:
 * the sandbox answers a resolution of the wrong document type with
 * `400 {"success":false,"info":"Given resolution is not available","errCode":""}`.
 */
export function parseEmitHttpError(status: number, raw: string): ParsedEmit {
  const body = parseJsonObject(raw);
  const reason = payloadRejectionReason(body) ?? (PERMANENT_STATUSES.includes(status) && body?.success === false ? str(body.info) : null);
  if (reason) return { outcome: 'payload_rejected', reason };
  throw new EmissionTransientError(`Provider HTTP ${status}`, status);
}

/** `GET .../one`: `Emitted` is accepted, `Error`/`Deleted` rejected, anything else still pending. */
export function parseStatusResponse(body: Json | null): DocumentStatus {
  const data = obj(body?.data);
  if (!data) throw new EmissionTransientError('Empty or non-JSON status response');
  const state = str(data.state);
  const { reason } = dianVerdict(data.response);
  const verdict: DianVerdict = state === STATE_ACCEPTED ? 'accepted' : state && STATES_REJECTED.includes(state) ? 'rejected' : 'pending';
  return { verdict, cude: str(data.cude), qr: str(data.QRStr), preview: str(data.preview), reason };
}
