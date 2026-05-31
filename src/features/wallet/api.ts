import { zodFetch } from '@/lib/zodFetch';
import { transactionsResponseSchema, type TransactionFilter, type TransactionsResponse } from './schemas';

export async function getTransactions(filters: TransactionFilter): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });

  if (filters.type !== undefined) params.set('type', filters.type);
  if (filters.id !== undefined) params.set('id', filters.id);

  return zodFetch.get(`/my-transactions?${params}`, transactionsResponseSchema);
}
