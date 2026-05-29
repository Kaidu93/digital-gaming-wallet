import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1),
  VITE_WS_URL: z.string(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((i) => i.path.join("."))
    .join(", ");
  throw new Error(`Missing or invalid environment variables: ${missing}`);
}

const _env = parsed.data;

export const env = {
  API_BASE_URL: _env.VITE_API_BASE_URL,
  WS_URL: _env.VITE_WS_URL,
} as const;
