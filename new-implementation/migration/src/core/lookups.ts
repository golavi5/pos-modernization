import type { Pool } from 'mysql2/promise';

export async function loadLookups(p: Pool, legacy: string) {
  const formaspago = new Map<string, any>();
  for (const r of (await p.query<any[]>(`SELECT * FROM \`${legacy}\`.formaspago`))[0]) {
    formaspago.set(String(r.IdFormaPago), r);
  }

  // lowest IdLista price per product
  const inventarios_precios = new Map<string, any>();
  const [prices] = await p.query<any[]>(`SELECT ip.* FROM \`${legacy}\`.inventarios_precios ip
     JOIN (SELECT IdInventario, MIN(IdLista) lista FROM \`${legacy}\`.inventarios_precios GROUP BY IdInventario) m
       ON m.IdInventario = ip.IdInventario AND m.lista = ip.IdLista`);
  for (const r of prices) inventarios_precios.set(String(r.IdInventario), r);

  // per-order aggregate from lines
  const mov_totals = new Map<string, any>();
  const [tot] = await p.query<any[]>(`SELECT IdEncab,
      SUM(ValorSubTotal) subtotal, SUM(ValorIva) tax, SUM(ValorTotal) total
      FROM \`${legacy}\`.encabezados_mov GROUP BY IdEncab`);
  for (const r of tot) mov_totals.set(String(r.IdEncab), r);

  // emails shared by >1 cliente — the new schema's email is UNIQUE, so these get
  // disambiguated at map time (otherwise duplicates silently upsert onto each other).
  const clientesDupEmails = new Map<string, true>();
  const [dupEmails] = await p.query<any[]>(`SELECT LOWER(TRIM(Email)) e, COUNT(*) c
      FROM \`${legacy}\`.clientes WHERE Email IS NOT NULL AND TRIM(Email) <> ''
      GROUP BY e HAVING c > 1`);
  for (const r of dupEmails) clientesDupEmails.set(r.e, true);

  // barcodes shared by >1 inventario — products.barcode is UNIQUE (nullable). A non-unique
  // barcode is not a valid identifier, so duplicates are nulled at map time (multiple NULLs
  // are allowed) rather than colliding/upserting.
  const inventariosDupBarcodes = new Map<string, true>();
  const [dupBc] = await p.query<any[]>(`SELECT TRIM(CodigoBarras) b, COUNT(*) c
      FROM \`${legacy}\`.inventarios WHERE CodigoBarras IS NOT NULL AND TRIM(CodigoBarras) <> ''
      GROUP BY b HAVING c > 1`);
  for (const r of dupBc) inventariosDupBarcodes.set(r.b, true);

  return { formaspago, inventarios_precios, mov_totals, clientesDupEmails, inventariosDupBarcodes };
}
