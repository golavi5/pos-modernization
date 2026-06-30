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

  return { formaspago, inventarios_precios, mov_totals };
}
