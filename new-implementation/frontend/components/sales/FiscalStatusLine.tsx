'use client';

import { useTranslations } from 'next-intl';
import { useFiscalStatus } from '@/hooks/useFiscalStatus';

/**
 * Electronic-document status on the receipt. Renders nothing when fiscal is not in
 * use for the sale or the status cannot be read: a fiscal problem must never get in
 * the way of closing a sale. Until a norm is cited for delivering the document before
 * validation (SPEC-FISC-003 §5, VERIFY), a pending document is shown as "pending validation".
 */
export function FiscalStatusLine({ orderId }: { orderId?: string | null }) {
  const t = useTranslations('sales.fiscal');
  const { data } = useFiscalStatus(orderId);
  if (!data || data.status === 'not_applicable') return null;

  return (
    <div className="bg-card rounded-xl border border-border w-full max-w-sm p-3 mb-6 text-xs space-y-1" data-testid="fiscal-status">
      <p className="font-semibold">{t('title')}</p>
      {data.status === 'pending' && <p className="text-muted-foreground">{t('pending')}</p>}
      {data.status === 'attention' && <p className="text-amber-500">{t('attention')}</p>}
      {data.status === 'validated' && (
        <>
          <p className="text-emerald-500">{t('validated')}</p>
          {data.number !== null && (
            <p className="text-muted-foreground">
              {t('number')}: {data.prefix ?? ''}
              {data.number}
            </p>
          )}
          {data.cufe && (
            <p className="text-muted-foreground break-all">
              {t('cufe')}: <span title={data.cufe}>{data.cufe}</span>
            </p>
          )}
          {/* VERIFY: the provider's QR payload; rendering it as an image needs a QR library (follow-up). */}
          {data.qr && (
            <p className="text-muted-foreground break-all">
              {t('qr')}:{' '}
              {/^https?:\/\//.test(data.qr) ? (
                <a href={data.qr} target="_blank" rel="noreferrer" className="underline">
                  {t('qrOpen')}
                </a>
              ) : (
                <span>{data.qr}</span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
