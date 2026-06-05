import { ChatConversationSummary, ChatMessageEntity, ChatMessagePage, ChatSessionsSummary } from '../types/chat';
import { API_BASE_URL, getAuthToken, loadAuthToken, patch, post, request } from './apiClient';

export type SendChatMessagePayload = {
  message_type: 'text' | 'emoji' | 'image' | 'voice';
  text_content?: string | null;
  reply_to_message_id?: number | null;
  asset?: {
    asset_type: 'image' | 'voice';
    asset_url: string;
    duration_seconds?: number | null;
    file_size?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  mention?: {
    ref_type: 'menu' | 'order' | 'wish';
    ref_id: number;
  } | null;
};

export const chatApi = {
  getConversation() {
    return request<ChatConversationSummary>('/chat/conversation');
  },

  getSessions() {
    return request<ChatSessionsSummary>('/chat/sessions');
  },

  listMessages(cursor?: number | null, limit = 40) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set('cursor', String(cursor));
    }
    return request<ChatMessagePage>(`/chat/messages?${params.toString()}`);
  },

  sendMessage(payload: SendChatMessagePayload) {
    return post<ChatMessageEntity>('/chat/messages', payload);
  },

  recallMessage(id: number) {
    return patch<ChatMessageEntity>(`/chat/messages/${id}/recall`, {});
  },

  markAsRead() {
    return patch<{ read_count: number }>('/chat/read', {});
  },
};

export type ChatRealtimeEvent =
  | {
      type: 'message.created' | 'message.recalled';
      message: ChatMessageEntity;
    }
  | {
      type: 'messages.read';
      reader_user_id: number;
      conversation_id: number;
    };

export async function subscribeToChatEvents(onEvent: (event: ChatRealtimeEvent) => void, onError?: () => void) {
  const token = getAuthToken() ?? (await loadAuthToken());
  const xhr = new XMLHttpRequest();
  let cursor = 0;
  let buffered = '';

  xhr.open('GET', `${API_BASE_URL}/chat/events`);
  xhr.setRequestHeader('Accept', 'text/event-stream');
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onprogress = () => {
    const chunk = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    buffered = parseSseChunk(`${buffered}${chunk}`, onEvent);
  };
  xhr.onerror = () => onError?.();
  xhr.ontimeout = () => onError?.();
  xhr.send();

  return () => xhr.abort();
}

function parseSseChunk(chunk: string, onEvent: (event: ChatRealtimeEvent) => void) {
  const packets = chunk.split('\n\n');
  const remainder = packets.pop() ?? '';
  for (const packet of packets) {
    const dataLine = packet.split('\n').find((line) => line.startsWith('data:'));
    if (!dataLine) {
      continue;
    }

    try {
      const event = JSON.parse(dataLine.replace(/^data:\s*/, '')) as ChatRealtimeEvent | { ok?: boolean };
      if ('type' in event) {
        onEvent(event);
      }
    } catch {
      // Ignore partial or malformed SSE frames; the next progress event will continue the stream.
    }
  }

  return remainder;
}
