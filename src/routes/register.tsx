import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { login, register } from '@/features/auth/api';
import { registerSchema } from '@/features/auth/schemas';
import { useAuth } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setApiError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">Create account</h1>

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
              Name
            </Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={fields.name}
              onChange={setField('name')}
              error={fieldErrors.name?.[0]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={setField('email')}
              error={fieldErrors.email?.[0]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={fields.password}
              onChange={setField('password')}
              error={fieldErrors.password?.[0]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword" required>
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={setField('confirmPassword')}
              error={fieldErrors.confirmPassword?.[0]}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="mt-2 w-full">
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
