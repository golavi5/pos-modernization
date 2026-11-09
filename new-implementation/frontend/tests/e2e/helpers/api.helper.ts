import type { APIRequestContext } from '@playwright/test';

export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface ApiSession {
  headers: { Authorization: string };
  companyId: string;
  userId: string;
}

export async function apiSession(request: APIRequestContext): Promise<ApiSession> {
  const login = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: 'admin@test.com', password: 'Fddm1ZDKTv3RbDpU' },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const me = await request.get(`${API_BASE_URL}/auth/me`, { headers });
  const { company_id, id } = (await me.json()) as { company_id: string; id: string };
  return { headers, companyId: company_id, userId: id };
}

export async function seedProduct(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; name: string; sku: string; session: ApiSession }> {
  const session = await apiSession(request);
  const uid = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const name = `E2E Producto ${uid}`;
  const sku = `E2E${uid}`;
  const res = await request.post(`${API_BASE_URL}/products`, {
    headers: session.headers,
    data: {
      name,
      sku,
      price: 15000,
      stock_quantity: 10,
      reorder_level: 1,
      tax_rate: 19,
      company_id: session.companyId,
      created_by: session.userId,
      is_active: true,
      ...overrides,
    },
  });
  if (!res.ok()) throw new Error(`seedProduct failed: ${res.status()} ${await res.text()}`);
  const { id } = (await res.json()) as { id: string };
  return { id, name, sku, session };
}
