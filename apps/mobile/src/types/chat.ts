export type ChatMessageType = 'text' | 'emoji' | 'image' | 'voice';
export type ChatMessageStatus = 'sent' | 'delivered' | 'read' | 'recalled';
export type ChatMentionType = 'menu' | 'order' | 'wish';

export type ChatMessageAssetEntity = {
  id: number;
  message_id: number;
  asset_type: 'image' | 'voice';
  asset_url: string;
  duration_seconds: number | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type ChatMessageMentionEntity = {
  id: number;
  message_id: number;
  ref_type: ChatMentionType;
  ref_id: number;
  created_at: string;
};

export type ChatReplySnapshot = {
  id: number;
  sender_user_id: number;
  message_type: ChatMessageType;
  text_content: string | null;
  status: ChatMessageStatus;
};

export type ChatMessageEntity = {
  id: number;
  conversation_id: number;
  relationship_id: number;
  sender_user_id: number;
  receiver_user_id: number;
  message_type: ChatMessageType;
  text_content: string | null;
  reply_to_message_id: number | null;
  recalled_at: string | null;
  status: ChatMessageStatus;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  assets: ChatMessageAssetEntity[];
  mentions: ChatMessageMentionEntity[];
  reply_to_message: ChatReplySnapshot | null;
};

export type ChatMessagePage = {
  items: ChatMessageEntity[];
  next_cursor: number | null;
  has_more: boolean;
};

export type ChatConversationSummary = {
  id: number;
  relationship_id: number;
  user_a_id: number;
  user_b_id: number;
  last_message_id: number | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  partner_user_id: number;
  unread_count: number;
  last_message: ChatMessageEntity | null;
};

export type ChatSecondarySession = {
  id: 'menu-requests' | 'anniversaries';
  title: string;
  preview: string;
  meta: string;
  unread_count: number;
  route: 'ApplicationList' | 'Anniversaries';
  icon: 'bell' | 'heart';
};

export type ChatSessionsSummary = {
  conversation: ChatConversationSummary;
  partner_presence: {
    is_online: boolean;
    last_seen_at: string | null;
    label: string;
  };
  secondary_sessions: ChatSecondarySession[];
};
