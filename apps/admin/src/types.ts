export type AdminSession = {
  id: number;
  username: string;
  display_name?: string;
  last_login_at?: string;
};

export type EnvCheckItem = {
  key: string;
  group: string;
  required: boolean;
  remark: string;
  configured: boolean;
};

export type DashboardOverview = {
  environment: string;
  git_branch: string;
  git_commit: string;
  latest_deploy?: DeployLog | null;
  active_release?: AppRelease | null;
  recent_error_count: number;
};

export type AppRelease = {
  id: number;
  platform: string;
  version_name: string;
  build_number: number;
  title: string;
  release_notes: string[];
  download_url: string;
  object_key?: string;
  file_size?: number;
  sha256?: string;
  is_force_update: boolean;
  is_active: boolean;
  status: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
};

export type DeployLog = {
  id: number;
  status: string;
  branch?: string;
  before_commit?: string;
  target_commit?: string;
  started_by?: number;
  process_id?: number;
  log_text?: string;
  error_message?: string;
  started_at: string;
  finished_at?: string;
};

export type DeployCommit = {
  hash: string;
  short_hash: string;
  date: string;
  subject: string;
};

export type DeployRefs = {
  branches: string[];
  selected_branch: string;
  commits: DeployCommit[];
};

export type ApiErrorLog = {
  id: number;
  request_id?: string;
  method: string;
  path: string;
  status_code: number;
  error_name?: string;
  error_message?: string;
  error_stack?: string;
  is_resolved: boolean;
  created_at: string;
};

export type AdminAuditLog = {
  id: number;
  admin_username?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  summary?: string;
  created_at: string;
};
