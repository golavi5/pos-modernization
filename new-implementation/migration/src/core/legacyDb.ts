import type { Pool } from 'mysql2/promise';
import { deterministicId } from './idMap.js';

export async function resolveTenant(
  p: Pool,
  legacy: string,
): Promise<{ companyId: string; bootstrapUserId: string }> {
  const [emp] = await p.query<any[]>(
    `SELECT IdEmpresa FROM \`${legacy}\`.empresas ORDER BY IdEmpresa LIMIT 1`,
  );
  if (!emp.length) throw new Error('no empresas row found — cannot resolve tenant');
  const [usr] = await p.query<any[]>(
    `SELECT IdUsuario FROM \`${legacy}\`.usuarios ORDER BY IdUsuario LIMIT 1`,
  );
  return {
    companyId: deterministicId('empresas', String(emp[0].IdEmpresa)),
    bootstrapUserId: usr.length
      ? deterministicId('usuarios', String(usr[0].IdUsuario))
      : deterministicId('empresas', String(emp[0].IdEmpresa)),
  };
}
