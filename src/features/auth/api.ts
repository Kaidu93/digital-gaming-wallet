import { zodFetch } from '@/lib/zodFetch';
import { useAuth } from '@/stores/auth';
import {
  loginResponseSchema,
  registerResponseSchema,
  type LoginInput,
  type LoginResponse,
  type RegisterInput,
  type RegisterResponse,
} from './schemas';

export async function login(payload: LoginInput): Promise<LoginResponse> {
  const response = await zodFetch.post('/login', loginResponseSchema, payload);
  useAuth.getState().login({
    token: response.accessToken,
    user: { id: response.id, name: response.name },
    balance: response.balance,
    currency: response.currency,
  });
  return response;
}

export async function register(payload: RegisterInput): Promise<RegisterResponse> {
  return zodFetch.post('/register', registerResponseSchema, payload);
}
