import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const versionRows = [
  ['版本', '更新时间', '本次调整', '状态'],
  ['V1.7', '2026/09/01', '补充重试受理后父表与下钻明细的状态一致性', '待研发评审'],
  ['V1.6', '2026/09/01', '交互标注改为前端示例结合隐藏规则，并去除重复说明', '待研发评审'],
  ['V1.5', '2026/08/31', '补充按各计划可配置、可修改的运行超时阈值判定失败', '待研发评审'],
  ['V1.4', '2026/07/29', '按确认范围重写页面改动清单，并同步交互标注', '待研发评审'],
];

const scopeRows = [
  ['部分', '范围', '目标'],
  ['一、交互与信息展示优化', '监控视图页签、店铺维度列表、状态说明浮层', '调整页签样式、列顺序、筛选和操作入口，解决浮层内容被截断。'],
  ['二、数据交付状态口径优化', '店铺维度、数据表维度及下钻明细', '聚合表展示最终交付状态；下钻表按三段链路状态定位问题。'],
];

const statusDefinitionRows = [
  ['聚合状态', '判定规则', '展示'],
  ['失败', '命中平台侧或 RPA 流程侧取数错误；或数据入库失败；或运行时长超过所属计划的运行超时时间。', '红色 Tag；hover 展示原因。计划超时展示本次生效阈值与运行时长，无错误码时不虚构错误码。'],
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
  ['计划运行超时', '每个计划可独立设定或修改“计划运行超时时间”（分钟），不是全局统一阈值。运行时长严格超过本次执行实际生效阈值即归为失败，不再归入等待；恰好等于阈值不因本条规则判失败，其他失败规则仍生效。'],
  ['阈值来源与修改', '沿用计划系统提供的本次执行运行时长和实际生效阈值。计时起点、排队是否计入、配置修改对运行中执行的生效时点均沿用计划系统；监控不另设阈值，不用修改后的最新值覆盖历史执行依据。300 分钟仅为示例，阈值缺失时不套用该数值。'],
  ['超时归类范围', '本期增加监控失败归类，不修改计划计时、停止或终止机制。汇总失败不覆盖三段原始执行结果；是否可重试沿用现有执行状态和权限规则，不因汇总超时自行提交重试。'],
  ['重试后的状态同步', '重试受理成功后，下钻当前行立即更新为对应等待状态，父表立即按全部明细重新聚合；后续每次环节变化均同步更新当前行并重新聚合父表，聚合优先级仍为“失败 > 异常 > 等待 > 成功”。下钻不新增明细行，原失败结果仅在日志和运行记录中保留。'],
  ['错误码数值相同但链路阶段不同', '先判断取数或入库阶段，再映射状态；不将错误码作为全局唯一值。'],
];

const outOfScopeRows = [
  ['本期不做', '说明'],
  ['错误码及表校验配置改版', '只消费现有错误码、校验配置和结果，不调整其生成或配置能力。'],
  ['通过错误文案判断状态', '状态只按链路阶段、错误码和表校验结果计算。'],
  ['重试策略、权限与历史记录改版', '不新增自动重试策略，不修改现有重试权限，不删除历史执行记录，也不约束生产接口的具体地址或字段命名。'],
];

let retryFlowRenderQueue = Promise.resolve();

const retryConsistencyFlowchart = `flowchart TB
  subgraph ENTRY["1. 找到需要重试的明细"]
    A(["查看父表日期状态"]) --> B["点击状态进入下钻明细"]
    B --> C["选择失败明细"]
    C --> D{"系统按三段状态识别可重试操作"}
    D -- "取数执行失败" --> E["展示并点击重试采集"]
    D -- "取数成功、入库失败" --> F["展示并点击重试入库"]
  end
  subgraph SUBMIT["2. 确认并提交重试"]
    E --> G["打开对应重试确认弹窗"]
    F --> G
    G --> H{"是否确认重试"}
    H -- "否" --> I(["取消，本次操作结束"])
    H -- "是" --> J["提交已选择的重试<br/>入口 loading，禁止重复提交"]
    J --> K{"重试是否提交成功"}
    K -- "否" --> L["提示提交失败"]
    L --> LA["本次提交不更新子表三段状态"]
    LA --> LB["本次提交不更新父表聚合"]
    LB --> LC(["返回当前明细，可再次重试"])
    K -- "是" --> M["重试提交成功"]
  end
  subgraph SYNC["3. 提交成功后系统同步处理"]
    M --> N["子表立即按已选类型显示<br/>重试采集<br/>取数执行：等待<br/>数据入库：无任务<br/>数据校验：无任务<br/><br/>重试入库<br/>取数执行：成功<br/>数据入库：等待<br/>数据校验：无任务"]
    N --> P["父表立即按全部明细重新聚合"]
    P --> Q["父表展示新的聚合结果<br/>存在其他高优先级明细时<br/>父表可能仍显示失败、异常或等待"]
    Q --> QA(["页面状态同步完成"])
    M --> O["按已选重试类型开始执行"]
  end
  subgraph RUN["4. 重试任务继续执行"]
    O --> R["执行当前重试环节"]
    R --> S{"当前环节是否成功"}
    S -- "否" --> T["同一明细更新为当前环节失败"]
    T --> U["父表按全部明细重新聚合"]
    U --> V(["本次重试失败，流程结束"])
    S -- "是" --> W["同一明细更新为当前环节成功"]
    W --> X["父表按全部明细重新聚合"]
    X --> Y{"是否还有后续环节"}
    Y -- "是" --> Z["下一环节切换为等待"]
    Z --> AA["父表按全部明细重新聚合"]
    AA --> R
    Y -- "否" --> AB["同一明细显示最终交付结果"]
    AB --> AC["父表按全部明细重新聚合"]
    AC --> AD(["本次重试成功，流程结束"])
  end`;

function RetryConsistencyFlowchart() {
  const diagramId = useRef(`etl-retry-flow-${Math.random().toString(36).slice(2)}`);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(0.8);

  useEffect(() => {
    let cancelled = false;
    retryFlowRenderQueue = retryFlowRenderQueue
      .catch(() => undefined)
      .then(async () => {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            primaryColor: '#E8F3FF',
            primaryBorderColor: '#165DFF',
            primaryTextColor: '#1D2129',
            lineColor: '#86909C',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          },
          flowchart: { curve: 'linear', nodeSpacing: 32, rankSpacing: 42 },
        });
        const result = await mermaid.render(diagramId.current, retryConsistencyFlowchart);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = result.svg;
        const svgElement = wrapper.querySelector('svg');
        if (!svgElement) throw new Error('重试流程图渲染失败');
        const viewBox = svgElement.getAttribute('viewBox')?.split(/\s+/).map(Number);
        if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
          svgElement.setAttribute('width', `${Math.ceil(viewBox[2])}`);
          svgElement.setAttribute('height', `${Math.ceil(viewBox[3])}`);
          svgElement.style.maxWidth = 'none';
        }
        if (!cancelled) {
          setSvg(svgElement.outerHTML);
          setError('');
        }
      })
      .catch((renderError) => {
        if (!cancelled) {
          setSvg('');
          setError(renderError instanceof Error ? renderError.message : '重试流程图渲染失败');
        }
      });
    return () => { cancelled = true; };
  }, []);

  const changeZoom = (delta: number) => {
    setZoom(value => Math.min(1.4, Math.max(0.45, Number((value + delta).toFixed(2)))));
  };

  return (
    <div className={styles.retryFlowBlock} aria-label="重试父子状态一致性流程">
      <div className={styles.retryFlowHeader}>
        <strong>重试流程</strong>
        <div className={styles.retryFlowControls} aria-label="重试流程缩放控制">
          <Button size="mini" type="text" aria-label="缩小重试流程" onClick={() => changeZoom(-0.1)}>−</Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button size="mini" type="text" aria-label="放大重试流程" onClick={() => changeZoom(0.1)}>＋</Button>
          <Button size="mini" type="text" onClick={() => setZoom(0.8)}>重置</Button>
        </div>
      </div>
      <div className={styles.retryFlowViewport} tabIndex={0} aria-label="重试流程图，可横向和纵向滚动">
        {error ? <Alert type="error" showIcon content={error} /> : (
          <div
            className={styles.retryFlowCanvas}
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
      <p className={styles.retryFlowNote}>
        <strong>补充规则：</strong>
        下钻始终保留同一条明细，原失败结果保留在日志和运行记录；主动刷新不改变重试流程。刷新成功时展示最新明细和父表聚合结果，刷新失败时提示失败并保留页面当前结果。
      </p>
    </div>
  );
}

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
              现有监控已覆盖采集、入库和校验，但汇总规则、状态命名和原因展示不够统一，运营仍难以快速判断交付结果和定位问题。
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
              <Section title="重试后父子状态一致性流程">
            <RetryConsistencyFlowchart />
          </Section>
          <Section title="本期不做"><PrdTable className={styles.table} rows={outOfScopeRows} /></Section>
        </div>
      </div>
    </div>
  );
}
