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
  useAuth.getState().login(response);
  return response;
}

export async function register(payload: Omit<RegisterInput, 'confirmPassword'>): Promise<RegisterResponse> {
  return zodFetch.post('/register', registerResponseSchema, payload);
}
