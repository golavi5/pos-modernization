/**
 * NIT / dígito de verificación (DV).
 *
 * Algoritmo: módulo 11 con ponderadores primos aplicados de derecha a izquierda
 * (3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71). Residuo 0 o 1 → DV
 * es el residuo; si no, DV = 11 - residuo.
 *
 * Fuente: DIAN, Orden Administrativa 0004 de 1989
 * (normograma.dian.gov.co/dian/compilacion/docs/orden_administrativa_dian_0004_1989.htm).
 * VERIFY: la página no pudo abrirse en esta sesión; el método fue contrastado con
 * el NIT público de la DIAN (800197268-4) y con fuentes secundarias que solo
 * listan ponderadores hasta 41. Los ponderadores 43..71 (NIT de más de 9
 * dígitos) vienen de la implementación de radian y NO están confirmados.
 * Portado de radian-dian/lib/utils/nit-helper.ts, sin adivinar el DV cuando
 * falta el guion.
 */
const WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function calculateDv(base: string): string {
  if (!/^\d{1,15}$/.test(base)) {
    throw new Error('NIT base must be 1-15 digits');
  }
  const sum = base
    .split('')
    .reverse()
    .reduce((acc, d, i) => acc + Number(d) * WEIGHTS[i], 0);
  const rem = sum % 11;
  return String(rem > 1 ? 11 - rem : rem);
}

/** Accepts "800.197.268-4" / "800197268-4". Returns null when the shape is wrong. */
export function splitNit(input: string): { base: string; dv: string } | null {
  const m = /^(\d{1,15})-(\d)$/.exec(input.replace(/[.\s]/g, ''));
  return m ? { base: m[1], dv: m[2] } : null;
}

export function isValidNit(input: string): boolean {
  const parts = splitNit(input);
  return parts !== null && calculateDv(parts.base) === parts.dv;
}
