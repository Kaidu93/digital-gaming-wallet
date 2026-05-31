import { z } from 'zod';

export const transactionTypeSchema = z.enum(['bet', 'win', 'cancel']);

export const transactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: transactionTypeSchema,
  createdAt: z.coerce.date(),
});

export const transactionsResponseSchema = z.object({
  data: z.array(transactionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const transactionFilterSchema = z.object({
  type: transactionTypeSchema.optional(),
  id: z.string().optional(),
  page: z.number(),
  limit: z.number(),
});

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionsResponse = z.infer<typeof transactionsResponseSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
