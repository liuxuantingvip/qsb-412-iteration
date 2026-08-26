import type { ReactNode } from 'react';
import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const versionRows = [
  ['版本', '更新时间', '本次调整', '状态'],
  ['V1.4', '2026/07/29', '按确认范围重写页面改动清单，并同步交互标注', '待研发评审'],
];

const scopeRows = [
  ['部分', '范围', '目标'],
  ['一、交互与信息展示优化', '监控视图卡片、店铺维度列表、状态说明浮层', '调整颜色、列顺序和操作位置，解决浮层内容被截断。'],
  ['二、数据交付状态口径优化', '店铺维度、数据表维度及下钻明细', '聚合表展示最终交付状态；下钻表按三段链路状态定位问题。'],
];

const statusDefinitionRows = [
  ['聚合状态', '判定规则', '展示'],
  ['失败', '命中平台侧或 RPA 流程侧取数错误；或数据入库失败。', '红色 Tag；hover 展示问题阶段、错误码和原因。'],
  ['异常', '命中客户侧取数错误；或数据已入库，但任一表校验规则不通过。', '橙色 Tag；hover 展示错误码或未通过的校验规则。'],
  ['等待', '取数、重试、入库或校验尚未结束，且不存在失败或异常。', '蓝色 Tag；展示当前环节。'],
  ['成功', '数据已入库；未开启表校验，或开启后全部规则通过。', '绿色 Tag。'],
  ['无任务', '当前业务日期下全部明细均无实际任务。', '灰色 Tag；不支持下钻。'],
];

const aggregationRows = [
  ['规则', '结果'],
  ['全部明细均无任务', '显示无任务。'],
  ['存在至少一条实际任务', '忽略无任务明细。'],
  ['存在多种实际任务状态', '按“失败 > 异常 > 等待 > 成功”取最高优先级。'],
  ['错误码数值相同但链路阶段不同', '先判断取数或入库阶段，再映射状态；不将错误码作为全局唯一值。'],
];

const interactionChangeRows = [
  ['标注', '页面位置', '改动与规则', '验收'],
  [
    <strong data-note-id="ETL-1.1">1.1</strong>,
    '监控视图列表',
    '卡片顶部装饰由黄色渐变调整为蓝色渐变；其他卡片能力不变。',
    '所有卡片不再出现黄色渐变。',
  ],
  [
    <strong data-note-id="ETL-2.1">2.1</strong>,
    '店铺维度列表',
    '前五列调整为平台类型、子平台、店铺名称、动态取数时间范围、关联任务；时间范围取当前日期状态列的最早日期至最晚日期。',
    '列顺序正确，时间范围与当前日期列一致。',
  ],
  [
    <strong data-note-id="ETL-2.2">2.2</strong>,
    '店铺维度工具栏',
    '刷新按钮移动到状态筛选左侧，保持纯图标按钮样式。',
    '刷新位置与原型一致，点击可刷新当前监控数据。',
  ],
  [
    <strong data-note-id="ETL-3.1">3.1</strong>,
    '状态说明',
    '状态说明浮层从按钮下方展开，展示五种聚合状态及判定说明。',
    '浮层内容完整可见，不被页面顶部或容器裁切。',
  ],
];

const statusChangeRows = [
  ['标注', '页面位置', '改动与规则', '验收'],
  [
    <strong data-note-id="ETL-2.3">2.3</strong>,
    '店铺维度日期状态',
    '日期状态改为数据交付最终结果；按“失败 > 异常 > 等待 > 成功”聚合，有实际任务时忽略无任务。hover 展示原因，点击进入对应店铺和业务日期的明细。',
    '状态口径、混合状态优先级及下钻对象正确；无任务不下钻。',
  ],
  [
    <strong data-note-id="ETL-3.3">3.3</strong>,
    '数据表维度日期状态',
    '日期状态改为数据交付最终结果；聚合规则与店铺维度一致。hover 展示原因，点击进入对应数据表和业务日期的明细。',
    '状态口径、混合状态优先级及下钻对象正确；无任务不下钻。',
  ],
  [
    <strong data-note-id="ETL-4.2">4.2</strong>,
    '下钻明细表',
    '删除最终状态、问题阶段、错误码、失败/异常原因独立列；保留取数执行、数据入库、数据校验三段状态。',
    'hover 具体失败或异常状态时展示对应错误码和原因。',
  ],
];

const outOfScopeRows = [
  ['本期不做', '说明'],
  ['错误码及表校验配置改版', '只消费现有错误码、校验配置和结果，不调整其生成或配置能力。'],
  ['通过错误文案判断状态', '状态只按链路阶段、错误码和表校验结果计算。'],
  ['自定义列能力改造', '自定义列为原有能力，本期不调整。'],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function EtlDataMonitoringOptimizationPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>
        数据监控优化
      </Typography.Title>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={versionRows} /></Section>
          <Section title="需求背景">
            <p className={styles.paragraph}>
              现有数据监控主要展示任务执行状态，容易把“任务成功”误认为“数据已成功交付”。任务完成后仍可能出现入库失败或表校验不通过，运营无法从一级状态准确判断数据是否可用。
            </p>
          </Section>
          <Section title="需求目标">
            <p className={styles.paragraph}>
              以数据最终入库和表校验结果统一判定聚合状态；下钻后通过三段链路状态及其失败明细，帮助运营快速定位数据交付问题。
            </p>
          </Section>
          <Section title="本次优化范围"><PrdTable className={styles.table} rows={scopeRows} /></Section>
          <Section title="聚合状态规则">
            <PrdTable className={styles.table} rows={statusDefinitionRows} />
            <p className={styles.paragraph}>
              取数错误码按
              <a href="https://app.notion.com/p/39cc015788e580c4a21addf9fa3e3d98" target="_blank" rel="noreferrer">《取数宝错误码（辰南版）》</a>
              判断：1xxx 为异常，2xxx、3xxx 为失败；任一入库错误码均为失败。
            </p>
            <PrdTable className={styles.table} rows={aggregationRows} />
          </Section>
          <Section title="页面改动清单">
            <h4 className={styles.subTitle}>一、交互与信息展示优化</h4>
            <PrdTable className={styles.table} rows={interactionChangeRows} />
            <h4 className={styles.subTitle}>二、数据交付状态口径优化</h4>
            <PrdTable className={styles.table} rows={statusChangeRows} />
          </Section>
          <Section title="本期不做"><PrdTable className={styles.table} rows={outOfScopeRows} /></Section>
        </div>
      </div>
    </div>
  );
}
