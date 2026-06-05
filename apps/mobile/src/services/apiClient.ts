import * as SecureStore from 'expo-secure-store';

type ApiResponse<T> = {
  data: T;
};

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3001/api';
const TOKEN_KEY = 'lovemenu.auth.token';

let authToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function loadAuthToken() {
  authToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return authToken;
}

export async function setAuthToken(token: string) {
  authToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken() {
  authToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function getAuthToken() {
  return authToken;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = authToken ?? (await loadAuthToken());
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuthToken();
    }

    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.message === 'string'
        ? errorBody.message
        : Array.isArray(errorBody?.message)
          ? errorBody.message.join('\n')
          : 'Request failed';

    throw new ApiError(message, response.status);
  }

  return response.json();
}

export function post<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function postForm<T>(path: string, body: FormData) {
  return request<T>(path, {
    method: 'POST',
    body,
  });
}

export function patch<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
