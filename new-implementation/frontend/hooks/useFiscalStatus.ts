import { useQuery } from '@tanstack/react-query';
import { fiscalApi } from '@/lib/api/fiscal';

const POLL_MS = 3000;

/** Fiscal status of a sale. Polls while the document is still waiting for DIAN; stops on any other answer. */
export function useFiscalStatus(orderId?: string | null) {
  return useQuery({
    queryKey: ['fiscal-status', orderId],
    queryFn: () => fiscalApi.getSaleStatus(orderId as string),
    enabled: !!orderId,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? POLL_MS : false),
  });
}
