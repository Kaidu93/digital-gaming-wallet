import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/auth';
import { placeBet } from '@/features/bets/api';
import { placeBetSchema } from '@/features/bets/schemas';
import { isApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatEuro } from '@/lib/format';
import { useLocale } from '@/i18n';
import { cn } from '@/lib/utils';

type BetResult = { outcome: 'win'; winAmount: number } | { outcome: 'loss' };

export function PlaceBetForm() {
  const balance = useAuth((s) => s.balance);
  const setBalance = useAuth((s) => s.setBalance);
  const queryClient = useQueryClient();
  const { t } = useTranslation('bets');
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotion();

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
        .min(1, t('minimumBet'))
        .max(balance, t('exceedsBalance', { amount: formatEuro(balance, locale) })),
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
      if (isApiError(err) && err.status === 401) return;
      const message = isApiError(err) ? err.message : err instanceof Error ? err.message : t('failedToPlaceBet');
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
            {t('betAmount')}
          </Label>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t('available', { amount: formatEuro(balance, locale) })}
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
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || balance <= 0}
          className="w-full"
        >
          {isSubmitting ? t('placingBet') : t('placeBet')}
        </Button>
        {apiError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {apiError}
          </p>
        )}
        <AnimatePresence>
          {result && (
            <motion.div
              key={result.outcome}
              role="status"
              initial={shouldReduceMotion ? { opacity: 0 } : result.outcome === 'win' ? { opacity: 0, scale: 0.95 } : { opacity: 0 }}
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : result.outcome === 'win'
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, x: [0, -5, 5, -3, 3, 0] }
              }
              exit={{ opacity: 0 }}
              transition={
                result.outcome === 'win' && !shouldReduceMotion
                  ? { type: 'spring', stiffness: 280, damping: 22 }
                  : { duration: shouldReduceMotion ? 0.1 : 0.35 }
              }
              className={cn(
                'rounded-md px-4 py-3 text-center text-sm font-medium',
                result.outcome === 'win'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-gray-600 dark:bg-red-900/20 dark:text-gray-400',
              )}
            >
              {result.outcome === 'win'
                ? t('youWon', { amount: formatEuro(result.winAmount, locale) })
                : t('betterLuckNextTime')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
