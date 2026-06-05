import { AnniversaryReminder } from '../types/anniversary';
import { patch, post, request as baseRequest } from './apiClient';

type AnniversaryPayload = {
  relationship_id: number;
  title: string;
  description: string | null;
  target_date: string;
  first_remind_at: string;
  date_rule_type?: string | null;
  rule_month?: number | null;
  rule_day?: number | null;
  rule_week_of_month?: number | null;
  rule_weekday?: number | null;
  remind_type: string;
  period_type: string | null;
  custom_days: number | null;
  repeat_times: number | null;
  status?: string;
  permission_type?: string | null;
};

function toCamelCase(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [toCamelCase(key), normalizeValue(entryValue)]),
    );
  }

  return value;
}

async function request<T>(path: string) {
  const body = await baseRequest<unknown>(path);
  return {
    data: normalizeValue(body.data) as T,
  };
}

export const anniversaryApi = {
  list() {
    return request<AnniversaryReminder[]>('/anniversaries');
  },

  get(id: string) {
    return request<AnniversaryReminder>(`/anniversaries/${id}`);
  },

  async create(payload: AnniversaryPayload) {
    const body = await post<unknown>('/anniversaries', payload);
    return {
      data: normalizeValue(body.data) as AnniversaryReminder,
    };
  },

  async update(id: string, payload: Partial<AnniversaryPayload>) {
    const body = await patch<unknown>(`/anniversaries/${id}`, payload);
    return {
      data: normalizeValue(body.data) as AnniversaryReminder,
    };
  },

  async delete(id: string) {
    const body = await baseRequest<unknown>(`/anniversaries/${id}`, {
      method: 'DELETE',
    });
    return {
      data: normalizeValue(body.data) as { id: string; deleted: boolean },
    };
  },
};
