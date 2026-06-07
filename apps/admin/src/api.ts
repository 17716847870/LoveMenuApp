const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'lovemenu_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getWebSocketUrl(path: string) {
  const token = getToken();
  const baseUrl = API_BASE_URL.startsWith('http') ? API_BASE_URL : `${window.location.origin}${API_BASE_URL}`;
  const url = new URL(`${baseUrl}${path}`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: T };

  if (!response.ok) {
    const message =
      payload.data && typeof payload.data === 'object' && 'message' in payload.data
        ? String(payload.data.message)
        : '请求失败';
    throw new Error(message);
  }

  return payload.data as T;
}

export function get<T>(path: string) {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function put<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function patch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function upload<T>(path: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<T>(path, {
    method: 'POST',
    body: form,
  });
}
