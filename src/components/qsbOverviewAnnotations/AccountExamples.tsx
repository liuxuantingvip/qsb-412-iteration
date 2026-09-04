import { useState } from 'react';
import { Form, Select } from '@arco-design/web-react';
import { OverviewAccountContent, overviewTenantExample, TenantServiceBadge } from '@/pages/qsbOverview/OverviewAccountContent';
import type { OverviewAuthorization, OverviewServiceType } from '@/pages/qsbOverview/overviewContent';
import { overviewSavedLaborFormula } from '@/pages/qsbOverview/overviewContent';
import { OverviewAssetGrid } from '@/pages/qsbOverview/OverviewAssetGrid';
import { RobotOverloadWarning, RobotOverloadBadge } from '@/pages/qsbOverview/RobotOverloadWarning';
import cardStyles from '@/pages/qsbOverview/index.module.less';
import styles from './AccountExamples.module.less';

function ServiceConfigurationExample() {
  const [value, setValue] = useState<OverviewServiceType | undefined>('自用版');
  return <div className={styles.example}>
    <strong>租户详情 · 基本信息（新增字段）</strong>
    <Form layout="vertical">
      <Form.Item label="服务类型" extra="非必填，可清空；保存后按所选类型展示。">
        <Select aria-label="服务类型配置示例" allowClear placeholder="请选择服务类型" value={value} options={['自用版', '全托版']} onChange={setValue} />
      </Form.Item>
    </Form>
    <div className={`${cardStyles.card} ${cardStyles.accountCard} ${styles.card}`}>
      <OverviewAccountContent tenant={{ ...overviewTenantExample, serviceType: value }} />
    </div>
  </div>;
}

function AccountActionExample() {
  const [state, setState] = useState('never-purchased');
  const authorization: OverviewAuthorization = state === 'never-purchased'
    ? { kind: 'never-purchased' }
    : { kind: 'dated', expiresAt: '2027-08-21', renewable: state === 'renewable' };
  return <div className={styles.example}>
    <Select className={styles.actionControl} aria-label="授权状态示例" value={state} onChange={setState} options={[{value:'renewable',label:'已购买 · 可续期'}, {value:'non-renewable',label:'已购买 · 不可续期'}, {value:'never-purchased',label:'从未购买'}]} />
    <div className={`${cardStyles.card} ${cardStyles.accountCard} ${styles.card}`}><OverviewAccountContent authorization={authorization} /></div>
  </div>;
}

export function renderAccountExample(key: string) {
  if (key === 'robot-overload') return <div className={styles.example}>
    <span className={styles.caption}>排期工具栏提示</span>
    <RobotOverloadWarning />
    <span className={styles.caption}>对应机器人名称下方的标签</span>
    <div className={cardStyles.monthlyRobotName} style={{ position: 'static', border: 0 }}>
      <strong>Zane Zhou</strong><span>76 个计划</span><RobotOverloadBadge />
    </div>
  </div>;
  if (key === 'asset-loading') return <div className={`${cardStyles.card} ${cardStyles.assetCard} ${styles.card} ${styles.example}`}>
    <div className={cardStyles.cardHeading}><h2>我的资产</h2></div><OverviewAssetGrid loading />
  </div>;
  if (key === 'account-service-config') return <ServiceConfigurationExample />;
  if (key === 'account-self') return <div className={styles.badge}><TenantServiceBadge serviceType="自用版" /></div>;
  if (key === 'account-managed') return <div className={styles.badge}><TenantServiceBadge serviceType="全托版" /></div>;
  if (key === 'account-action') return <AccountActionExample />;
  if (key === 'account-formula') return <div className={styles.example}>
    <span className={styles.caption}>说明浮层的完整文案（与页面共用）</span>
    <div className="arco-tooltip-content" role="note"><div className="arco-tooltip-content-inner">{overviewSavedLaborFormula}</div></div>
  </div>;
  if (key === 'account-loading' || key === 'account-long-name') return <div className={styles.example}>
    <div className={`${cardStyles.card} ${cardStyles.accountCard} ${styles.card}`}>
      <OverviewAccountContent loading={key === 'account-loading'} tenant={{ ...overviewTenantExample, tenantName: '森森科技有限公司华东区域电商数据运营中心' }} />
    </div>
    {key === 'account-long-name' ? <span className={styles.caption}>悬浮或 Tab 聚焦被省略的名称，查看完整 Tooltip。</span> : null}
  </div>;
  return null;
}
