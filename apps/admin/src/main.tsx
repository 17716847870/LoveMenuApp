import {
  ApiOutlined,
  AuditOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  RocketOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { MenuProps, UploadProps } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { clearToken, get, getToken, getWebSocketUrl, patch, post, put, setToken, upload } from './api';
import type {
  AdminAuditLog,
  AdminSession,
  ApiErrorLog,
  AppRelease,
  DashboardOverview,
  DeployLog,
  DeployRefs,
  EnvCheckItem,
} from './types';
import './index.css';

const { Header, Sider, Content } = Layout;

function LoginPage({ onLogin }: { onLogin: (session: AdminSession) => void }) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  async function submit(values: { username: string; password: string }) {
    setLoading(true);
    try {
      const result = await post<{ admin: AdminSession; token: string }>('/admin/auth/login', values);
      setToken(result.token);
      onLogin(result.admin);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[linear-gradient(135deg,#f7fafc_0%,#edf3f8_52%,#f9f5f0_100%)] p-6">
      <section className="w-full max-w-[420px] rounded-lg border border-slate-200 bg-white p-8 shadow-[0_18px_42px_rgb(22_32_51_/_10%)]">
        <Typography.Title level={1}>LoveMenu Admin</Typography.Title>
        <Typography.Text type="secondary">维护控制台</Typography.Text>
        <Form layout="vertical" className="mt-7" onFinish={submit}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            登录
          </Button>
        </Form>
      </section>
    </main>
  );
}

function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    void get<DashboardOverview>('/admin/dashboard/overview').then(setData);
  }, []);

  return (
    <Space direction="vertical" size={16} className="w-full">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <Statistic title="运行环境" value={data?.environment || '-'} />
        </Card>
        <Card>
          <Statistic title="Git 分支" value={data?.git_branch || '-'} />
        </Card>
        <Card>
          <Statistic title="Android 最新版本" value={data?.active_release?.version_name || '-'} />
        </Card>
        <Card>
          <Statistic title="近 24 小时错误" value={data?.recent_error_count ?? 0} />
        </Card>
      </div>
      <Card title="维护状态">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="当前 commit">{data?.git_commit || '-'}</Descriptions.Item>
          <Descriptions.Item label="最近部署">{data?.latest_deploy?.status || '-'}</Descriptions.Item>
          <Descriptions.Item label="最近部署时间">{formatDate(data?.latest_deploy?.started_at)}</Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}

function AppInfoPage() {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    void get<Record<string, unknown>>('/admin/app-info/about').then((data) => {
      form.setFieldsValue({
        ...data,
        features: Array.isArray(data.features) ? data.features.join('\n') : '',
      });
    });
  }, [form]);

  async function submit(values: Record<string, unknown>) {
    const payload = {
      ...values,
      features: String(values.features || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };
    await put('/admin/app-info/about', payload);
    message.success('关于我们配置已保存');
  }

  return (
    <Card title="App 信息配置">
      <Form form={form} layout="vertical" onFinish={submit} className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item name="app_name" label="App 名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="slogan" label="Slogan">
          <Input />
        </Form.Item>
        <Form.Item name="description" label="应用简介" className="md:col-span-2">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="company_name" label="公司名称">
          <Input />
        </Form.Item>
        <Form.Item name="copyright" label="版权信息">
          <Input />
        </Form.Item>
        <Form.Item name="contact_email" label="联系邮箱">
          <Input />
        </Form.Item>
        <Form.Item name="privacy_policy_url" label="隐私政策 URL">
          <Input />
        </Form.Item>
        <Form.Item name="terms_url" label="用户协议 URL">
          <Input />
        </Form.Item>
        <Form.Item name="icp_record" label="ICP备案号">
          <Input />
        </Form.Item>
        <Form.Item name="police_record" label="公安备案号">
          <Input />
        </Form.Item>
        <Form.Item name="features" label="主要功能列表" className="md:col-span-2">
          <Input.TextArea rows={5} />
        </Form.Item>
        <Form.Item name="show_update_entry" valuePropName="checked">
          <Checkbox>显示检查更新入口</Checkbox>
        </Form.Item>
        <Form.Item className="md:col-span-2">
          <Button type="primary" htmlType="submit">
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

function ReleasesPage() {
  const { message, modal } = AntApp.useApp();
  const [items, setItems] = useState<AppRelease[]>([]);
  const [form] = Form.useForm();

  async function refresh() {
    setItems(await get<AppRelease[]>('/admin/app-releases'));
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submit(values: Record<string, unknown>) {
    await post('/admin/app-releases', {
      ...values,
      release_notes: String(values.release_notes || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    form.resetFields();
    await refresh();
    message.success('版本草稿已保存');
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    customRequest: async ({ file, onError, onSuccess }) => {
      try {
        const result = await upload<{ download_url: string; file_size: number; sha256: string }>(
          '/admin/app-releases/upload-apk',
          file as File,
        );
        form.setFieldsValue({
          download_url: result.download_url,
          file_size: result.file_size,
          sha256: result.sha256,
        });
        onSuccess?.(result);
        message.success('APK 已上传并计算 SHA256');
      } catch (error) {
        onError?.(error as Error);
      }
    },
  };

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Card title="新增 Android 版本">
        <Form form={form} layout="vertical" onFinish={submit} className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item name="platform" label="平台" initialValue="android">
            <Input />
          </Form.Item>
          <Form.Item name="version_name" label="版本名称" rules={[{ required: true }]}>
            <Input placeholder="1.0.3" />
          </Form.Item>
          <Form.Item name="build_number" label="构建号" rules={[{ required: true }]}>
            <Input placeholder="103" />
          </Form.Item>
          <Form.Item name="title" label="更新标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="release_notes" label="更新说明" className="md:col-span-2">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="download_url" label="APK 下载 URL" className="md:col-span-2" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="file_size" label="APK 文件大小">
            <Input />
          </Form.Item>
          <Form.Item name="sha256" label="APK SHA256">
            <Input />
          </Form.Item>
          <Form.Item name="is_force_update" valuePropName="checked">
            <Checkbox>强制更新</Checkbox>
          </Form.Item>
          <Form.Item label="上传 APK">
            <Upload {...uploadProps}>
              <Button icon={<CloudUploadOutlined />}>选择 APK</Button>
            </Upload>
          </Form.Item>
          <Form.Item className="md:col-span-2">
            <Button type="primary" htmlType="submit">
              保存草稿
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card title="版本列表">
        <Table
          rowKey="id"
          dataSource={items}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '平台', dataIndex: 'platform' },
            { title: '版本', dataIndex: 'version_name' },
            { title: '构建号', dataIndex: 'build_number' },
            { title: '状态', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
            {
              title: '启用',
              dataIndex: 'is_active',
              render: (value) => (value ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
            },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button size="small" onClick={() => void navigator.clipboard.writeText(record.download_url)}>
                    复制地址
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => void post(`/admin/app-releases/${record.id}/activate`).then(refresh)}
                  >
                    启用
                  </Button>
                  <Button
                    size="small"
                    onClick={() => void post(`/admin/app-releases/${record.id}/deactivate`).then(refresh)}
                  >
                    停用
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      modal.confirm({
                        title: '归档版本',
                        content: '归档后不会参与检查更新。',
                        onOk: () => post(`/admin/app-releases/${record.id}/archive`).then(refresh),
                      })
                    }
                  >
                    归档
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

function DeploymentsPage() {
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<DeployLog[]>([]);
  const [selected, setSelected] = useState<DeployLog | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [refs, setRefs] = useState<DeployRefs | null>(null);
  const [branch, setBranch] = useState<string>();
  const [targetCommit, setTargetCommit] = useState<string>();
  const [liveLog, setLiveLog] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);

  async function refresh() {
    setItems(await get<DeployLog[]>('/admin/deployments'));
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selected) {
      return;
    }

    setLiveLog(selected.log_text || selected.error_message || '');
    const socket = new WebSocket(getWebSocketUrl(`/admin/deployments/${selected.id}/logs`));
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { line?: string; status?: string };
      if (payload.line) {
        setLiveLog((value) => `${value}${value.endsWith('\n') || !value ? '' : '\n'}${payload.line}\n`);
      }
      if (payload.status) {
        void refresh();
      }
    };
    return () => socket.close();
  }, [selected]);

  async function openDeployModal() {
    setDeployOpen(true);
    setRefsLoading(true);
    setBranch('main');
    setTargetCommit(undefined);
    try {
      const data = await get<DeployRefs>('/admin/deployments/refs?branch=main');
      setRefs(data);
      setBranch(data.selected_branch || 'main');
      setTargetCommit(data.commits[0]?.hash);
    } finally {
      setRefsLoading(false);
    }
  }

  async function changeBranch(value: string) {
    setBranch(value);
    setTargetCommit(undefined);
    setRefsLoading(true);
    try {
      const data = await get<DeployRefs>(`/admin/deployments/refs?branch=${encodeURIComponent(value)}`);
      setRefs(data);
      setTargetCommit(data.commits[0]?.hash);
    } finally {
      setRefsLoading(false);
    }
  }

  async function triggerDeploy() {
    if (!branch || !targetCommit) {
      message.error('请选择分支和部署版本');
      return;
    }

    setDeploying(true);
    try {
      const deployLog = await post<DeployLog>('/admin/deployments', {
        branch,
        target_commit: targetCommit,
      });
      setDeployOpen(false);
      setSelected(deployLog);
      await refresh();
      message.success('部署任务已触发');
    } finally {
      setDeploying(false);
    }
  }

  const branchOptions = refs?.branches.map((item) => ({ value: item, label: item })) ?? [];
  const commitOptions =
    refs?.commits.map((commit) => ({
      value: commit.hash,
      label: `${commit.short_hash} · ${formatDate(commit.date)} · ${commit.subject}`,
    })) ?? [];

  return (
    <Card
      title="服务器部署"
      extra={
        <Button type="primary" icon={<RocketOutlined />} onClick={() => void openDeployModal()}>
          一键部署
        </Button>
      }
    >
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '状态', dataIndex: 'status', render: statusTag },
          { title: '分支', dataIndex: 'branch' },
          {
            title: '目标版本',
            dataIndex: 'target_commit',
            render: (value) => (value ? <Typography.Text code>{String(value).slice(0, 12)}</Typography.Text> : '-'),
          },
          { title: '部署日期', dataIndex: 'started_at', render: formatDate },
          { title: '结束时间', dataIndex: 'finished_at', render: formatDate },
          {
            title: '操作',
            render: (_, record) => (
              <Button size="small" onClick={() => setSelected(record)}>
                查看日志
              </Button>
            ),
          },
        ]}
      />
      <Modal
        title="选择部署版本"
        open={deployOpen}
        okText="开始部署"
        confirmLoading={deploying}
        onOk={() => void triggerDeploy()}
        onCancel={() => setDeployOpen(false)}
        width={760}
      >
        <Space direction="vertical" size={16} className="w-full">
          <Alert type="warning" showIcon message="请选择明确的分支和 commit，部署不会默认使用最新代码。" />
          <Form layout="vertical">
            <Form.Item label="Git 分支" required>
              <Select value={branch} options={branchOptions} loading={refsLoading} onChange={(value) => void changeBranch(value)} />
            </Form.Item>
            <Form.Item label="部署版本" required>
              <Select
                value={targetCommit}
                options={commitOptions}
                onChange={setTargetCommit}
                showSearch
                loading={refsLoading}
                disabled={refsLoading}
                optionFilterProp="label"
              />
            </Form.Item>
            {refsLoading ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                <Spin size="small" />
                <span>正在加载部署版本...</span>
              </div>
            ) : null}
          </Form>
        </Space>
      </Modal>
      <Modal title="实时部署日志" open={Boolean(selected)} onCancel={() => setSelected(null)} footer={null} width={900}>
        <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
          {liveLog || '暂无日志'}
        </pre>
      </Modal>
    </Card>
  );
}

function ErrorLogsPage() {
  const [items, setItems] = useState<ApiErrorLog[]>([]);
  const [selected, setSelected] = useState<ApiErrorLog | null>(null);

  async function refresh() {
    setItems(await get<ApiErrorLog[]>('/admin/api-error-logs'));
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Card title="接口错误日志">
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '方法', dataIndex: 'method', width: 90 },
          { title: '路径', dataIndex: 'path' },
          { title: '状态码', dataIndex: 'status_code', width: 100 },
          { title: '类型', dataIndex: 'error_name' },
          {
            title: '已处理',
            dataIndex: 'is_resolved',
            render: (value) => (value ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>),
          },
          { title: '时间', dataIndex: 'created_at', render: formatDate },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => setSelected(record)}>
                  详情
                </Button>
                <Button
                  size="small"
                  onClick={() => void patch(`/admin/api-error-logs/${record.id}/resolve`).then(refresh)}
                >
                  标记已处理
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal title="错误详情" open={Boolean(selected)} onCancel={() => setSelected(null)} footer={null} width={880}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="requestId">{selected?.request_id}</Descriptions.Item>
          <Descriptions.Item label="消息">{selected?.error_message}</Descriptions.Item>
        </Descriptions>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
          {selected?.error_stack || '暂无 stack'}
        </pre>
      </Modal>
    </Card>
  );
}

function AuditLogsPage() {
  const [items, setItems] = useState<AdminAuditLog[]>([]);

  useEffect(() => {
    void get<AdminAuditLog[]>('/admin/audit-logs').then(setItems);
  }, []);

  return (
    <Card title="后台审计日志">
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '管理员', dataIndex: 'admin_username' },
          { title: '操作', dataIndex: 'action' },
          { title: '对象', dataIndex: 'target_type' },
          { title: '摘要', dataIndex: 'summary' },
          { title: '时间', dataIndex: 'created_at', render: formatDate },
        ]}
      />
    </Card>
  );
}

function SettingsPage() {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [envItems, setEnvItems] = useState<EnvCheckItem[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  useEffect(() => {
    void get<Record<string, unknown>>('/admin/settings/deployment').then((data) => {
      form.setFieldsValue(data);
    });
    void refreshEnvCheck();
  }, [form]);

  async function refreshEnvCheck() {
    setEnvLoading(true);
    try {
      setEnvItems(await get<EnvCheckItem[]>('/admin/settings/env-check'));
    } finally {
      setEnvLoading(false);
    }
  }

  async function submit(values: Record<string, unknown>) {
    await put('/admin/settings/deployment', values);
    message.success('部署配置已保存');
  }

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Alert
        type="warning"
        showIcon
        message="部署配置只从后台系统设置读取"
        description="保存后立即生效；未配置完整时，一键部署会直接报错。"
      />
      <Card title="部署配置">
        <Form form={form} layout="vertical" onFinish={submit} className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item name="script_path" label="部署脚本路径" rules={[{ required: true, message: '请填写部署脚本路径' }]}>
            <Input placeholder="/var/www/LoveMenuApp/scripts/deploy-server.sh" />
          </Form.Item>
          <Form.Item name="workdir" label="部署工作目录" rules={[{ required: true, message: '请填写部署工作目录' }]}>
            <Input placeholder="/var/www/LoveMenuApp" />
          </Form.Item>
          <Form.Item name="timeout_seconds" label="部署超时时间（秒）" rules={[{ required: true, message: '请填写超时时间' }]}>
            <Input type="number" min={60} />
          </Form.Item>
          <Form.Item name="health_url" label="健康检查 URL" rules={[{ required: true, message: '请填写健康检查 URL' }]}>
            <Input placeholder="http://127.0.0.1:3001/api/health" />
          </Form.Item>
          <Form.Item className="md:col-span-2">
            <Button type="primary" htmlType="submit">
              保存部署配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card
        title="环境变量检查"
        extra={
          <Button onClick={() => void refreshEnvCheck()} loading={envLoading}>
            刷新
          </Button>
        }
      >
        <Table
          rowKey="key"
          loading={envLoading}
          dataSource={envItems}
          pagination={false}
          columns={[
            { title: '变量名', dataIndex: 'key' },
            { title: '分组', dataIndex: 'group', width: 120 },
            { title: '备注', dataIndex: 'remark' },
            {
              title: '是否必填',
              dataIndex: 'required',
              width: 120,
              render: (value) => (value ? <Tag color="red">必填</Tag> : <Tag>可选</Tag>),
            },
            {
              title: '状态',
              dataIndex: 'configured',
              width: 140,
              render: (value) => (value ? <Tag color="green">已配置</Tag> : <Tag color="red">未配置</Tag>),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

function AdminShell({ session, onLogout }: { session: AdminSession; onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = useMemo<MenuProps['items']>(
    () => [
      { key: '/dashboard', icon: <DashboardOutlined />, label: '控制台首页' },
      { key: '/app-info', icon: <InfoCircleOutlined />, label: 'App 信息配置' },
      { key: '/releases', icon: <FileTextOutlined />, label: '版本发布' },
      { key: '/deployments', icon: <RocketOutlined />, label: '服务器部署' },
      { key: '/errors', icon: <ApiOutlined />, label: '接口错误日志' },
      { key: '/audit', icon: <AuditOutlined />, label: '审计日志' },
      { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
    ],
    [],
  );
  const selectedKey = items?.some((item) => item?.key === location.pathname) ? location.pathname : '/dashboard';

  return (
    <Layout className="min-h-dvh">
      <Sider breakpoint="lg" collapsedWidth={0} width={232} className="!border-r !border-slate-200 !bg-white">
        <div className="h-16 px-5 pt-5 text-[17px] font-bold text-slate-900">LoveMenu Admin</div>
        <Menu selectedKeys={[selectedKey]} mode="inline" items={items} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <Space split={<span className="h-[18px] w-px bg-slate-200" />}>
            <Typography.Text strong>{session.display_name || session.username}</Typography.Text>
            <Typography.Text type="secondary">维护控制台</Typography.Text>
          </Space>
          <Button icon={<LogoutOutlined />} onClick={onLogout}>
            退出
          </Button>
        </Header>
        <Content className="p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/app-info" element={<AppInfoPage />} />
            <Route path="/releases" element={<ReleasesPage />} />
            <Route path="/deployments" element={<DeploymentsPage />} />
            <Route path="/errors" element={<ErrorLogsPage />} />
            <Route path="/audit" element={<AuditLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function Root() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [booting, setBooting] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    void get<AdminSession>('/admin/auth/session')
      .then(setSession)
      .catch(clearToken)
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return <div className="grid min-h-dvh place-items-center text-slate-500">Loading...</div>;
  }

  return session ? (
    <AdminShell
      session={session}
      onLogout={() => {
        clearToken();
        setSession(null);
      }}
    />
  ) : (
    <Routes>
      <Route path="*" element={<LoginPage onLogin={setSession} />} />
    </Routes>
  );
}

function statusTag(value?: string) {
  const color = value === 'success' ? 'green' : value === 'failed' ? 'red' : value === 'running' ? 'blue' : 'default';
  return <Tag color={color}>{value || '-'}</Tag>;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AntApp>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </AntApp>
  </React.StrictMode>,
);
