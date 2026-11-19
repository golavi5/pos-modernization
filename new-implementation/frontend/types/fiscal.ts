/** Fiscal status of one sale, as shown on the receipt (`GET /fiscal/v1/sales/:orderId/status`). */
export type SaleFiscalStatus =
  | { status: 'not_applicable' }
  | { status: 'pending' | 'attention' }
  | { status: 'validated'; prefix: string | null; number: number | null; cufe: string | null; qr: string | null };
