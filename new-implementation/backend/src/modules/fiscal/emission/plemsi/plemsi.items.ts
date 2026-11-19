import { EmissionLine } from '../emission.types';
import {
  ALLOWANCE_REASON_DISCOUNT,
  BAG_ITEM_CODE,
  ITEM_TYPE_BAG,
  ITEM_TYPE_STANDARD,
  TAX_ID_BAG,
  TAX_ID_IVA,
  UNIT_MEASURE_ID,
} from './plemsi.constants';

/** Whole pesos by truncation, as the provider integration does. VERIFY truncation vs rounding. The 1e-6 pass absorbs float noise (999.9999999 -> 1000). */
export const toInt = (n: number): number => Math.trunc(Math.round(n * 1e6) / 1e6);
const quantity = (q: number): number => Number(q.toFixed(6));
const pct = (n: number): number => Number(n.toFixed(2));

export interface PlemsiTaxTotal {
  tax_id: number;
  percent: number;
  tax_amount: number;
  taxable_amount: number;
  per_unit_amount?: number;
  base_unit_measure?: number;
  unit_measure_id?: number;
}

export interface PlemsiItem {
  unit_measure_id: number;
  line_extension_amount: number;
  free_of_charge_indicator: boolean;
  allowance_charges?: {
    charge_indicator: boolean;
    allowance_charge_reason: string;
    multiplier_factor_numeric: number;
    amount: number;
    base_amount: number;
  }[];
  tax_totals: PlemsiTaxTotal[];
  description: string;
  code: string;
  type_item_identification_id: number;
  price_amount: number;
  base_quantity: number;
  invoiced_quantity: number;
}

/** Discount shape "case B": line_extension_amount and taxable_amount stay NET (case A was rejected by DIAN rule FAU06, observed in Plemsi sandbox 2026-11-03 per ApiFacturame). */
function allowances(line: EmissionLine): PlemsiItem['allowance_charges'] {
  if (line.bagTax || line.grossSubtotal === undefined) return undefined;
  const base = toInt(line.grossSubtotal);
  const amount = toInt(line.grossSubtotal - line.subtotal);
  if (amount <= 0) return undefined;
  return [
    {
      charge_indicator: false,
      allowance_charge_reason: ALLOWANCE_REASON_DISCOUNT,
      multiplier_factor_numeric: base === 0 ? 0 : pct((amount / base) * 100),
      amount,
      base_amount: base,
    },
  ];
}

export function buildItems(lines: EmissionLine[]): PlemsiItem[] {
  return lines.map((l): PlemsiItem => {
    const q = quantity(l.quantity);
    if (l.bagTax) {
      return {
        unit_measure_id: UNIT_MEASURE_ID,
        invoiced_quantity: q,
        line_extension_amount: 0,
        free_of_charge_indicator: true,
        tax_totals: [
          {
            tax_id: TAX_ID_BAG,
            percent: 0,
            tax_amount: toInt(l.bagTax.total),
            taxable_amount: 0,
            unit_measure_id: UNIT_MEASURE_ID,
            per_unit_amount: toInt(l.bagTax.perUnit),
            base_unit_measure: 1,
          },
        ],
        description: l.description,
        code: BAG_ITEM_CODE,
        type_item_identification_id: ITEM_TYPE_BAG,
        price_amount: toInt(l.bagTax.perUnit),
        base_quantity: q,
      };
    }
    return {
      unit_measure_id: UNIT_MEASURE_ID,
      line_extension_amount: toInt(l.subtotal),
      free_of_charge_indicator: false,
      allowance_charges: allowances(l),
      tax_totals: [{ tax_id: TAX_ID_IVA, percent: l.ivaRate, tax_amount: toInt(l.ivaAmount), taxable_amount: toInt(l.subtotal) }],
      description: l.description,
      code: l.code,
      type_item_identification_id: ITEM_TYPE_STANDARD,
      price_amount: toInt(l.unitPrice),
      base_quantity: q,
      invoiced_quantity: q,
    };
  });
}

/** One header tax total per IVA rate used by the lines (DIAN rules DEAS01b/DEAU06 as observed by ApiFacturame), then bag tax, then exempt base. */
export function buildAllTaxTotals(lines: EmissionLine[]): PlemsiTaxTotal[] {
  const out: PlemsiTaxTotal[] = [];
  const taxed = lines.filter((l) => !l.bagTax && l.ivaRate > 0);
  const rates = [...new Set(taxed.map((l) => l.ivaRate))].sort((a, b) => a - b);
  for (const rate of rates) {
    const g = taxed.filter((l) => l.ivaRate === rate);
    const tax = g.reduce((s, l) => s + l.ivaAmount, 0);
    const base = g.reduce((s, l) => s + l.subtotal, 0);
    if (tax > 0 || base > 0) out.push({ tax_id: TAX_ID_IVA, percent: rate, tax_amount: toInt(tax), taxable_amount: toInt(base) });
  }
  const bags = lines.filter((l) => l.bagTax);
  const bagTotal = bags.reduce((s, l) => s + (l.bagTax?.total ?? 0), 0);
  if (bagTotal > 0) {
    out.push({
      tax_id: TAX_ID_BAG,
      percent: 0,
      tax_amount: toInt(bagTotal),
      taxable_amount: 0,
      unit_measure_id: UNIT_MEASURE_ID,
      per_unit_amount: toInt(bags[bags.length - 1].bagTax!.perUnit),
      base_unit_measure: 1,
    });
  }
  const exempt = lines.filter((l) => !l.bagTax && l.ivaRate === 0).reduce((s, l) => s + l.subtotal, 0);
  if (exempt > 0) out.push({ tax_id: TAX_ID_IVA, percent: 0, tax_amount: 0, taxable_amount: toInt(exempt) });
  return out;
}

export interface HeaderTotals {
  allowanceTotal: number;
  invoiceBaseTotal: number;
  invoiceTaxExclusiveTotal: number;
  invoiceTaxInclusiveTotal: number;
  totalToPay: number;
}

/** base = sum of line_extension_amount (FAU06); the discount is per line only, so allowanceTotal is 0. */
export function buildHeaderTotals(lines: EmissionLine[]): HeaderTotals {
  const inclusive = toInt(lines.reduce((s, l) => s + l.total, 0));
  return {
    allowanceTotal: 0,
    invoiceBaseTotal: lines.reduce((s, l) => s + (l.bagTax ? 0 : toInt(l.subtotal)), 0),
    invoiceTaxExclusiveTotal: toInt(lines.reduce((s, l) => s + (l.bagTax ? 0 : l.subtotal), 0)),
    invoiceTaxInclusiveTotal: inclusive,
    totalToPay: inclusive,
  };
}
