import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Message, Skeleton, Tag, Tooltip } from '@arco-design/web-react';
import { IconInfoCircle } from '@arco-design/web-react/icon';
import logo from '@/assets/images/qsb-logo.svg';
import { buildSemiSparklineSpec, getOverviewAuthorizationPresentation, getOverviewServicePresentation, overviewAccountSummary, overviewSavedLaborFormula } from './overviewContent';
import type { OverviewAuthorization } from './overviewContent';
import styles from './index.module.less';

const MetricSparklineChart = lazy(() => import('./OverviewCharts').then((module) => ({ default: module.MetricSparklineChart })));

// Prototype fixture; production maps the current tenant's avatar file to avatarUrl.
export const overviewTenantExample = { tenantName: '森森科技有限公司', avatarUrl: '', serviceType: '自用版', renewable: true };
// @千秋 provides the final fixed conversation URL. Do not substitute an unrelated URL.
const ACCOUNT_CONVERSATION_URL = '';

export function TenantServiceBadge({ serviceType }: { serviceType?: string | null }) {
  const presentation = getOverviewServicePresentation(serviceType);
  return presentation ? <Tag className={styles.serviceBadge} color={presentation.color}>{presentation.label}</Tag> : null;
}

export function TenantName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [name]);
  return <Tooltip disabled={!overflow} content={name} trigger={['hover', 'focus']}>
    <h1 ref={ref} tabIndex={overflow ? 0 : undefined}>{name}</h1>
  </Tooltip>;
}

export function OverviewAccountContent({ tenant = overviewTenantExample, loading = false, authorization }: {
  tenant?: { tenantName: string; avatarUrl?: string; serviceType?: string | null; renewable: boolean };
  loading?: boolean;
  authorization?: OverviewAuthorization;
}) {
  const valueSpec = useMemo(() => buildSemiSparklineSpec(overviewAccountSummary.sparklineValues), []);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [tenant.avatarUrl]);
  const entitlement = getOverviewAuthorizationPresentation(authorization ?? { kind: 'dated', expiresAt: overviewAccountSummary.expiresAt, renewable: tenant.renewable });
  if (loading) return <div className={styles.accountSkeleton} role="status" aria-label="个人信息加载中">
    <div aria-label="头像骨架"><Skeleton animation text={false} image={{ shape: 'circle', size: 'small' }} /></div>
    <div className={styles.skeletonCompany}>
      <div aria-label="租户名称骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
      <div aria-label="服务类型骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
    </div>
    <div className={styles.skeletonValue}>
      <div>
        <div className={styles.skeletonNumber}>
          <div aria-label="累计天数骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
          <div aria-label="天数单位骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
        </div>
        <div aria-label="累计已节省人力文案骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
      </div>
      <div className={styles.skeletonSpark} aria-label="人力趋势图骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
    </div>
    <div className={styles.skeletonExpiry} aria-label="到期信息与操作骨架"><Skeleton animation text={{ rows: 1, width: '100%' }} /></div>
  </div>;
  const openConversation = () => {
    if (ACCOUNT_CONVERSATION_URL) window.open(ACCOUNT_CONVERSATION_URL, '_blank', 'noopener,noreferrer');
    else Message.info('外部会话 URL 地址：@千秋（待提供，当前仅演示入口）');
  };
  return <>
    <img className={`${styles.tenantAvatar} ${!tenant.avatarUrl || avatarFailed ? styles.defaultTenantAvatar : ''}`} src={!avatarFailed && tenant.avatarUrl ? tenant.avatarUrl : logo} alt={`${tenant.tenantName}头像`} onError={() => setAvatarFailed(true)} />
    <div className={styles.companyRow}><TenantName name={tenant.tenantName} /><TenantServiceBadge serviceType={tenant.serviceType} /></div>
    <div className={styles.valueRow}>
      <div><strong>{overviewAccountSummary.savedLaborDays.toFixed(1)}<small>天</small></strong>
        <span className={styles.savedLaborLabel}>累计已节省人力<Tooltip content={overviewSavedLaborFormula} trigger={['hover', 'focus']}><button className={styles.savedLaborInfo} type="button" aria-label="查看累计已节省人力算法"><IconInfoCircle /></button></Tooltip></span>
      </div>
      <div className={styles.valueSpark} aria-label="累计节省人力趋势（时间口径待确认）"><Suspense fallback={null}><MetricSparklineChart spec={valueSpec} /></Suspense></div>
    </div>
    <div className={styles.expiry}><i />{entitlement.text}<button type="button" onClick={openConversation}>{entitlement.action}</button></div>
  </>;
}
