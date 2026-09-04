import type { ReactNode } from 'react';
import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import FlowDiagram from './FlowDiagram';
import { PushMessagePreview } from '../pushStrategyCenter';
import { acceptanceRows, accountLoginRows, backgroundParagraphs, channelRows, deliveryRows, goalItems, lifecycleRows, messageRows, messageTypeRows, monitorRows, pushFlows, realtimeCompletionRows, scopeRuleRows, triggerRows } from './content';
import styles from './index.module.less';

const versionRows = [['版本号', '创建日期'], ['V0.6', '2026/09/04']];
const changeRows = [
  ['时间', '版本号', '变更人', '主要变更内容'],
  ['2026/09/04', 'V0.6', '森森', '收口策略生命周期、实时基线、回溯成功、零异常监控、月末调度、账号登录异常与 180 天历史保留规则。'],
  ['2026/09/03', 'V0.5', '森森', '明确最新运行结果、自身交付明细、独立提醒去重、时间点触发、自动停用与恢复、草稿预览和历史快照；同步流程与交互标注。'],
  ['2026/09/03', 'V0.4', '森森', '按六章组织正文；需求范围改为具体改动清单，各业务方案先说明本次改动与预期结果，再展开流程和规则；交互细节保留在原型标注。'],
  ['2026/09/02', 'V0.3', '森森', '按配置、统计、触发和消息展示重组规则；补充四项流程图与交互标注。'],
  ['2026/09/02', 'V0.2', '森森', '统一最终交付、分类型统计、实时提醒、有效产品和三渠道消息模板。'],
];
const termRows = [
  ['术语', '定义'],
  ['计划', '推送配置和新消息中的统一业务名称。'],
  ['执行次数', '一次计划执行计一次；与去重计划数分开统计，不使用“批次”。'],
  ['实时计划 / 实时推送', '实时计划是计划类型，合并定时与手动执行；实时推送是按状态变化触发消息的方式，两者不是同一概念。'],
  ['监控看板图片', '数据监控视图的完整图片或仅包含异常数据的图片。'],
];
const scopeRows = [
  ['改动项', '本次要做什么'],
  ['策略配置', '按具体时间点推送；补齐产品和自定义对象失效后的停用与恢复，以及渠道、产品切换和保存失败反馈。'],
  ['进度统计', '以最终交付结果判断成功，分别统计日常、实时、回溯计划，以及店铺、数据表的进度。'],
  ['实时提醒', '明确异常发生、恢复后再次异常和当天交付完成的提醒条件，避免重复发送。'],
  ['消息展示', '统一三渠道必要信息；支持未保存策略预览，历史保留实际消息，门户按本次对象范围定位。'],
  ['监控视图推送', '推送策略关联的监控视图；明确完整视图、异常视图和图片失败时分别发什么。'],
];

function Section({ title, children, prominent = false }: { title: string; children: ReactNode; prominent?: boolean }) {
  return <section className={`${styles.section} ${prominent ? styles.prominentSection : ''}`}><h3>{title}</h3>{children}</section>;
}

export default function PushStrategyOptimizationPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>推送策略中心优化</Typography.Title>
      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="需求背景" prominent>
            {backgroundParagraphs.map((text) => <p className={styles.paragraph} key={text}>{text}</p>)}
          </Section>
          <Section title="目标" prominent>
            <p className={styles.paragraph}>{goalItems.map((item) => item.description).join('')}</p>
          </Section>
          <Section title="需求范围">
            <PrdTable className={styles.table} rows={scopeRows} />
          </Section>
          <Section title="业务方案">
            {pushFlows.map((flow) => (
              <div className={styles.subsection} key={flow.id}>
                {flow.flows ? (
                  <>
                    <h4>{flow.title}</h4>
                    <p className={styles.paragraph}>{flow.description}</p>
                    {flow.flows.map((reminder) => (
                      <div className={styles.subsection} key={reminder.id}>
                        <FlowDiagram {...reminder} />
                        {reminder.id === 'realtime-success' && <PrdTable className={styles.table} rows={realtimeCompletionRows} />}
                        {reminder.notes.map((note) => <p className={styles.paragraph} key={note}>{note}</p>)}
                      </div>
                    ))}
                    <div className={styles.subsection}>
                      <h4>账号登录异常</h4>
                      <PrdTable className={styles.table} rows={accountLoginRows} />
                    </div>
                  </>
                ) : flow.chart !== undefined && <FlowDiagram {...flow} chart={flow.chart} />}
                {flow.id === 'configure' && <PrdTable className={styles.table} rows={lifecycleRows} />}
                {flow.id === 'scheduled' && (
                  <>
                    <PrdTable className={styles.table} rows={[triggerRows[0], ...triggerRows.slice(1).filter((row) => row[0].startsWith('定时'))]} />
                    <div className={styles.subsection}>
                      <h4>统计范围与单位</h4>
                      <PrdTable className={styles.table} rows={scopeRuleRows} />
                    </div>
                    <div className={styles.subsection}>
                      <h4>最终交付与状态判断</h4>
                      <PrdTable className={styles.table} rows={deliveryRows} />
                    </div>
                  </>
                )}
                {flow.id === 'monitor' && (
                  <PrdTable className={styles.table} rows={monitorRows} />
                )}
              </div>
            ))}
            <div className={styles.subsection}>
              <h4>5. 消息展示与查看</h4>
              <p className={styles.paragraph}>本次统一飞书、企业微信、钉钉的必要业务信息，补齐异常对象、失败阶段、具体原因及取数错误码，删除公司名称、重复数量和“另有 X 条”等赘述。各渠道使用自身支持的展示方式，通过“前往门户”进入对应页面处理；历史按当次实际发送内容保留 180 天。</p>
              <div className={styles.subsection}>
                <h4>类型与推送内容</h4>
                <PrdTable className={styles.table} rows={messageTypeRows} />
              </div>
              <div className={styles.subsection}>
                <h4>消息效果预览</h4>
                <section className={styles.messagePreview} aria-label="消息效果预览">
                  <PushMessagePreview annotated={false} />
                </section>
              </div>
              <h4>通用信息与查看规则</h4>
              <PrdTable className={styles.table} rows={messageRows} />
              <div className={styles.subsection}>
                <h4>渠道差异与发送限制</h4>
                <PrdTable className={styles.table} rows={channelRows} />
              </div>
            </div>
          </Section>
          <Section title="验收标准"><PrdTable className={styles.table} rows={acceptanceRows} /></Section>
          <Section title="文档说明"><PrdTable className={styles.table} rows={termRows} /></Section>
          <Section title="版本信息"><PrdTable className={styles.table} rows={versionRows} /></Section>
          <Section title="变更日志"><PrdTable className={styles.table} rows={changeRows} /></Section>
        </div>
      </div>
    </div>
  );
}
