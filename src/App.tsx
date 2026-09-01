import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  ConfigProvider,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Layout,
  Menu,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import {
  IconApps,
  IconCloud,
  IconDown,
  IconList,
  IconMenuFold,
  IconMenuUnfold,
  IconNotification,
  IconRefresh,
  IconSafe,
  IconSettings,
  IconStorage,
} from '@arco-design/web-react/icon';
import blankCalendarIcon from '@/assets/icons/streamline-core-flat-free/blank-calendar.svg';
import cyborgIcon from '@/assets/icons/streamline-core-flat-free/cyborg.svg';
import databaseIcon from '@/assets/icons/streamline-core-flat-free/database.svg';
import graphDotIcon from '@/assets/icons/streamline-core-flat-free/graph-dot.svg';
import linkChainIcon from '@/assets/icons/streamline-core-flat-free/link-chain.svg';
import mailSendEmailMessageIcon from '@/assets/icons/streamline-core-flat-free/mail-send-email-message.svg';
import storeIcon from '@/assets/icons/streamline-core-flat-free/store-1.svg';
import userProfileFocusIcon from '@/assets/icons/streamline-core-flat-free/user-profile-focus.svg';
import verticalSliderIcon from '@/assets/icons/streamline-core-flat-free/vertical-slider-square.svg';
import logo from '@/assets/images/qsb-logo.svg';
import userAvatar from '@/assets/images/user-avatar.png';
import {
  accountDefaultMenuKey,
  getVisibleAccountMenuKeys,
  isAccountArea,
  isAccountMenuKey,
  isRequirementAvailableToTenantRole,
} from '@/accountNavigation';
import type { AccountMenuKey, TenantRole } from '@/accountNavigation';
import { autoRetryAnnotations, AutoRetryAnnotationDrawer } from '@/components/autoRetryAnnotations';
import {
  etlDataMonitoringAnnotations,
  EtlDataMonitoringAnnotationDrawer,
} from '@/components/etlDataMonitoringAnnotations';
import { messageCenterAnnotations, MessageCenterAnnotationDrawer, MessageCenterAnnotationMarker } from '@/components/messageCenterAnnotations';
import type { RequirementAnnotation } from '@/components/requirementAnnotations';
import {
  getUnreadMessageCount,
  MessageCenterModal,
} from '@/components/messageCenter';
import type {
  AnnouncementMessageItem,
  DataMessageItem,
} from '@/components/messageCenter';
import { RequirementProvider } from '@/context/RequirementContext';
import type { RequirementKey } from '@/context/RequirementContext';
import {
  isRequirementPendingAlignment,
  iterationMeta,
  iterationRequirements,
} from '@/iterationRequirements';
import AnnouncementManagement from '@/pages/announcementManagement';
import AutoRetryOptimization from '@/pages/autoRetryOptimization';
import AutoRetryOptimizationPrd from '@/pages/autoRetryOptimizationPrd';
import BusinessCustomParameterExperiencePrd from '@/pages/businessCustomParameterExperiencePrd';
import CloudResourceAutomationPrd from '@/pages/cloudResourceAutomationPrd';
import ConnectorManagement from '@/pages/connectorManagement';
import EtlDataMonitoringOptimization from '@/pages/etlDataMonitoringOptimization';
import EtlDataMonitoringOptimizationPrd from '@/pages/etlDataMonitoringOptimizationPrd';
import Market from '@/pages/market';
import MessageCenterPrd from '@/pages/messageCenterPrd';
import OpenApiOptimization from '@/pages/openApiOptimization';
import OpenApiOptimizationPrd from '@/pages/openApiOptimizationPrd';
import ParameterManagement from '@/pages/parameterManagement';
import PushStrategyCenter from '@/pages/pushStrategyCenter';
import type { ParameterMenuKey } from '@/pages/parameterManagement';
import QsbOverview from '@/pages/qsbOverview';
import type { OverviewRunFilters } from '@/pages/qsbOverview/overviewContent';
import QsbOverviewPrd from '@/pages/qsbOverviewPrd';
import TaskPlanManagement from '@/pages/taskPlanManagement';
import TenantManagement from '@/pages/tenantManagement';
import WuyingManagement from '@/pages/wuyingManagement';

const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Text } = Typography;

type ProductTopTab = '电商取数宝' | '跨境取数宝';
type RequirementView = 'prd' | 'prototype';
const currentTenantRole: TenantRole = 'tenantAdmin';

const streamlineMenuIcons = {
  'graph-dot': graphDotIcon,
  'store-1': storeIcon,
  'blank-calendar': blankCalendarIcon,
  database: databaseIcon,
  'vertical-slider-square': verticalSliderIcon,
  'user-profile-focus': userProfileFocusIcon,
  'link-chain': linkChainIcon,
  'mail-send-email-message': mailSendEmailMessageIcon,
  cyborg: cyborgIcon,
} as const;

type StreamlineMenuIconName = keyof typeof streamlineMenuIcons;

const StreamlineMenuIcon = ({ name }: { name: StreamlineMenuIconName }) => (
  <img
    alt=""
    aria-hidden="true"
    className="portal-menu-streamline-icon"
    data-streamline-icon={name}
    height={16}
    src={streamlineMenuIcons[name]}
    width={16}
  />
);

const productTopTabs: ProductTopTab[] = ['电商取数宝', '跨境取数宝'];
const portalTopTabs = ['数据源市场', ...productTopTabs, '推送策略中心', '后台管理'];
const accountMenuIcons: Record<AccountMenuKey, ReactNode> = {
  账号设置: <StreamlineMenuIcon name="user-profile-focus" />,
  连接器管理: <StreamlineMenuIcon name="link-chain" />,
  短信队列管理: <StreamlineMenuIcon name="mail-send-email-message" />,
  机器人设备管理: <StreamlineMenuIcon name="cyborg" />,
  操作日志: <IconList />,
  'API Keys': <IconSafe />,
  'MCP 服务': <IconCloud />,
  回调服务: <IconRefresh />,
};
const parameterMenuKeys: ParameterMenuKey[] = [
  '本店商品配置',
  '行业类目配置',
  '竞品店铺配置',
  '竞品商品配置',
  '竞品品牌配置',
];
const isProductTopTab = (tab: string): tab is ProductTopTab => (
  productTopTabs.includes(tab as ProductTopTab)
);

const isParameterMenuKey = (value: string): value is ParameterMenuKey => (
  parameterMenuKeys.includes(value as ParameterMenuKey)
);

const isRequirementKey = (value: string | null): value is RequirementKey => (
  Boolean(value && iterationRequirements.some((item) => item.key === value))
);

const isRequirementView = (value: string | null): value is RequirementView => (
  value === 'prd' || value === 'prototype'
);

const getRequirementDefaultPortalState = (key: RequirementKey) => {
  if (key === 'messageCenter') return { topTab: '后台管理', menuKey: '公告管理' };
  if (key === 'pushStrategyOptimization') return { topTab: '推送策略中心', menuKey: '' };
  if (key === 'cloudResourceAutomation') return { topTab: '后台管理', menuKey: '租户管理-生态' };
  if (key === 'qsbOverview') return { topTab: '电商取数宝', menuKey: '取数宝概览' };
  if (key === 'autoRetryOptimization') return { topTab: '电商取数宝', menuKey: '计划管理' };
  if (key === 'openApiOptimization') return { topTab: '开放平台', menuKey: 'API Keys' };
  if (key === 'portalOperationLog') return { topTab: '个人中心', menuKey: '操作日志' };
  if (key === 'etlDataMonitoringOptimization') return { topTab: '电商取数宝', menuKey: '数据监控' };
  if (key === 'businessCustomParameterExperience') return { topTab: '电商取数宝', menuKey: '本店商品配置' };
  return { topTab: '电商取数宝', menuKey: '本店商品配置' };
};

const getPortalPopupContainer = () =>
  document.querySelector<HTMLElement>('.portal-popup-root') || document.body;

const backendMenuGroups = [
  {
    key: '数据源管理',
    icon: <IconApps />,
    items: [
      { key: '框架包管理', label: '框架包管理' },
      { key: '数据源管理', label: '数据源管理' },
      { key: '登录组件管理', label: '登录组件管理' },
      { key: '平台类型管理', label: '平台类型管理' },
      { key: '平台名称管理', label: '平台名称管理' },
      { key: '跨境字典映射管理', label: '跨境字典映射管理' },
    ],
  },
  {
    key: '入库管理',
    icon: <IconStorage />,
    items: [
      { key: '表字段提交', label: '表字段提交' },
      { key: '字段字典提交', label: '字段字典提交' },
      { key: '入库记录', label: '入库记录' },
      { key: '数据处理管理', label: '数据处理管理' },
      { key: '数据巡检', label: '数据巡检' },
    ],
  },
  {
    key: '生态管理',
    icon: <IconCloud />,
    items: [
      { key: '租户管理-生态', label: '租户管理' },
      { key: '渠道资源管理', label: '渠道资源管理' },
      { key: '订单管理-生态', label: '订单管理' },
      { key: '云资源管理', label: '云资源管理' },
      { key: '测算采购单管理', label: '测算采购单管理' },
    ],
  },
  {
    key: '消息管理',
    icon: <IconNotification />,
    items: [
      { key: '公告管理', label: '公告管理' },
    ],
  },
];

const initialDataMessages: DataMessageItem[] = [
  {
    id: 'data-msg-001',
    unread: true,
    status: 'failed',
    planName: '天猫旗舰店-商品明细日采集',
    workId: 'WORK-20260721-09001',
    tableName: 'dwd_item_detail_day',
    shopName: '森宁家居旗舰店',
    actionName: '商品明细拉取',
    successCount: 18,
    failedCount: 2,
    totalCount: 20,
    reason: '生意参谋登录态失效，接口返回 401，请重新授权后继续处理。',
    createdAt: '2026-07-21 09:18',
  },
  {
    id: 'data-msg-002',
    unread: true,
    status: 'timeout',
    planName: '竞品店铺-流量趋势小时采集',
    workId: 'WORK-20260721-08312',
    tableName: 'ads_compete_store_traffic_hour',
    shopName: '乐享测试店',
    actionName: '流量趋势取数',
    successCount: 0,
    failedCount: 1,
    totalCount: 1,
    reason: '平台接口 30 分钟内未返回结果，系统已判定超时。',
    createdAt: '2026-07-21 08:54',
  },
  {
    id: 'data-msg-003',
    unread: false,
    status: 'partial_success',
    planName: '多店铺订单表-每日回溯',
    workId: 'WORK-20260720-22109',
    tableName: 'dwd_order_detail_day',
    shopName: '林华旗舰店、qishui2',
    actionName: '订单详情回溯',
    successCount: 7,
    failedCount: 1,
    totalCount: 8,
    reason: 'qishui2 店铺缺少订单明细权限，其他店铺已取数成功。',
    createdAt: '2026-07-20 22:31',
  },
  {
    id: 'data-msg-004',
    unread: false,
    status: 'running',
    planName: '商品库存表-实时采集',
    workId: 'WORK-20260721-10116',
    tableName: 'ods_item_stock_realtime',
    shopName: '取数宝授权三',
    actionName: '库存实时同步',
    successCount: 6,
    failedCount: 0,
    totalCount: 12,
    createdAt: '2026-07-21 10:16',
  },
  {
    id: 'data-msg-005',
    unread: false,
    status: 'success',
    planName: '本店商品表-核心款采集',
    workId: 'WORK-20260721-07208',
    tableName: 'dim_item_core',
    shopName: '森宁家居旗舰店',
    actionName: '商品基础信息取数',
    successCount: 1,
    failedCount: 0,
    totalCount: 1,
    createdAt: '2026-07-21 07:20',
  },
];

const initialAnnouncementMessages: AnnouncementMessageItem[] = [
  {
    id: 'announcement-msg-001',
    unread: true,
    type: '平台公告',
    range: '电商取数宝',
    status: 'published',
    title: '生意参谋商品表字段口径调整通知',
    summary: '商品明细表部分字段口径将在 7 月 24 日更新，请关注相关计划的运行结果。',
    publishedAt: '2026-07-21 09:30',
    linkLabel: '查看详情',
    linkUrl: '/help/business-advisor-field-rule',
    readCount: 128,
    totalCount: 326,
  },
  {
    id: 'announcement-msg-002',
    unread: true,
    type: '维护通知',
    range: '全部租户',
    status: 'published',
    title: '取数宝夜间维护通知',
    summary: '7 月 22 日 00:00-02:00 将进行取数服务维护，维护期间部分计划可能延迟执行。',
    publishedAt: '2026-07-20 18:00',
    readCount: 241,
    totalCount: 326,
  },
  {
    id: 'announcement-msg-003',
    unread: false,
    type: '运营公告',
    range: '跨境取数宝',
    status: 'draft',
    title: '跨境取数宝新增平台适配',
    summary: '跨境取数宝将新增平台适配能力，公告发布时间待确认。',
    publishedAt: '-',
    linkLabel: '查看功能介绍',
    linkUrl: '/market/cross-border-new-platform',
    readCount: 0,
    totalCount: 86,
  },
];

export default function App() {
  const requestedRequirement = new URLSearchParams(window.location.search).get('requirement');
  const initialRequirement = isRequirementKey(requestedRequirement)
    && isRequirementAvailableToTenantRole(currentTenantRole, requestedRequirement)
    ? requestedRequirement
    : iterationMeta.defaultRequirement;
  const initialView = isRequirementView(new URLSearchParams(window.location.search).get('tab'))
    ? new URLSearchParams(window.location.search).get('tab') as RequirementView
    : 'prd';
  const initialPortalState = getRequirementDefaultPortalState(initialRequirement);
  const annotationHighlightTimerRef = useRef<number>();
  const [activeRequirement, setActiveRequirement] = useState<RequirementKey>(initialRequirement);
  const [requirementView, setRequirementView] = useState<RequirementView>(initialView);
  const [annotationDrawerOpen, setAnnotationDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 1024px)').matches);
  const [selectedMenuKey, setSelectedMenuKey] = useState(initialPortalState.menuKey);
  const [selectedTopTab, setSelectedTopTab] = useState(initialPortalState.topTab);
  const [messageCenterVisible, setMessageCenterVisible] = useState(false);
  const [dataMessages, setDataMessages] = useState<DataMessageItem[]>(initialDataMessages);
  const [announcementMessages, setAnnouncementMessages] = useState<AnnouncementMessageItem[]>(initialAnnouncementMessages);
  const [activeRunDetail, setActiveRunDetail] = useState<DataMessageItem | null>(null);
  const [overviewRunFilters, setOverviewRunFilters] = useState<OverviewRunFilters | null>(null);
  const unreadMessageCount = getUnreadMessageCount(dataMessages, announcementMessages);
  const activeAnnotations = activeRequirement === 'messageCenter'
    ? messageCenterAnnotations
    : activeRequirement === 'autoRetryOptimization'
      ? autoRetryAnnotations
      : activeRequirement === 'etlDataMonitoringOptimization'
        ? etlDataMonitoringAnnotations
        : [];

  const updateRequirementUrl = (nextRequirement: RequirementKey, nextView: RequirementView) => {
    const params = new URLSearchParams(window.location.search);
    params.set('requirement', nextRequirement);
    params.set('tab', nextView);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const activateRequirement = (nextRequirement: RequirementKey, nextView = requirementView) => {
    if (!isRequirementAvailableToTenantRole(currentTenantRole, nextRequirement)) return;
    const nextPortalState = getRequirementDefaultPortalState(nextRequirement);
    setActiveRequirement(nextRequirement);
    setRequirementView(nextView);
    setAnnotationDrawerOpen(false);
    setMessageCenterVisible(false);
    setActiveRunDetail(null);
    setSelectedTopTab(nextPortalState.topTab);
    setSelectedMenuKey(nextPortalState.menuKey);
    updateRequirementUrl(nextRequirement, nextView);
  };

  const requirementViewMenu = (requirement: RequirementKey) => (
    <Menu
      selectedKeys={[requirementView]}
      onClickMenuItem={(key) => {
        activateRequirement(requirement, key as RequirementView);
      }}
    >
      <Menu.Item key="prd">PRD</Menu.Item>
      <Menu.Item key="prototype">交互原型</Menu.Item>
    </Menu>
  );

  const getPrdContent = () => {
    if (isRequirementPendingAlignment(activeRequirement)) {
      return <div className="portal-empty-page"><Empty description="需求待拉齐" /></div>;
    }
    if (activeRequirement === 'messageCenter') return <MessageCenterPrd />;
    if (activeRequirement === 'cloudResourceAutomation') return <CloudResourceAutomationPrd />;
    if (activeRequirement === 'qsbOverview') return <QsbOverviewPrd />;
    if (activeRequirement === 'autoRetryOptimization') return <AutoRetryOptimizationPrd />;
    if (activeRequirement === 'openApiOptimization') return <OpenApiOptimizationPrd />;
    if (activeRequirement === 'etlDataMonitoringOptimization') return <EtlDataMonitoringOptimizationPrd />;
    if (activeRequirement === 'businessCustomParameterExperience') return <BusinessCustomParameterExperiencePrd />;
    if (activeRequirement === 'pushStrategyOptimization') {
      return <div className="portal-empty-page"><Empty description="该需求暂未编写 PRD" /></div>;
    }
    return <MessageCenterPrd />;
  };

  const scrollAnnotationTargetIntoView = (target: HTMLElement) => {
    const scrollContainer = (() => {
      let node = target.parentElement;
      while (node) {
        const style = window.getComputedStyle(node);
        const canScroll = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
        if (canScroll) return node;
        node = node.parentElement;
      }
      return null;
    })();

    if (!scrollContainer) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const topOffset = Math.max(24, (containerRect.height - targetRect.height) / 2);
    scrollContainer.scrollTo({
      top: scrollContainer.scrollTop + targetRect.top - containerRect.top - topOffset,
      behavior: 'smooth',
    });
  };

  const highlightAnnotationTargets = (targets: HTMLElement[]) => {
    if (annotationHighlightTimerRef.current) {
      window.clearTimeout(annotationHighlightTimerRef.current);
    }
    document.querySelectorAll('.annotation-locate-highlight').forEach((element) => {
      element.classList.remove('annotation-locate-highlight');
    });
    document.querySelectorAll('.annotation-locate-group-highlight').forEach((element) => element.remove());

    if (targets.length === 1) {
      const [target] = targets;
      target.classList.remove('annotation-locate-highlight');
      void target.offsetWidth;
      target.classList.add('annotation-locate-highlight');
    } else {
      const rects = targets
        .map((target) => target.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const left = Math.max(8, Math.min(...rects.map((rect) => rect.left)));
      const top = Math.max(8, Math.min(...rects.map((rect) => rect.top)));
      const right = Math.min(window.innerWidth - 8, Math.max(...rects.map((rect) => rect.right)));
      const bottom = Math.min(window.innerHeight - 8, Math.max(...rects.map((rect) => rect.bottom)));
      const highlight = document.createElement('div');
      highlight.className = 'annotation-locate-group-highlight';
      Object.assign(highlight.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(0, right - left)}px`,
        height: `${Math.max(0, bottom - top)}px`,
      });
      document.body.appendChild(highlight);
    }

    annotationHighlightTimerRef.current = window.setTimeout(() => {
      targets.forEach((target) => target.classList.remove('annotation-locate-highlight'));
      document.querySelectorAll('.annotation-locate-group-highlight').forEach((element) => element.remove());
      annotationHighlightTimerRef.current = undefined;
    }, 6000);
  };

  const handleLocateAnnotation = (annotation: RequirementAnnotation) => {
    setRequirementView('prototype');
    setSelectedTopTab(annotation.topTab);
    setSelectedMenuKey(annotation.menuKey);
    updateRequirementUrl(activeRequirement, 'prototype');

    const locateMarker = (remainingTries = 48) => {
      const markers = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-note-id="${annotation.noteId}"]`),
      );
      if (markers.length > 0) {
        scrollAnnotationTargetIntoView(markers[0]);
        window.setTimeout(() => highlightAnnotationTargets(markers), 360);
        return;
      }
      if (remainingTries > 0) {
        window.setTimeout(() => locateMarker(remainingTries - 1), 120);
      }
    };

    if (annotation.openEvent) {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(annotation.openEvent)), 240);
      window.setTimeout(() => {
        const marker = document.querySelector<HTMLElement>(`[data-note-id="${annotation.noteId}"]`);
        if (!marker) {
          window.dispatchEvent(new CustomEvent(annotation.openEvent));
        }
      }, 720);
    }
    window.setTimeout(() => locateMarker(), annotation.openEvent ? 900 : 260);
  };

  useEffect(() => {
    const openPlanWithConnector = (event: Event) => {
      setSelectedTopTab('电商取数宝');
      setSelectedMenuKey('计划管理');
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('task-plan:open-plan-drawer', {
          detail: (event as CustomEvent).detail,
        }));
      }, 300);
    };

    window.addEventListener('market:use-connector', openPlanWithConnector);
    return () => window.removeEventListener('market:use-connector', openPlanWithConnector);
  }, []);

  useEffect(() => {
    const openMessageCenter = () => setMessageCenterVisible(true);
    window.addEventListener('message-center:open', openMessageCenter);
    return () => window.removeEventListener('message-center:open', openMessageCenter);
  }, []);

  const backendContent =
    selectedMenuKey === '数据源管理' ? (
      <ConnectorManagement />
    ) : selectedMenuKey === '租户管理-生态' ? (
      <TenantManagement />
    ) : selectedMenuKey === '云资源管理' ? (
      <WuyingManagement />
    ) : selectedMenuKey === '公告管理' ? (
      <AnnouncementManagement
        records={announcementMessages}
        onRecordsChange={setAnnouncementMessages}
      />
    ) : (
      <div className="portal-empty-page">
        <Empty description="暂无数据" />
      </div>
    );
  const frontContent = selectedMenuKey === '取数宝概览' ? (
    <QsbOverview
      onViewRuns={(filters) => {
        setOverviewRunFilters(filters);
        setSelectedMenuKey('运行记录');
      }}
    />
  ) : selectedMenuKey === '计划管理' ? (
    <TaskPlanManagement />
  ) : selectedMenuKey === '运行记录' ? (
    <AutoRetryOptimization page="运行记录" initialRunFilters={overviewRunFilters ?? undefined} />
  ) : selectedMenuKey === '数据监控' ? (
    <EtlDataMonitoringOptimization />
  ) : isParameterMenuKey(selectedMenuKey) ? (
    <ParameterManagement menuKey={selectedMenuKey} />
  ) : <div className="portal-empty-page"><Empty description="暂无数据" /></div>;
  const content = isAccountArea(selectedTopTab)
    ? (
      <OpenApiOptimization
        activeKey={selectedMenuKey}
        onActiveKeyChange={setSelectedMenuKey}
      />
    )
    : selectedTopTab === '后台管理'
      ? backendContent
      : isProductTopTab(selectedTopTab)
        ? frontContent
        : selectedTopTab === '数据源市场'
          ? <Market />
          : selectedTopTab === '推送策略中心'
            ? <PushStrategyCenter />
            : <div className="portal-empty-page"><Empty description="暂无数据" /></div>;
  const showPortalSider = selectedTopTab === '后台管理'
    || isProductTopTab(selectedTopTab)
    || isAccountArea(selectedTopTab);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const collapseOnNarrowViewport = () => {
      if (mediaQuery.matches) setCollapsed(true);
    };

    collapseOnNarrowViewport();
    mediaQuery.addEventListener('change', collapseOnNarrowViewport);
    return () => mediaQuery.removeEventListener('change', collapseOnNarrowViewport);
  }, []);

  useEffect(() => () => {
    if (annotationHighlightTimerRef.current) {
      window.clearTimeout(annotationHighlightTimerRef.current);
    }
  }, []);

  const handleUserMenuClick = (key: string) => {
    const area = key === 'profile'
      ? '个人中心'
      : key === 'open-platform'
        ? '开放平台'
        : null;
    if (!area) return;
    setSelectedTopTab(area);
    setSelectedMenuKey(accountDefaultMenuKey[area]);
    setCollapsed(false);
  };

  const handleSideMenuClick = (key: string) => {
    if (key !== '运行记录') setActiveRunDetail(null);
    if (key === '运行记录') setOverviewRunFilters(null);
    setSelectedMenuKey(key);
  };

  const markDataMessageRead = (id: string) => {
    setDataMessages((prev) => prev.map((item) => (
      item.id === id ? { ...item, unread: false } : item
    )));
  };

  const markAnnouncementMessageRead = (id: string) => {
    setAnnouncementMessages((prev) => prev.map((item) => (
      item.id === id ? { ...item, unread: false } : item
    )));
  };

  const openRunDetailFromMessage = (message: DataMessageItem) => {
    markDataMessageRead(message.id);
    setMessageCenterVisible(false);
    setSelectedTopTab('电商取数宝');
    setSelectedMenuKey('运行记录');
    setActiveRunDetail(message);
  };

  const userMenu = (
    <Menu className="portal-user-menu" onClickMenuItem={handleUserMenuClick}>
      <Menu.Item key="profile">个人中心</Menu.Item>
      <Menu.Item key="open-platform">开放平台</Menu.Item>
      <Menu.Item key="logout">退出登录</Menu.Item>
    </Menu>
  );

  const handleTopTabChange = (nextTopTab: string) => {
    setActiveRunDetail(null);
    setSelectedTopTab(nextTopTab);
    if (nextTopTab === '后台管理') {
      setSelectedMenuKey('租户管理-生态');
    } else if (isProductTopTab(nextTopTab)) {
      setSelectedMenuKey('本店商品配置');
    } else {
      setSelectedMenuKey('');
    }
  };

  return (
    <RequirementProvider value={activeRequirement}>
      <ConfigProvider
        getPopupContainer={getPortalPopupContainer}
        componentConfig={{
          Drawer: { getPopupContainer: getPortalPopupContainer },
          Modal: { getPopupContainer: getPortalPopupContainer },
        }}
      >
        <div className="requirement-shell">
          <div className="iteration-bar">
            <span className="iteration-title">{iterationMeta.title}</span>
            <div className="iteration-requirements" role="tablist" aria-label={iterationMeta.tabListLabel}>
              {iterationRequirements.map((item) => (
                  <Dropdown
                    key={item.key}
                    droplist={requirementViewMenu(item.key)}
                    position="bl"
                    trigger="click"
                  >
                    <Button
                      aria-selected={activeRequirement === item.key}
                      className={`iteration-requirement${activeRequirement === item.key ? ' active' : ''}`}
                      role="tab"
                      type="text"
                      onClick={() => activateRequirement(item.key)}
                    >
                      <span>{item.label}</span>
                      {activeRequirement === item.key ? (
                        <Tag className="iteration-view-tag" color="arcoblue">
                          {requirementView === 'prd' ? 'PRD' : '交互原型'}
                        </Tag>
                      ) : null}
                      <IconDown className="iteration-dropdown-icon" />
                    </Button>
                  </Dropdown>
              ))}
            </div>
            <Button
              className="annotation-entry"
              icon={<IconList />}
              type="secondary"
              disabled={!activeAnnotations.length}
              onClick={() => setAnnotationDrawerOpen((open) => !open)}
            >
              交互标注 {activeAnnotations.length}
            </Button>
          </div>
          <div className={`requirement-workspace${annotationDrawerOpen ? ' annotation-panel-open' : ''}`}>
            {requirementView === 'prd' ? (
              <div className="requirement-view requirement-view-prd">
                {getPrdContent()}
              </div>
            ) : (
              <div className="requirement-view requirement-view-prototype">
                {isRequirementPendingAlignment(activeRequirement) ? (
                  <div className="portal-empty-page"><Empty description="需求待拉齐" /></div>
                ) : (
                  <div className="portal-popup-root">
            <Layout className="portal-layout">
            <Header className="portal-header">
              <div className={`portal-brand${collapsed ? ' portal-brand-collapsed' : ''}`}>
                <img src={logo} alt="取数宝" className="portal-logo" />
                {!collapsed && <Text className="portal-logo-text">取数宝</Text>}
                <Button
                  type="text"
                  size="small"
                  className="portal-collapse-button"
                  icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
                  aria-label={collapsed ? '展开侧边导航' : '收起侧边导航'}
                  onClick={() => setCollapsed((value) => !value)}
                />
              </div>

              <Tabs
                type="text"
                headerPadding={false}
                activeTab={selectedTopTab}
                className="portal-top-tabs"
                onChange={handleTopTabChange}
              >
                {portalTopTabs.map((tab) => (
                  <TabPane key={tab} title={tab} />
                ))}
              </Tabs>

              <div className="portal-actions">
                <MessageCenterAnnotationMarker noteId="MSG-1">
                  <Badge count={unreadMessageCount} maxCount={99} offset={[-2, 2]}>
                    <Button
                      type="text"
                      size="mini"
                      className="portal-notification-button"
                      icon={<IconNotification />}
                      aria-label="消息通知"
                      onClick={() => setMessageCenterVisible(true)}
                    />
                  </Badge>
                </MessageCenterAnnotationMarker>
                <Divider type="vertical" className="portal-action-divider" />
                <Dropdown droplist={userMenu} position="br" trigger="click">
                  <Button type="text" className="portal-user-trigger">
                    <Avatar size={28} className="portal-avatar">
                      <img src={userAvatar} alt="" />
                    </Avatar>
                    <Text className="portal-user-name">森森</Text>
                    <IconDown className="portal-user-arrow" />
                  </Button>
                </Dropdown>
              </div>
            </Header>

            <Layout className="portal-body" hasSider={showPortalSider}>
              {showPortalSider ? (
                <Sider
                  width={220}
                  collapsedWidth={48}
                  collapsed={collapsed}
                  theme="light"
                  trigger={null}
                  className="portal-sider"
                >
                  <Menu
                    key={selectedTopTab}
                    mode="vertical"
                    collapse={collapsed}
                    selectedKeys={[selectedMenuKey]}
                    defaultOpenKeys={isProductTopTab(selectedTopTab)
                        ? ['计划中心', '数据中心', '参数管理']
                        : ['数据源管理', '入库管理', '生态管理', '消息管理']}
                    className="portal-side-menu"
                    onClickMenuItem={handleSideMenuClick}
                  >
                    {isAccountArea(selectedTopTab) ? (
                      getVisibleAccountMenuKeys(selectedTopTab, currentTenantRole).map((item) => (
                        <Menu.Item key={item}>
                          {accountMenuIcons[item]}
                          <span className="portal-menu-label">{item}</span>
                        </Menu.Item>
                      ))
                    ) : isProductTopTab(selectedTopTab) ? (
                      <>
                        <Menu.Item key="取数宝概览">
                                  <StreamlineMenuIcon name="graph-dot" />
                              <span className="portal-menu-label">概览中心</span>
                        </Menu.Item>
                        <Menu.Item key="店铺管理">
                              <StreamlineMenuIcon name="store-1" />
                          <span className="portal-menu-label">店铺管理</span>
                        </Menu.Item>
                            <Menu.SubMenu key="计划中心" title={<><StreamlineMenuIcon name="blank-calendar" /><span className="portal-menu-label">计划中心</span></>}>
                          <Menu.Item key="计划管理">计划管理</Menu.Item>
                          <Menu.Item key="运行记录">运行记录</Menu.Item>
                        </Menu.SubMenu>
                            <Menu.SubMenu key="数据中心" title={<><StreamlineMenuIcon name="database" /><span className="portal-menu-label">数据中心</span></>}>
                          <Menu.Item key="数据监控">数据监控</Menu.Item>
                          <Menu.Item key="数据准备（ETL）">数据准备（ETL）</Menu.Item>
                          <Menu.Item key="采集文件管理">采集文件管理</Menu.Item>
                        </Menu.SubMenu>
                            <Menu.SubMenu key="参数管理" title={<><StreamlineMenuIcon name="vertical-slider-square" /><span className="portal-menu-label">参数管理</span></>}>
                          <Menu.Item key="本店商品配置">本店商品配置</Menu.Item>
                          <Menu.Item key="行业类目配置">行业类目配置</Menu.Item>
                          <Menu.Item key="竞品店铺配置">竞品店铺配置</Menu.Item>
                          <Menu.Item key="竞品商品配置">竞品商品配置</Menu.Item>
                          <Menu.Item key="竞品品牌配置">竞品品牌配置</Menu.Item>
                        </Menu.SubMenu>
                      </>
                    ) : (
                      <>
                        {backendMenuGroups.map((group) => (
                          <Menu.SubMenu
                            key={group.key}
                            title={<>{group.icon}<span className="portal-menu-label">{group.key}</span></>}
                          >
                            {group.items.map((item) => (
                              <Menu.Item key={item.key}>{item.label}</Menu.Item>
                            ))}
                          </Menu.SubMenu>
                        ))}
                      </>
                    )}
                  </Menu>
                </Sider>
              ) : null}

              <Content
                className={[
                  'portal-content',
                  isProductTopTab(selectedTopTab)
                    && selectedMenuKey === '取数宝概览'
                    ? 'portal-content-qsb-overview'
                    : '',
                  isAccountArea(selectedTopTab) && isAccountMenuKey(selectedMenuKey)
                    ? 'portal-content-personal-center'
                    : '',
                ].filter(Boolean).join(' ')}
              >
                {content}
              </Content>
            </Layout>
            <MessageCenterModal
              visible={messageCenterVisible}
              dataMessages={dataMessages}
              announcementMessages={announcementMessages}
              onClose={() => setMessageCenterVisible(false)}
              onMarkDataRead={markDataMessageRead}
              onMarkAnnouncementRead={markAnnouncementMessageRead}
              onOpenRunDetail={openRunDetailFromMessage}
            />
            <Drawer
              width={560}
              title="运行详情"
              visible={Boolean(activeRunDetail)}
              footer={null}
              onCancel={() => setActiveRunDetail(null)}
            >
              {activeRunDetail ? (
                <div className="portal-run-detail-drawer">
                  <div className="portal-run-detail-title">{activeRunDetail.planName}</div>
                  <div className="portal-run-detail-list">
                    <div>
                      <span>数据表：</span>
                      <strong>{activeRunDetail.tableName}</strong>
                    </div>
                    <div>
                      <span>店铺：</span>
                      <strong>{activeRunDetail.shopName}</strong>
                    </div>
                    <div>
                      <span>计划名称：</span>
                      <strong>{activeRunDetail.planName}</strong>
                    </div>
                    <div>
                      <span>取数动作：</span>
                      <strong>{activeRunDetail.actionName}</strong>
                    </div>
                    <div>
                      <span>失败原因：</span>
                      <strong>{activeRunDetail.reason || '-'}</strong>
                    </div>
                  </div>
                </div>
              ) : null}
            </Drawer>
            </Layout>
                  </div>
                )}
              </div>
            )}
            {activeRequirement === 'autoRetryOptimization' ? (
              <AutoRetryAnnotationDrawer
                visible={annotationDrawerOpen}
                onClose={() => setAnnotationDrawerOpen(false)}
                onLocate={handleLocateAnnotation}
              />
            ) : activeRequirement === 'etlDataMonitoringOptimization' ? (
              <EtlDataMonitoringAnnotationDrawer
                visible={annotationDrawerOpen}
                onClose={() => setAnnotationDrawerOpen(false)}
                onLocate={handleLocateAnnotation}
              />
            ) : (
              <MessageCenterAnnotationDrawer
                visible={annotationDrawerOpen}
                onClose={() => setAnnotationDrawerOpen(false)}
                onLocate={handleLocateAnnotation}
              />
            )}
          </div>
        </div>
      </ConfigProvider>
    </RequirementProvider>
  );
}
