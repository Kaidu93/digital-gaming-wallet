import { z } from 'zod';
import { api } from '@/lib/api';

export class ZodParseError extends Error {
  readonly issues: z.core.$ZodIssue[];
  readonly received: unknown;

  constructor(issues: z.core.$ZodIssue[], received: unknown) {
    super(`API response failed schema validation: ${JSON.stringify(issues)}`);
    this.name = 'ZodParseError';
    this.issues = issues;
    this.received = received;
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('[zodFetch] Schema mismatch', { issues: result.error.issues, received: data });
    throw new ZodParseError(result.error.issues, data);
  }
  return result.data;
}

export const zodFetch = {
  get: <T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> =>
    api.get<unknown>(path, options).then((data) => parseOrThrow(schema, data)),

  post: <T>(path: string, schema: z.ZodType<T>, body?: unknown, options?: RequestInit): Promise<T> =>
    api.post<unknown>(path, body, options).then((data) => parseOrThrow(schema, data)),

  delete: <T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> =>
    api.delete<unknown>(path, options).then((data) => parseOrThrow(schema, data)),
};
