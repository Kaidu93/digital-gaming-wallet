import { zodFetch } from '@/lib/zodFetch';
import {
  betsResponseSchema,
  cancelBetResponseSchema,
  placeBetResponseSchema,
  type BetFilter,
  type BetsResponse,
  type CancelBetResponse,
  type PlaceBetResponse,
} from './schemas';

export async function placeBet(amount: number): Promise<PlaceBetResponse> {
  return zodFetch.post('/bet', placeBetResponseSchema, { amount });
}

export async function getBets(filters: BetFilter): Promise<BetsResponse> {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });

  if (filters.status !== undefined) params.set('status', filters.status);
  if (filters.id !== undefined) params.set('id', filters.id);

  return zodFetch.get(`/my-bets?${params}`, betsResponseSchema);
}

export async function cancelBet(id: string): Promise<CancelBetResponse> {
  return zodFetch.delete(`/my-bet/${id}`, cancelBetResponseSchema);
}
