import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Empty,
  Input,
  Message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import type { ColumnProps } from '@arco-design/web-react/es/Table';
import {
  IconCloud,
  IconInfoCircle,
  IconLink,
} from '@arco-design/web-react/icon';
import { isAccountMenuKey } from '@/accountNavigation';
import type { AccountMenuKey } from '@/accountNavigation';
import databaseLogo from '@/assets/icons/streamline-core-flat-free/database.svg';
import dingtalkLogo from '@/assets/images/dingtalk-logo.svg';
import feishuLogo from '@/assets/images/feishu-logo.svg';
import userAvatar from '@/assets/images/user-avatar.png';
import { OpenApiAnnotationMarker } from '@/components/openApiAnnotations';
import styles from './index.module.less';

interface OpenApiOptimizationProps {
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
}

interface ApiKeyRow {
  id: string;
  name: string;
  appKey: string;
  creator: string;
  createdAt: string;
  lastCall: string;
  failure: string;
}

interface CallLogRow {
  id: string;
  appKey: string;
  requestId: string;
  apiName: string;
  result: '成功' | '失败';
  errorCode: string;
  callTime: string;
}

interface StorageOption {
  key: 'database' | 'dingtalk' | 'feishu';
  name: string;
  details: Array<{ label: string; value: string }>;
}

const centerTableScrollX = 900;

const initialApiKeys: ApiKeyRow[] = [
  {
    id: 'key-1',
    name: 'Codex 数据交付 Agent',
    appKey: 'qsb_agent_codex_prod',
    creator: '森森',
    createdAt: '2026-07-12 10:18',
    lastCall: '2026-07-15 14:26',
    failure: '-',
  },
  {
    id: 'key-2',
    name: 'Claude 经营分析工作流',
    appKey: 'qsb_agent_claude_trial',
    creator: '运营一组',
    createdAt: '2026-07-13 16:42',
    lastCall: '2026-07-14 21:08',
    failure: 'RATE_LIMITED',
  },
  {
    id: 'key-3',
    name: '临时调试 Key',
    appKey: 'qsb_agent_tmp_0720',
    creator: '实施二组',
    createdAt: '2026-07-15 09:00',
    lastCall: '2026-07-15 09:11',
    failure: 'AUTH_FAILED',
  },
];

const callLogs: CallLogRow[] = [
  {
    id: 'log-1',
    appKey: 'qsb_agent_codex_prod',
    requestId: 'req_202607151426_019',
    apiName: 'POST /openapi/jobs/execute',
    result: '成功',
    errorCode: '-',
    callTime: '2026-07-15 14:26',
  },
  {
    id: 'log-2',
    appKey: 'qsb_agent_claude_trial',
    requestId: 'req_202607142108_083',
    apiName: 'GET /openapi/results/files',
    result: '失败',
    errorCode: 'RATE_LIMITED',
    callTime: '2026-07-14 21:08',
  },
  {
    id: 'log-3',
    appKey: 'qsb_agent_tmp_0720',
    requestId: 'req_202607150911_112',
    apiName: 'GET /openapi/connectors',
    result: '失败',
    errorCode: 'AUTH_FAILED',
    callTime: '2026-07-15 09:11',
  },
];

const storageOptions: StorageOption[] = [
  {
    key: 'database',
    name: '数据库',
    details: [
      { label: '数据库类型', value: 'MySQL' },
      { label: '数据库账号', value: 'dba_****' },
      { label: '数据库名', value: 'biz_data_****' },
    ],
  },
  {
    key: 'dingtalk',
    name: '钉钉多维表',
    details: [
      { label: '应用名称', value: '数据中心应用****' },
      { label: '操作人', value: 'sensen_****' },
      { label: '访问凭证', value: '************' },
    ],
  },
  {
    key: 'feishu',
    name: '飞书多维表',
    details: [
      { label: '应用名称', value: '取数运营平台****' },
      { label: '租户标识', value: 'tenant_****' },
      { label: '应用密钥', value: '************' },
    ],
  },
];

const storageLogos: Record<StorageOption['key'], string> = {
  database: databaseLogo,
  dingtalk: dingtalkLogo,
  feishu: feishuLogo,
};

function formatNow() {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function makeApiKey(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 12) || 'agent';
  return `qsb_agent_${normalized}_${Date.now().toString().slice(-6)}`;
}

export default function OpenApiOptimization({
  activeKey,
}: OpenApiOptimizationProps) {
  const [apiKeyRows, setApiKeyRows] = useState<ApiKeyRow[]>(initialApiKeys);
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [activeLogKey, setActiveLogKey] = useState<ApiKeyRow | null>(null);
  const [profileName, setProfileName] = useState('森森');
  const [profileAccount, setProfileAccount] = useState('test_sensen');
  const [profileDraftName, setProfileDraftName] = useState(profileName);
  const [profileDraftAccount, setProfileDraftAccount] = useState(profileAccount);
  const [profileEditing, setProfileEditing] = useState(false);

  const currentKey = useMemo<AccountMenuKey>(() => {
    return isAccountMenuKey(activeKey) ? activeKey : 'API Keys';
  }, [activeKey]);

  const renderEllipsis = (value: string, className = styles.ellipsisText) => (
    <Tooltip content={value}>
      <span className={className}>{value}</span>
    </Tooltip>
  );

  const maskApiKey = (value: string) => {
    const parts = value.split('_');
    const suffix = parts[parts.length - 1] || '';
    return `qsb_agent_****_${suffix}`;
  };

  const handleCreateApiKey = () => {
    const name = createName.trim();
    if (!name) {
      Message.warning('请输入名称');
      return;
    }

    const nextRow: ApiKeyRow = {
      id: `key-${Date.now()}`,
      name,
      appKey: makeApiKey(name),
      creator: '森森',
      createdAt: formatNow(),
      lastCall: '-',
      failure: '-',
    };
    setApiKeyRows((rows) => [nextRow, ...rows]);
    setCreateName('');
    setCreateVisible(false);
    Message.success('API Key 已创建，可在列表中复制');
  };

  const handleDeleteApiKey = (record: ApiKeyRow) => {
    setApiKeyRows((rows) => rows.filter((row) => row.id !== record.id));
    if (activeLogKey?.id === record.id) setActiveLogKey(null);
    Message.success('API Key 已删除');
  };

  const keyColumns: ColumnProps<ApiKeyRow>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      fixed: 'left',
      align: 'left',
      render: (value) => renderEllipsis(value, styles.nameCell),
    },
    {
      title: 'API Key',
      dataIndex: 'appKey',
      width: 190,
      align: 'left',
      render: (value) => (
        <Tooltip content="点击图标复制完整 API Key">
          <Typography.Text copyable={{ text: value }} className={styles.apiKeyCode}>
            {maskApiKey(value)}
          </Typography.Text>
        </Tooltip>
      ),
    },
    { title: '创建人', dataIndex: 'creator', width: 84, align: 'left', render: (value) => renderEllipsis(value, styles.shortCell) },
    { title: '创建时间', dataIndex: 'createdAt', width: 132, align: 'left', render: (value) => renderEllipsis(value, styles.dateCell) },
    { title: '最近调用', dataIndex: 'lastCall', width: 132, align: 'left', render: (value) => renderEllipsis(value, styles.dateCell) },
    { title: '失败原因', dataIndex: 'failure', width: 112, align: 'left', render: (value) => renderEllipsis(value, styles.shortCell) },
    {
      title: '操作',
      dataIndex: 'operation',
      fixed: 'right',
      width: 88,
      align: 'left',
      render: (_, record, index) => {
        const actionContent = (
          <Space size="small" className={styles.actionGroup}>
            <Button
              type="text"
              size="small"
              className={styles.tableActionButton}
              onClick={() => setActiveLogKey(record)}
            >
              日志
            </Button>
            <Popconfirm
              focusLock
              title="删除后该 API Key 将立即不可用，确认删除？"
              onOk={() => handleDeleteApiKey(record)}
            >
              <Button type="text" size="small" status="danger" className={styles.tableActionButton}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
        return index === 0 ? (
          <OpenApiAnnotationMarker noteId="OAI-1.3">
            {actionContent}
          </OpenApiAnnotationMarker>
        ) : actionContent;
      },
    },
  ];

  const callLogColumns: ColumnProps<CallLogRow>[] = [
    { title: 'requestId', dataIndex: 'requestId', width: 190, render: (value) => renderEllipsis(value, styles.logIdCell) },
    { title: '接口', dataIndex: 'apiName', render: (value) => renderEllipsis(value, styles.logApiCell) },
    {
      title: '结果',
      dataIndex: 'result',
      width: 82,
      render: (value: CallLogRow['result']) => <Tag color={value === '成功' ? 'green' : 'red'}>{value}</Tag>,
    },
    { title: '错误码', dataIndex: 'errorCode', width: 128, render: (value) => renderEllipsis(value, styles.shortCell) },
    { title: '调用时间', dataIndex: 'callTime', width: 138, render: (value) => renderEllipsis(value, styles.dateCell) },
  ];

  const startProfileEditing = () => {
    setProfileDraftName(profileName);
    setProfileDraftAccount(profileAccount);
    setProfileEditing(true);
  };

  const cancelProfileEditing = () => {
    setProfileDraftName(profileName);
    setProfileDraftAccount(profileAccount);
    setProfileEditing(false);
  };

  const saveProfile = () => {
    const nextName = profileDraftName.trim();
    const nextAccount = profileDraftAccount.trim();
    if (!nextName || !nextAccount) {
      Message.warning('姓名和账号不能为空');
      return;
    }
    setProfileName(nextName);
    setProfileAccount(nextAccount);
    setProfileEditing(false);
    Message.success('账号资料已更新');
  };

  const renderAccountSettings = () => (
    <section className={styles.accountSettingsPage}>
      <header className={styles.accountPageHeader}>
        <Typography.Title heading={3} className={styles.accountPageTitle}>账号设置</Typography.Title>
        <Typography.Text className={styles.accountPageSubtitle}>管理账号资料、安全设置与数据存储</Typography.Text>
      </header>

      <div className={styles.accountWorkspace}>
        <section className={`${styles.accountCard} ${styles.profilePanel}`}>
          <div className={styles.profileIdentity}>
            <Avatar size={60} className={styles.profileAvatar}>
              <img src={userAvatar} alt={`${profileName}头像`} />
            </Avatar>
            {profileEditing ? (
              <div className={styles.profileInlineEditor}>
                <Input
                  aria-label="姓名"
                  size="small"
                  value={profileDraftName}
                  onChange={setProfileDraftName}
                />
                <Input
                  aria-label="账号"
                  size="small"
                  value={profileDraftAccount}
                  onChange={setProfileDraftAccount}
                />
                <Button type="primary" size="small" onClick={saveProfile}>保存</Button>
                <Button size="small" onClick={cancelProfileEditing}>取消</Button>
              </div>
            ) : (
              <div className={styles.profileIdentityContent}>
                <strong>{profileName} <span>({profileAccount})</span></strong>
                <Button type="text" size="small" onClick={startProfileEditing}>编辑</Button>
              </div>
            )}
            <div className={styles.profileIdentityActions}>
              <Button type="text" size="small" onClick={() => Message.info('已打开密码修改入口')}>修改密码</Button>
            </div>
          </div>

          <dl className={styles.profileDetails}>
            <div><dt>租户名称</dt><dd>AA电子商务有限公司</dd></div>
            <div><dt>账号类型</dt><dd>企业版</dd></div>
            <div><dt>有效期</dt><dd>2026-12-31</dd></div>
          </dl>

          <div className={styles.resourceSummary}>
            <div>
              <span>云资源</span>
              <strong><IconCloud />2 台可用云桌面</strong>
            </div>
            <div>
              <span>连接器</span>
              <strong><IconLink />3 个已配置连接器</strong>
            </div>
          </div>

          <div className={styles.profileHint}>
            <IconInfoCircle />
            <span>如需变更企业信息或到期续费，请联系您的客户成功经理。</span>
          </div>
        </section>

        <section className={`${styles.accountCard} ${styles.storagePanel}`}>
          <div className={styles.storagePanelHeader}>
            <Typography.Title heading={5} className={styles.panelTitle}>存储管理</Typography.Title>
            <Typography.Text className={styles.storageDescription}>
              <IconInfoCircle />存储配置用于任务结果自动入库
            </Typography.Text>
          </div>

          <div className={styles.storageColumnHeader} aria-hidden="true">
            <span>数据源</span>
            <span>连接状态</span>
            <span>关键信息</span>
            <span>操作</span>
          </div>

          <div className={styles.storageList}>
            {storageOptions.map((item) => (
              <article className={styles.storageRow} key={item.key}>
                <div className={styles.storageIdentity}>
                  <span className={`${styles.storageIcon} ${styles[`storageIcon_${item.key}`]}`}>
                    <img
                      alt={`${item.name} Logo`}
                      className={styles.storageLogo}
                      height={24}
                      src={storageLogos[item.key]}
                      width={24}
                    />
                  </span>
                  <strong>{item.name}</strong>
                  {item.key === 'database' ? <Tag color="arcoblue" className={styles.recommendedTag}>推荐</Tag> : null}
                </div>
                <div>
                  <Tag color="green" className={styles.connectedTag}>
                    <span className={styles.statusDot} />已连接
                  </Tag>
                </div>
                <dl className={styles.storageDetails}>
                  {item.details.map((detail) => (
                    <div key={detail.label}>
                      <dt>{detail.label}</dt>
                      <dd>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.storageActions}>
                  <Button type="text" size="small" onClick={() => Message.info(`已打开${item.name}配置文档`)}>查看配置文档</Button>
                  <Button type="outline" size="small" onClick={() => Message.info(`已打开${item.name}编辑入口`)}>编辑</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );

  const renderDataSourceManagement = (showTitle = true) => (
    <section className={styles.accountSection}>
      {showTitle ? <Typography.Title heading={4} className={styles.profileTitle}>连接器管理</Typography.Title> : null}
      <Table
        rowKey="module"
        pagination={false}
        columns={[
          { title: '后台模块', dataIndex: 'module', width: 160 },
          { title: '管理内容', dataIndex: 'content' },
          { title: '状态', dataIndex: 'status', width: 96, render: (value) => <Tag color="green">{value}</Tag> },
        ]}
        data={[
          { module: '框架包管理', content: '维护数据源依赖框架包和运行版本', status: '启用' },
          { module: '数据源管理', content: '维护平台、子平台、数据源配置、有效期和启停状态', status: '启用' },
          { module: '登录组件管理', content: '维护账号登录、验证码、2FA、云号等登录组件', status: '启用' },
          { module: '平台类型管理', content: '维护电商、跨境、内容平台等平台类型', status: '启用' },
          { module: '平台名称管理', content: '维护淘宝、天猫、京东、抖音、拼多多等平台名称', status: '启用' },
          { module: '跨境字典映射管理', content: '维护跨境平台字段、类目、国家站点映射', status: '启用' },
        ]}
      />
    </section>
  );

  const renderSmsQueueManagement = (showTitle = true) => (
    <section className={styles.accountSection}>
      {showTitle ? <Typography.Title heading={4} className={styles.profileTitle}>短信队列管理</Typography.Title> : null}
      <Table
        rowKey="type"
        pagination={false}
        columns={[
          { title: '队列类型', dataIndex: 'type', width: 150 },
          { title: '适用登录方式', dataIndex: 'scene' },
          { title: '待处理', dataIndex: 'pending', width: 88 },
          { title: '失败', dataIndex: 'failed', width: 80 },
          { title: '状态', dataIndex: 'status', width: 96, render: (value, record) => <Tag color={record.failed > 0 ? 'orange' : 'green'}>{value}</Tag> },
          { title: '最近处理', dataIndex: 'lastHandled', width: 150 },
        ]}
        data={[
          { type: '真实手机号', scene: '店铺登录验证码，verifyCodeType = 0', pending: 3, failed: 0, status: '正常', lastHandled: '2026-07-15 14:12' },
          { type: '虚拟云号', scene: '云号接码，verifyCodeType = 1', pending: 8, failed: 1, status: '需关注', lastHandled: '2026-07-15 14:08' },
          { type: '2FA 密钥', scene: '密钥验证码，verifyCodeType = 3', pending: 0, failed: 0, status: '正常', lastHandled: '2026-07-15 13:56' },
        ]}
      />
    </section>
  );

  const renderRobotDeviceManagement = (showTitle = true) => (
    <section className={styles.accountSection}>
      {showTitle ? <Typography.Title heading={4} className={styles.profileTitle}>机器人设备管理</Typography.Title> : null}
      <Table
        rowKey="botUuid"
        pagination={false}
        columns={[
          { title: 'botUuid', dataIndex: 'botUuid', width: 140 },
          { title: '机器人名称', dataIndex: 'botName' },
          { title: '设备来源', dataIndex: 'source', width: 100 },
          { title: '机器人状态', dataIndex: 'status', width: 104, render: (value) => <Tag color={value === '忙碌' ? 'arcoblue' : value === '离线' ? 'red' : 'green'}>{value}</Tag> },
          { title: '绑定任务', dataIndex: 'task' },
          { title: '最近心跳', dataIndex: 'heartbeat', width: 150 },
        ]}
        data={[
          { botUuid: 'bot-001', botName: '云桌面机器人 01', source: '云端', status: '空闲', task: 'Codex 数据交付 Agent 核心链路压测', heartbeat: '2026-07-15 14:30' },
          { botUuid: 'bot-002', botName: '云桌面机器人 02', source: '云端', status: '忙碌', task: '生意参谋日常取数计划', heartbeat: '2026-07-15 14:28' },
          { botUuid: 'bot-003', botName: '本地机器人 03', source: '本地', status: '离线', task: '未绑定', heartbeat: '2026-07-15 09:41' },
        ]}
      />
    </section>
  );

  const renderPlatformPlaceholder = (title: AccountMenuKey) => (
    <section className={styles.accountSection}>
      <Typography.Title heading={4} className={styles.profileTitle}>{title}</Typography.Title>
      <Empty description={title === 'MCP 服务' ? '暂无已配置的 MCP 服务' : '暂无已配置的回调服务'} />
    </section>
  );

  const renderCurrentPage = () => {
    if (currentKey === '账号设置') {
      return renderAccountSettings();
    }
    if (currentKey === '连接器管理') return renderDataSourceManagement();
    if (currentKey === '短信队列管理') return renderSmsQueueManagement();
    if (currentKey === '机器人设备管理') return renderRobotDeviceManagement();
    if (currentKey === 'API Keys') return renderOpenApiKeyPage();
    return renderPlatformPlaceholder(currentKey);
  };

  const renderOpenApiKeyPage = () => (
    <section className={styles.openApiKeyPage}>
      <section className={styles.header}>
        <div>
          <OpenApiAnnotationMarker noteId="OAI-1.1">
            <Typography.Title heading={4} className={styles.title}>
              API Keys
            </Typography.Title>
          </OpenApiAnnotationMarker>
        </div>
        <OpenApiAnnotationMarker noteId="OAI-1.2">
          <Button type="primary" onClick={() => setCreateVisible(true)}>新建密钥</Button>
        </OpenApiAnnotationMarker>
      </section>

      <Table
        rowKey="id"
        className={styles.noWrapTable}
        columns={keyColumns}
        data={apiKeyRows}
        pagination={false}
        scroll={{ x: centerTableScrollX }}
        size="small"
      />
    </section>
  );

  const activeKeyLogs = activeLogKey
    ? callLogs.filter((item) => item.appKey === activeLogKey.appKey)
    : [];

  return (
    <>
      {renderCurrentPage()}

      <Modal
        title="新建 API Key"
        visible={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          setCreateName('');
        }}
        footer={(
          <Space>
            <Button onClick={() => {
              setCreateVisible(false);
              setCreateName('');
            }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleCreateApiKey}>创建</Button>
          </Space>
        )}
      >
        <div className={styles.createForm}>
          <label>
            名称
            <Input
              value={createName}
              maxLength={32}
              placeholder="例如 Codex 数据交付 Agent"
              onChange={setCreateName}
            />
          </label>
        </div>
      </Modal>

      <Modal
        title={activeLogKey ? `${activeLogKey.name} 调用日志` : '调用日志'}
        visible={Boolean(activeLogKey)}
        footer={null}
        onCancel={() => setActiveLogKey(null)}
      >
        <Table
          rowKey="id"
          pagination={false}
          columns={callLogColumns}
          data={activeKeyLogs}
          size="small"
        />
      </Modal>

    </>
  );
}
