import {
  AuthResponse,
  BootstrapResponse,
  CoupleInviteEntity,
  CoupleRelationshipEntity,
  HomeSummaryResponse,
  MenuCategoryEntity,
  MenuEntity,
  MenuRequestEntity,
  OrderEntity,
  OrderStatusLogEntity,
  SpacePostEntity,
  SweetFootprintStatsResponse,
  UserEntity,
  WheelOptionEntity,
} from '../types/phaseOne';
import { patch, post, request } from './apiClient';

export const phaseOneApi = {
  login(phone: string) {
    return post<AuthResponse>('/auth/login', { phone });
  },

  refreshSession() {
    return request<AuthResponse>('/auth/session');
  },

  getMe() {
    return request<UserEntity>('/users/me');
  },

  updateUser(
    payload: Partial<Pick<UserEntity, 'nickname' | 'phone' | 'email' | 'avatar_url' | 'gender' | 'preferred_role'>>,
  ) {
    return patch<UserEntity>('/users/me', payload);
  },

  touchPresence() {
    return patch<UserEntity>('/users/presence', {});
  },

  registerPushToken(payload: { token: string; platform: string; deviceId?: string | null }) {
    return patch<{ registered: boolean }>('/users/push-token', payload);
  },

  getBootstrap() {
    return request<BootstrapResponse>('/phase-one/bootstrap');
  },

  getHomeSummary() {
    return request<HomeSummaryResponse>('/phase-one/home');
  },

  createInvite() {
    return post<CoupleInviteEntity>('/couple/invites', {});
  },

  bindByInvite(invite_code: string) {
    return post<CoupleRelationshipEntity>('/couple/bind', { invite_code });
  },

  unbindRelationship(relationship_id: number) {
    return patch<CoupleRelationshipEntity>(`/couple/relationships/${relationship_id}/unbind`, {});
  },

  confirmRole(relationship_id: number, publisher_user_id: number, consumer_user_id: number) {
    return patch<CoupleRelationshipEntity>(`/couple/relationships/${relationship_id}/role`, {
      publisher_user_id,
      consumer_user_id,
    });
  },

  confirmRelationshipRole(
    relationship_id: number,
    publisher_user_id: number,
    consumer_user_id: number,
    together_since: string,
  ) {
    return patch<CoupleRelationshipEntity>(`/couple/relationships/${relationship_id}/confirm-role`, {
      publisher_user_id,
      consumer_user_id,
      together_since,
    });
  },

  submitRoleProposal(relationship_id: number, publisher_user_id: number, consumer_user_id: number) {
    return patch<CoupleRelationshipEntity>(`/couple/relationships/${relationship_id}/role`, {
      publisher_user_id,
      consumer_user_id,
    });
  },

  listMenuCategories() {
    return request<MenuCategoryEntity[]>('/menu-categories');
  },

  createMenuCategory(payload: Pick<MenuCategoryEntity, 'name' | 'sort_order' | 'status'>) {
    return post<MenuCategoryEntity>('/menu-categories', payload);
  },

  updateMenuCategory(id: number, payload: Partial<Pick<MenuCategoryEntity, 'name' | 'sort_order' | 'status'>>) {
    return patch<MenuCategoryEntity>(`/menu-categories/${id}`, payload);
  },

  deleteMenuCategory(id: number) {
    return request<{ id: number }>(`/menu-categories/${id}`, {
      method: 'DELETE',
    });
  },

  listMenus() {
    return request<MenuEntity[]>('/menus');
  },

  getMenu(id: number) {
    return request<MenuEntity>(`/menus/${id}`);
  },

  createMenu(
    payload: Pick<
      MenuEntity,
      | 'category_id'
      | 'title'
      | 'description'
      | 'cover_image_url'
      | 'is_published'
      | 'is_limited'
      | 'available_count'
      | 'remark'
    >,
  ) {
    return post<MenuEntity>('/menus', payload);
  },

  updateMenu(
    id: number,
    payload: Partial<Omit<MenuEntity, 'id' | 'heat_score' | 'completed_order_count' | 'created_at'>>,
  ) {
    return patch<MenuEntity>(`/menus/${id}`, payload);
  },

  listMenuRequests() {
    return request<MenuRequestEntity[]>('/menu-requests');
  },

  getMenuRequest(id: number) {
    return request<MenuRequestEntity>(`/menu-requests/${id}`);
  },

  createMenuRequest(
    payload: Pick<MenuRequestEntity, 'title'> &
      Partial<Pick<MenuRequestEntity, 'description' | 'suggested_category_name' | 'remark'>>,
  ) {
    return post<MenuRequestEntity>('/menu-requests', payload);
  },

  updateMenuRequestStatus(
    id: number,
    payload: {
      status: Extract<MenuRequestEntity['status'], 'accepted' | 'rejected'>;
      remark?: string | null;
      create_menu?: boolean;
      converted_menu_id?: number | null;
    },
  ) {
    return patch<MenuRequestEntity>(`/menu-requests/${id}/status`, payload);
  },

  createOrder(payload: Pick<OrderEntity, 'menu_id' | 'user_remark'>) {
    return post<OrderEntity>('/orders', payload);
  },

  createOrders(payload: { menu_ids: number[]; user_remark?: string | null }) {
    return post<OrderEntity>('/orders', payload);
  },

  listOrders() {
    return request<OrderEntity[]>('/orders');
  },

  getOrder(id: number) {
    return request<OrderEntity>(`/orders/${id}`);
  },

  updateOrderStatus(id: number, status: OrderEntity['status'], remark: string | null) {
    return patch<OrderEntity>(`/orders/${id}/status`, {
      status,
      remark,
    });
  },

  getOrderStatusLogs(order_id: number) {
    return request<OrderStatusLogEntity[]>(`/orders/${order_id}/status-logs`);
  },

  createOrderFeedback(
    order_id: number,
    payload: {
      content_text?: string | null;
      images?: { image_url: string }[];
    },
  ) {
    return post<{ feedback: unknown; post: SpacePostEntity }>(`/orders/${order_id}/feedback`, payload);
  },

  listSpacePosts() {
    return request<SpacePostEntity[]>('/space/posts');
  },

  getSweetFootprintStats() {
    return request<SweetFootprintStatsResponse>('/space/stats');
  },

  createSpacePost(payload: { content_text?: string | null; images?: { image_url: string }[]; record_date?: string }) {
    return post<SpacePostEntity>('/space/posts', payload);
  },

  listWheelOptions() {
    return request<WheelOptionEntity[]>('/wheel/options');
  },

  createWheelOption(payload: { title: string; sort_order?: number }) {
    return post<WheelOptionEntity>('/wheel/options', payload);
  },

  deleteWheelOption(id: number) {
    return request<{ id: number }>(`/wheel/options/${id}`, {
      method: 'DELETE',
    });
  },

  spinWheel() {
    return post<WheelOptionEntity>('/wheel/spin', {});
  },
};
