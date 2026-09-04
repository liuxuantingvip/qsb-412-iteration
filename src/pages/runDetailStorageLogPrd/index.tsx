import { useEffect, useRef, useState } from 'react';
import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const versionRows = [
  ['版本号', '创建日期', '变更内容'],
  ['V1.0', '2026/09/01', '运行记录详情新增入库日志入口及数据表最新入库结果查询。'],
];

const scopeRows = [
  ['模块', '功能点', '本期范围'],
  ['运行记录详情', '入库日志入口', '在当前运行记录的基础信息操作区新增“入库日志”，点击后查看该运行记录产生的数据表入库结果。'],
  ['入库日志', '查询与筛选', '支持按数据表中文名或英文名搜索，按最新入库结果、是否失败筛选，并支持清空筛选。'],
  ['入库日志', '结果列表', '按数据表展示最新一次入库结果、写入条数、业务日期、完成时间、耗时及失败原因。'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['运营人员', '运行记录的数据入库失败，需要判断失败的数据表和原因。', '在当前运行记录中直接查看失败表、失败阶段和失败原因，不再依赖后台排查。'],
  ['运营人员', '同一运行记录包含多张数据表，需要确认每张表是否完成入库。', '按数据表查看最新结果、写入条数和完成时间，并快速筛出失败表。'],
  ['研发或支持人员', '用户反馈数据缺失，需要确认目标表及业务日期。', '通过数据表中英文名、数据库类型和业务日期定位目标表，并结合最新结果辅助排查。'],
];

const coreFlow = String.raw`
flowchart LR
  subgraph userStage["用户操作"]
    direction TB
    start(["进入运行记录列表"]) --> detail["打开运行详情"]
    detail --> record["进入具体运行记录详情"]
    record --> openLog["点击入库日志"]
  end

  subgraph queryStage["系统查询"]
    direction TB
    openLog --> query["按当前运行记录 ID 查询"]
    query --> queryResult{"查询是否成功"}
    queryResult -- "否" --> queryError["保留当前记录上下文<br/>展示统一错误反馈"]
    queryError --> retry(["关闭后可重新进入查询"])
    queryResult -- "是" --> merge["按数据库类型、数据表英文名、业务日期归并"]
    merge --> latest["取每张表最新一次入库结果"]
  end

  subgraph resultStage["查看结果"]
    direction TB
    latest --> hasData{"是否有匹配数据"}
    hasData -- "否" --> empty(["展示空状态"])
    hasData -- "是" --> list["展示数据表结果列表"]
    list --> filter["搜索中英文表名或按结果、失败筛选"]
    filter --> list
    list --> result(["查看状态、写入条数、业务日期<br/>完成时间和失败原因"])
  end
`;

let mermaidRenderQueue: Promise<void> = Promise.resolve();

const fieldRows = [
  ['字段', '来源与展示规则'],
  ['数据表', '数据表中文名、英文名取入库任务执行时的目标表元数据快照；同列展示，中文名在上、英文名在下。'],
  ['数据库类型', '取目标数据源配置的数据库类型，例如 MySQL、ClickHouse、PostgreSQL。'],
  ['最新入库结果', '取当前运行记录下该数据表最新一次入库尝试结果；枚举为待运行、运行中、成功、成功（部分无数据）、失败。'],
  ['写入条数', '取最新一次入库尝试实际写入的记录数，使用千分位；未返回有效值时显示“-”。'],
  ['业务日期', '取该数据表本次入库对应的业务日期，格式为 YYYY-MM-DD。'],
  ['完成时间', '取最新一次尝试的完成时间，格式为 YYYY-MM-DD HH:mm:ss；下方展示本次尝试耗时。'],
  ['失败原因', '失败时按“失败阶段：失败原因”展示；成功显示“-”；成功但部分业务日期无数据时展示无数据说明。'],
];

const statusRows = [
  ['状态', '展示与筛选口径'],
  ['待运行', '展示等待状态；尚未产生完成时间或写入结果时对应字段显示“-”。'],
  ['运行中', '展示进行中状态；关闭后重新进入入库日志获取最新结果，本期不新增自动轮询或刷新按钮。'],
  ['成功', '展示绿色“成功”标签，不展示失败原因。'],
  ['成功（部分无数据）', '展示绿色“成功”标签，标签右侧显示“部分无数据”；不计入失败筛选，失败原因列展示具体无数据说明。'],
  ['失败', '展示红色“失败”标签；计入失败筛选，并展示失败阶段和可读失败原因。'],
];

const exceptionRows = [
  ['场景', '反馈与恢复'],
  ['无匹配数据', '按当前搜索和筛选条件展示“暂无符合条件的数据表”，不回退展示全量结果。'],
  ['查询失败', '入库日志抽屉保留当前运行记录上下文，不展示旧数据或虚构数据；使用统一错误反馈，用户关闭后可重新进入再次查询。'],
  ['字段缺失', '单个字段缺失时显示“-”；不得用 0、NaN、undefined 或其他字段代替。'],
  ['重复尝试', '同一数据表存在多次入库尝试时只展示最新一次；历史尝试不在本期页面展开。'],
];

const outOfScopeRows = [
  ['事项', '说明'],
  ['入库重试', '本期入库日志仅用于查看，不在日志抽屉内新增入库重试操作。'],
  ['历史尝试记录', '本期不展开每张数据表的历史入库尝试明细。'],
  ['统计卡片', '本期不增加成功数、失败数、部分无数据数等汇总卡片。'],
  ['导出与编辑', '本期不支持导出、修改或删除入库日志。'],
  ['取数日志改造', '取数日志沿用既有能力，不属于本次“新增入库日志”需求范围。'],
  ['运行详情整体改版', '运行详情视觉与抽屉宽度调整仅用于承载本需求，不作为独立业务能力扩展。'],
];

const acceptanceRows = [
  ['验收点', '验收标准'],
  ['入口与范围', '运行记录详情展示“入库日志”；打开后只展示当前运行记录的数据表，不混入其他记录。'],
  ['最新结果口径', '同一数据库类型、数据表英文名、业务日期只展示一行，结果取最新一次入库尝试。'],
  ['字段完整性', '依次展示数据表、数据库类型、最新入库结果、写入条数、业务日期、完成时间、失败原因；中英文名合并在数据表列。'],
  ['搜索', '搜索仅匹配数据表中文名和英文名；输入数据库类型或失败原因不命中。'],
  ['筛选', '最新入库结果和失败筛选可单独或组合使用；“成功（部分无数据）”不计入失败。'],
  ['状态展示', '成功、部分无数据、失败的标签与文字符合状态说明；失败原因完整可查看。'],
  ['分页与空状态', '默认每页 10 张数据表；筛选变化回到第 1 页；无匹配结果展示空状态。'],
  ['范围边界', '页面不出现历史尝试展开、统计卡片、入库重试、导出、编辑或删除入口。'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.section}><h3>{title}</h3>{children}</section>;
}

function MermaidDiagram({ chart, title }: { chart: string; title: string }) {
  const diagramId = useRef(`run-detail-storage-log-flow-${Math.random().toString(36).slice(2)}`);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    mermaidRenderQueue = mermaidRenderQueue
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
          flowchart: { curve: 'basis', nodeSpacing: 36, rankSpacing: 48 },
        });

        const result = await mermaid.render(diagramId.current, chart);
        if (!cancelled) {
          setSvg(result.svg);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setSvg('');
          setError(reason instanceof Error ? reason.message : '流程图渲染失败');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div className={styles.flowDiagram} aria-label={title}>
      {error ? (
        <div className={styles.flowError}>{error}</div>
      ) : (
        <div className={styles.flowCanvas} dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  );
}

export default function RunDetailStorageLogPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>运行详情新增入库日志</Typography.Title>
      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={versionRows} /></Section>
          <Section title="背景">
            <p className={styles.paragraph}>当前运行记录详情只能查看取数过程，运营人员无法直接确认一条运行记录最终写入了哪些数据表、各表是否成功以及失败原因，发生数据缺失或入库异常时仍需依赖研发或后台排查。</p>
          </Section>
          <Section title="目标">
            <p className={styles.paragraph}>在运行记录详情新增入库日志入口，以数据表为粒度展示当前运行记录的最新一次入库结果，帮助运营人员快速定位失败表、业务日期和失败原因，缩短入库异常排查路径。</p>
          </Section>
          <Section title="需求范围"><PrdTable className={styles.table} rows={scopeRows} /></Section>
          <Section title="用户故事"><PrdTable className={styles.table} rows={storyRows} /></Section>
          <Section title="核心流程"><MermaidDiagram chart={coreFlow} title="入库日志核心流程图" /></Section>
        </div>
        <div className={styles.panel}>
          <Section title="字段说明"><PrdTable className={styles.table} rows={fieldRows} /></Section>
          <Section title="状态口径"><PrdTable className={styles.table} rows={statusRows} /></Section>
          <Section title="异常处理"><PrdTable className={styles.table} rows={exceptionRows} /></Section>
          <Section title="本期不做"><PrdTable className={styles.table} rows={outOfScopeRows} /></Section>
          <Section title="验收清单"><PrdTable className={styles.table} rows={acceptanceRows} /></Section>
        </div>
      </div>
    </div>
  );
}
