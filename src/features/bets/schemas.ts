import { z } from 'zod';

export const betStatusSchema = z.enum(['win', 'lost', 'canceled']);

export const betSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: betStatusSchema,
  createdAt: z.coerce.date(),
  winAmount: z.number().nullable(),
});

export const betsResponseSchema = z.object({
  data: z.array(betSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const placeBetSchema = z.object({
  amount: z.coerce.number().min(1),
});

export const placeBetResponseSchema = z.object({
  transactionId: z.string(),
  currency: z.string(),
  balance: z.number(),
  winAmount: z.number().nullable(),
});

export const cancelBetResponseSchema = z.object({
  transactionId: z.string(),
  balance: z.number(),
  currency: z.string(),
});

export const betFilterSchema = z.object({
  status: betStatusSchema.optional(),
  id: z.string().optional(),
  page: z.number(),
  limit: z.number(),
});

export type BetStatus = z.infer<typeof betStatusSchema>;
export type Bet = z.infer<typeof betSchema>;
export type BetsResponse = z.infer<typeof betsResponseSchema>;
export type PlaceBetInput = z.infer<typeof placeBetSchema>;
export type PlaceBetResponse = z.infer<typeof placeBetResponseSchema>;
export type CancelBetResponse = z.infer<typeof cancelBetResponseSchema>;
export type BetFilter = z.infer<typeof betFilterSchema>;
