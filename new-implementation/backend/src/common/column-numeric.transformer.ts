import { ValueTransformer } from 'typeorm';

/**
 * MySQL devuelve DECIMAL como string para no perder precisión, y TypeORM lo
 * entrega tal cual. En JS eso hace que `0 + "25000.00"` CONCATENE en vez de
 * sumar: la caja mostraba Total $25.000 sobre una venta de $29.750
 * (dry-run 2026-08-11, D7). Este transformer normaliza en el borde del ORM,
 * así que ningún consumidor tiene que defenderse.
 *
 * `to` es identidad: al escribir, el driver acepta el número.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
