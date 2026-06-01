import { useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';
import { placeBet } from '@/features/bets/api';
import { placeBetSchema } from '@/features/bets/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';

type BetResult = { outcome: 'win'; winAmount: number } | { outcome: 'loss' };

export function PlaceBetForm() {
  const balance = useAuth((s) => s.balance);
  const setBalance = useAuth((s) => s.setBalance);
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [apiError, setApiError] = useState<string | undefined>();
  const [result, setResult] = useState<BetResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setApiError(undefined);

    const schema = placeBetSchema.extend({
      amount: z.coerce
        .number()
        .min(1, 'Minimum bet is €1')
        .max(balance, `Cannot exceed your balance of ${formatEuro(balance)}`),
    });

    const parsed = schema.safeParse({ amount });

    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.amount?.[0]);
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await placeBet(parsed.data.amount);
      setBalance(response.balance);
      await queryClient.invalidateQueries({ queryKey: ['my-bets'] });
      await queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      setAmount('');

      if (response.winAmount !== null && response.winAmount > 0) {
        setResult({ outcome: 'win', winAmount: response.winAmount });
      } else {
        setResult({ outcome: 'loss' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place bet';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-3">
        <div>
          <Label htmlFor="bet-amount" required>
            Bet amount
          </Label>
          <p className="mt-0.5 text-xs text-gray-500">
            Available: {formatEuro(balance)}
          </p>
        </div>
        <Input
          id="bet-amount"
          type="number"
          min="1"
          step="0.01"
          max={balance}
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(undefined);
            setResult(null);
          }}
          error={error}
          disabled={isSubmitting}
        />
        {apiError && (
          <p className="text-sm text-red-600" role="alert">
            {apiError}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || balance <= 0}
          className="w-full"
        >
          {isSubmitting ? 'Placing bet…' : 'Place bet'}
        </Button>
        {result && (
          <div
            role="status"
            className={cn(
              'rounded-md px-4 py-3 text-sm font-medium',
              result.outcome === 'win'
                ? 'bg-green-50 text-green-800'
                : 'bg-gray-50 text-gray-600',
            )}
          >
            {result.outcome === 'win'
              ? `You won ${formatEuro(result.winAmount)}!`
              : 'Better luck next time!'}
          </div>
        )}
      </div>
    </form>
  );
}
