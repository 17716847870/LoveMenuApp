export type UserEntity = {
  id: number;
  phone: string | null;
  email: string | null;
  nickname: string;
  profile_completed: boolean;
  avatar_url: string | null;
  avatar_object_key: string | null;
  gender: 'male' | 'female' | null;
  preferred_role: 'publisher' | 'consumer' | null;
  birthday: string | null;
  status: 'active' | 'disabled';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoupleRelationshipEntity = {
  id: number;
  user_a_id: number;
  user_b_id: number;
  publisher_user_id: number;
  consumer_user_id: number;
  role_confirmation_status: 'pending' | 'confirmed';
  role_proposer_user_id: number | null;
  proposed_publisher_user_id: number | null;
  proposed_consumer_user_id: number | null;
  status: 'active' | 'unbound';
  together_since: string | null;
  bound_at: string;
  unbound_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoupleInviteEntity = {
  id: number;
  inviter_user_id: number;
  invite_code: string;
  status: 'pending' | 'used' | 'expired';
  expired_at: string | null;
  used_by_user_id: number | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuCategoryEntity = {
  id: number;
  relationship_id: number;
  publisher_user_id: number;
  name: string;
  sort_order: number;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
};

export type MenuEntity = {
  id: number;
  relationship_id: number;
  publisher_user_id: number;
  category_id: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  cover_image_object_key: string | null;
  is_published: boolean;
  is_limited: boolean;
  available_count: number;
  heat_score: number;
  completed_order_count: number;
  remark: string | null;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
};

export type OrderEntity = {
  id: number;
  relationship_id: number;
  menu_id: number;
  publisher_user_id: number;
  consumer_user_id: number;
  order_no: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  user_remark: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  completed_by_user_id: number | null;
  deducted_count: number;
  created_at: string;
  updated_at: string;
  items?: OrderItemEntity[];
};

export type OrderItemEntity = {
  id: number;
  order_id: number;
  menu_id: number;
  title_snapshot: string;
  cover_image_url_snapshot: string | null;
  quantity: number;
  deducted_count: number;
  sort_order: number;
  created_at: string;
};

export type OrderStatusLogEntity = {
  id: number;
  order_id: number;
  from_status: OrderEntity['status'] | null;
  to_status: OrderEntity['status'];
  operator_user_id: number;
  remark: string | null;
  created_at: string;
};

export type MenuRequestEntity = {
  id: number;
  relationship_id: number;
  consumer_user_id: number;
  publisher_user_id: number;
  title: string;
  description: string | null;
  suggested_category_name: string | null;
  remark: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  handled_by_user_id: number | null;
  handled_at: string | null;
  converted_menu_id: number | null;
  created_at: string;
  updated_at: string;
};

export type SpacePostImageEntity = {
  id: number;
  post_id: number;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type SpacePostEntity = {
  id: number;
  relationship_id: number;
  creator_user_id: number;
  post_type: 'order_feedback' | 'daily_post';
  source_order_id: number | null;
  source_feedback_id: number | null;
  title: string | null;
  content_text: string | null;
  record_date: string;
  status: 'active' | 'deleted';
  posted_at: string;
  created_at: string;
  updated_at: string;
  images: SpacePostImageEntity[];
};

export type BootstrapResponse = {
  current_user: UserEntity;
  partner_user: UserEntity | null;
  couple_relationship: CoupleRelationshipEntity | null;
  menu_categories: MenuCategoryEntity[];
  menus: MenuEntity[];
  orders: OrderEntity[];
  couple_invites: CoupleInviteEntity[];
  next_step: 'complete_profile' | 'select_role' | 'bind' | 'wait_role_confirm' | 'role_confirm' | 'home';
};

export type HomeSummaryResponse = {
  role: 'publisher' | 'consumer' | null;
  published_menu_count: number;
  pending_order_count: number;
  active_order_count: number;
  completed_order_count: number;
  limited_menu_count: number;
  pending_wish_count: number;
  together_days: number | null;
  top_menu: MenuEntity | null;
  hottest_menu: MenuEntity | null;
  focus_order: OrderEntity | null;
  latest_space_post: SpacePostEntity | null;
  upcoming_anniversary: {
    id: number;
    title: string;
    next_trigger_at: string | null;
    target_date: string;
  } | null;
};

export type SweetFootprintStatsResponse = {
  together_days: number | null;
  published_menu_count: number;
  completed_order_count: number;
  sweet_index: number;
  top_menus: {
    id: number;
    title: string;
    note: string;
    count: number;
  }[];
  weekly_sweetness: number[];
  latest_moment: SpacePostEntity | null;
};

export type WheelOptionEntity = {
  id: number;
  relationship_id: number;
  creator_user_id: number;
  title: string;
  sort_order: number;
  selected_count: number;
  last_selected_at: string | null;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  user: UserEntity;
  token: string;
  expires_at: string;
};

export type AppAboutResponse = {
  app_name: string;
  slogan: string;
  description: string;
  version: string;
  company_name: string;
  copyright: string;
  contact_email: string;
  privacy_policy_url: string;
  terms_url: string;
  icp_record: string;
  police_record: string;
  features: string[];
};

export type AppVersionCheckResponse = {
  latest_version: string;
  latest_build_number: string;
  min_supported_version: string;
  has_update: boolean;
  force_update: boolean;
  title: string;
  release_notes: string[];
  download_url: string;
  store_url: string;
};
