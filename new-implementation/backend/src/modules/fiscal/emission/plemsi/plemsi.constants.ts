/**
 * Codes and values ported from ApiFacturame (C#, DianPayloadBuilder.cs), where they
 * run in production against Plemsi. Every one is VERIFY against the DIAN anexo
 * tables (v1.9, Res. 165/2023) before it is relied on as a regulatory fact.
 */
export const UNIT_MEASURE_ID = 70; // VERIFY
export const TAX_ID_IVA = 1; // VERIFY
export const TAX_ID_BAG = 10; // VERIFY: impuesto a las bolsas
export const ITEM_TYPE_STANDARD = 1; // VERIFY: type_item_identification_id
export const ITEM_TYPE_BAG = 4; // VERIFY
export const BAG_ITEM_CODE = 'BOLSA';
export const ALLOWANCE_REASON_DISCOUNT = 'Descuento general';
/** Cash, immediate. VERIFY: payment_form_id / payment_method_id / duration_measure. */
export const DEFAULT_PAYMENT = { payment_form_id: 1, payment_method_id: 10, duration_measure: '30' } as const;
export const COLOMBIA_TZ = 'America/Bogota'; // UTC-5, no DST

/** Provider hosts per environment. VERIFY against Plemsi's docs; no per-tenant URL on purpose (SSRF). */
export const PLEMSI_BASE_URL = {
  sandbox: 'https://pruebas.plemsi.com',
  production: 'https://api.plemsi.com',
} as const;
export type PlemsiEnvironment = keyof typeof PLEMSI_BASE_URL;

/** Plemsi `/one` states. */
export const STATE_ACCEPTED = 'Emitted';
export const STATES_REJECTED = ['Error', 'Deleted'];

export const REQUEST_TIMEOUT_MS = 30_000;
