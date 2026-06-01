import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { login, register } from '@/features/auth/api';
import { registerSchema } from '@/features/auth/schemas';
import { useAuth } from '@/stores/auth';
import { isApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (useAuth.getState().token) {
      throw redirect({ to: '/' });
    }
  },
  component: RegisterPage,
});

// Route files must export `Route` (a non component object), which inherently triggers Vite's Fast Refresh warning.
// This is a known TanStack Router constraint, not an oversight.
function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const VALIDATION_KEYS: Record<string, string> = {
    'Name is required': t('validation.nameRequired'),
    'Invalid email address': t('validation.invalidEmail'),
    'Password is required': t('validation.passwordRequired'),
    'Password must be at least 8 characters': t('validation.passwordMinLength'),
    'Please confirm your password': t('validation.confirmPasswordRequired'),
    'Passwords do not match': t('validation.passwordsMustMatch'),
  };

  function fieldError(msgs: string[] | undefined): string | undefined {
    const msg = msgs?.[0];
    return msg ? (VALIDATION_KEYS[msg] ?? msg) : undefined;
  }

  function setField(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = registerSchema.safeParse(fields);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      await register(result.data);

      try {
        await login({ email: result.data.email, password: result.data.password });
        router.navigate({ to: '/' });
      } catch {
        router.navigate({ to: '/login', search: { redirect: '/', prefillEmail: result.data.email } });
      }
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
        ? err.message
        : t('registrationFailed');
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('createAccount')}</h1>
          <LanguageSwitcher />
        </div>

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
            <Label htmlFor="name" required>
              {t('name')}
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={fields.name}
              onChange={setField('name')}
              error={fieldError(fieldErrors.name)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" required>
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={setField('email')}
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
              autoComplete="new-password"
              value={fields.password}
              onChange={setField('password')}
              error={fieldError(fieldErrors.password)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword" required>
              {t('confirmPassword')}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={setField('confirmPassword')}
              error={fieldError(fieldErrors.confirmPassword)}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="mt-2 w-full">
            {isLoading ? t('creatingAccount') : t('createAccount')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
