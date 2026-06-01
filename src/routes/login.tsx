import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { login } from '@/features/auth/api';
import { loginSchema } from '@/features/auth/schemas';
import { useAuth } from '@/stores/auth';
import { isApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const searchSchema = z.object({
  redirect: z.string().optional(),
  prefillEmail: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (useAuth.getState().token) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

// Route files must export `Route` (a non component object), which inherently triggers Vite's Fast Refresh warning.
// This is a known TanStack Router constraint, not an oversight.
function LoginPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const { t } = useTranslation('auth');
  const [fields, setFields] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string[]; password?: string[] }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const VALIDATION_KEYS: Record<string, string> = {
    'Invalid email address': t('validation.invalidEmail'),
    'Password is required': t('validation.passwordRequired'),
  };

  function fieldError(msgs: string[] | undefined): string | undefined {
    const msg = msgs?.[0];
    return msg ? (VALIDATION_KEYS[msg] ?? msg) : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = loginSchema.safeParse(fields);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      await login(result.data);
      router.navigate({ to: search.redirect ?? '/' });
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
        ? err.message
        : t('loginFailed');
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('signIn')}</h1>

        {apiError && (
          <div
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" required>
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
              error={fieldError(fieldErrors.email)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" required>
              {t('password')}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={fields.password}
              onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
              error={fieldError(fieldErrors.password)}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="mt-2 w-full">
            {isLoading ? t('signingIn') : t('signIn')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('noAccount')}{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
