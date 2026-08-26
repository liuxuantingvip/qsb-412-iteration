import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

let mermaidRenderQueue: Promise<void> = Promise.resolve();

const changeRows = [
  ['版本号', '创建日期', '变更人', '变更内容'],
  ['V1.0', '2026/06/30', '森森', '创建需求 PRD'],
];

const termRows = [
  ['术语', '定义', '本期处理口径'],
  ['自定义参数', '固定参数。由数据源侧定义，计划创建和任务执行时可作为默认参数参与取数。', '保留术语，但在前台展示时需要补充参数含义、配置要求和校验反馈。'],
  ['业务参数', '非固定参数。通常与业务类型、店铺、商品、类目、竞品等业务对象相关。', '当前业务参数类型仅包含本店商品、行业类目、竞品店铺、竞品商品、竞品品牌。'],
  ['推移时间', '历史字段中包含开始推移时长、结束推移时长，当前等价承担范围采集相关开关。', '概念容易造成理解成本；实时计划本身不需要动态时间范围设置，本期直接移除。'],
  ['汇总数据', '作用于当前任务参数；当汇总数据为“是”时，相当于有推移时间行为，否则没有。', '在配置说明和校验中解释其与范围采集的关系，避免用户误解。'],
  ['info 说明', '后台为参数字段补充的说明信息。', 'JS 字符串增加 info 编译，前后台使用同一份说明，降低解释不一致。'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['后台数据源维护人员', '维护数据源时，需要按业务类型定义数据源要求的业务参数表头和自定义参数说明，不维护真实参数集明细。', '能在数据源配置中维护业务参数类型、表头 schema、info 说明和适用业务类型，并被前台复用。'],
  ['取数宝运营/实施人员', '新建计划时选择数据源，需要判断当前数据源是否还缺业务参数配置。', '系统能明确提示缺什么、为什么缺、去哪里补；必填业务参数未选择或未新增参数集时不允许创建计划。'],
  ['取数宝运营/实施人员', '在参数管理中维护参数集，需要快速判断参数集关联了哪些数据源。', '参数集列表能展示关联数据源；一个参数集允许关联多个数据源，但关联数据源的业务参数类型和表头 schema 必须一致。'],
  ['取数宝系统', '执行计划时需要读取数据源定义、前台配置和任务参数快照。', '参数来源清晰、校验规则一致，历史任务不被新配置误改。'],
];

const scopeRows = [
  ['功能模块', '新增/优化', '功能点', '端', '产品线', '优先级'],
  [{ children: '后台-数据源管理', rowSpan: 4 }, '优化', '行业产品的筛选项改用 tab。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '新增', '根据业务参数类型配置参数表头 schema，业务参数类型仅覆盖本店商品、行业类目、竞品店铺、竞品商品、竞品品牌；后台不录入参数集明细；新增表头按业务参数类型生成默认名称。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '新增', 'JS 字符串增加 info 编译，前后台复用同一份参数说明。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '优化', '实时计划移除动态时间范围设置。', 'PC 端', '全产品线', 'P0'],
  [{ children: '前台-市场详情', rowSpan: 2 }, '优化', '市场详情样式修改。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '新增', '市场详情展示数据源能力、使用说明、支持查询条件和支持取数时间条件。', 'PC 端', '全产品线', 'P0'],
  [{ children: '前台-新建计划', rowSpan: 6 }, '优化', '数据源参数配置参数提示优化。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '优化', '新建计划前端样式优化。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '优化', '数据源编辑参数优化。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '优化', '业务参数编辑优化，用户按后台表头维护真实参数集内容。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '新增', '业务参数选择支持参数集 hover 明细预览；参数新增或编辑后必须沉淀为参数集，不支持临时参数。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '新增', '必填业务参数未配置时不允许创建计划，并保留已填写上下文。', 'PC 端', '全产品线', 'P0'],
  [{ children: '前台-参数管理', rowSpan: 3 }, '新增', '新增“关联数据源”列，展示参数集关联的数据源；为空时显示“-”。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '新增', '参数集新增/编辑页补充“关联数据源”字段；一个参数集可关联多个数据源，但业务参数类型和表头 schema 必须一致。', 'PC 端', '全产品线', 'P0'],
  [{ children: '', rowSpan: 0 }, '优化', '参数集与新建计划参数选择、默认参数集关系联动；删除参数集或移除关联数据源时清理对应默认关系。', 'PC 端', '全产品线', 'P0'],
];

const scenarioRows = [
  ['模块', '页面/事项', '规则', '验收口径'],
  [{ children: '后台-数据源管理', rowSpan: 5 }, '行业产品筛选', '数据源管理列表顶部的行业产品筛选改为 rounded tab，默认选中电商取数宝。', '切换 tab 后筛选列表数据；右侧操作按钮位于同一行右侧。'],
  [{ children: '', rowSpan: 0 }, '采集时间类型', '日、周、月勾选后自动展开运行时间设置；实时不展开运行时间设置。', '日、周、月分别显示平台出数时间和建议启动时间；实时不显示动态时间范围设置。'],
  [{ children: '', rowSpan: 0 }, '业务参数类型配置', '在流程配置中维护五类业务参数类型和表头 schema；后台只定义“需要哪些字段”，不录入真实参数集内容。本店商品配置固定一列；行业类目配置新增列从四级类目开始递增；竞品店铺配置新增列从二级类目开始递增；竞品商品配置新增列默认“请命名”；竞品品牌配置新增列从四级类目开始递增。后台表头变更只影响后续读取 schema，不清洗历史参数集，不做前端兼容拦截。', '保存数据源后，前台新建计划能读取数据源要求的业务参数类型和字段表头；未选择或新增必填参数集时阻断创建；旧参数集字段缺失时由 RPA 运行时心跳错误体现。'],
  [{ children: '', rowSpan: 0 }, '自定义配置与 info', '自定义配置 JSON 支持预览；业务参数和自定义参数字段支持 info 说明，前后台共用同一解释。', '字段说明为空时不展示空说明；字段说明变更后新增计划读取最新说明。'],
  [{ children: '', rowSpan: 0 }, '实时计划时间范围', '实时计划本身不需要动态时间范围设置，本期直接移除该配置。', '实时计划创建和编辑链路中不展示开始推移时长、结束推移时长；不保留实时计划动态时间范围快照。'],
  [{ children: '前台-市场详情', rowSpan: 3 }, '详情信息布局', '市场详情展示数据源名称、数据来源、使用说明、立即使用入口和能力概述；数据来源读取后台数据源管理中的采集路径。', '用户能在详情页判断数据源用途、数据来源和创建计划入口。'],
  [{ children: '', rowSpan: 0 }, '支持查询条件', '查询条件来自业务参数类型/表头和自定义配置 paramDataColumns；开始推移时长、结束推移时长在前台映射为“动态时间范围”，其他字段直接展示 desc。', '没有 info 或没有可展示值时不展示空说明；用户能在详情页看到真实需要理解的查询条件。'],
  [{ children: '', rowSpan: 0 }, '支持取数时间条件', '取数时间条件来自后台采集时间类型：日、周、月、实时。后台勾选几个就展示几个；配置了建议启动时间时展示“建议取数时间：xx:xx”，未配置则不展示建议时间。', '用户在使用前能判断该数据源支持哪些取数周期，以及是否有建议执行时间。'],
  [{ children: '前台-新建计划', rowSpan: 6 }, '数据源参数配置提示', '用户选定数据源后，系统展示该数据源是否需要业务参数配置、自定义参数配置，以及推荐配置入口。', '提示文案说明缺失参数、影响范围和下一步动作；不能只展示“需要配置参数”。'],
  [{ children: '', rowSpan: 0 }, '参数集选择', '业务参数选择下拉只展示参数集名称；hover 参数集时用表格展示明细，表格最多展示三行，超出后垂直滚动并固定表头；点击新增参数集后按数据源要求的业务参数类型和表头打开新增弹窗。', '用户能在下拉中查看参数集明细；新增或编辑参数集不打断当前计划上下文；保存并使用后自动沉淀到对应参数管理并回填当前数据源参数集。'],
  [{ children: '', rowSpan: 0 }, '默认参数集', '默认关系按“数据源 + 业务参数类型”唯一；一个参数集可关联多个数据源。开启新默认时，若该数据源已有默认参数集，需要二次提示“当前数据源已绑定 xxx 参数集，是否确定更换默认？”。', '确认后替换旧默认；取消后保留原默认；移除关联数据源时同步清除该数据源默认关系。'],
  [{ children: '', rowSpan: 0 }, '参数校验反馈', '创建计划前校验数据源要求的必填业务参数是否已满足；参数集至少保留一行有效数据，全空行自动忽略，部分必填列为空时阻断保存并行内提示。', '必填业务参数未配置时不允许创建计划；用户修正配置后可回到计划创建上下文；校验失败不清空已填写信息。'],
  [{ children: '', rowSpan: 0 }, '业务参数编辑', '本店商品、行业类目、竞品店铺、竞品商品、竞品品牌等业务参数在新建计划链路内提供明确编辑和回填路径；参数保存后必须成为参数集。', '完成编辑后新建计划能感知最新参数状态，对应参数管理新增或更新同一条参数集；未满足必填项时阻断提交。'],
  [{ children: '', rowSpan: 0 }, '前端样式', '新建计划表单、数据源配置区、参数弹窗样式统一使用 Arco 组件和设计变量。', '控件间距、表格、弹窗、提示状态与当前前后台页面一致。'],
  [{ children: '前台-参数管理', rowSpan: 3 }, '关联数据源列', '参数管理列表在现有字段基础上新增“关联数据源”列，展示当前参数集被哪些数据源使用。', '列内容为空时显示“-”；一个参数集允许关联多个数据源。'],
  [{ children: '', rowSpan: 0 }, '参数集新增/编辑', '新增/编辑页在现有字段基础上补充关联数据源；选择多个数据源时，业务参数类型和表头 schema 必须一致，不一致时不允许保存，用户需拆分为不同参数集。', '保存后列表更新关联数据源；新建计划选择对应数据源时可读取该参数集。'],
  [{ children: '', rowSpan: 0 }, '默认关系和删除影响', '默认关系按“数据源 + 业务参数类型”唯一；删除参数集不影响历史计划快照，但未来新建/编辑计划不能再选择。', '若删除的参数集是某数据源默认参数集，同步清空该数据源默认关系；移除关联数据源时同样清空对应默认关系。'],
];

const flowRows = [
  ['流程', '步骤', '验收口径'],
  ['后台定义参数', '后台数据源维护人员进入数据源管理，按行业产品筛选数据源，在流程配置中维护业务参数类型、表头 schema、自定义配置和 info 说明。', '保存后前台市场详情、新建计划、参数管理均读取同一套参数定义；后台不维护参数集明细。'],
  ['市场详情理解参数', '用户在数据源市场打开数据源详情，查看数据来源、使用说明、支持查询条件和取数时间条件。', '用户在创建计划前能判断该数据源是否需要业务参数配置。'],
  ['新建计划配置参数', '用户在新建计划中选择平台、店铺和数据源；系统展示缺失参数提示，并在参数弹窗中完成参数集选择、预览、新增或编辑；新增参数集时字段由数据源业务参数类型和表头 schema 决定。', '必填业务参数未配置时无法进入下一步；修正后保留已填写上下文；参数集保存并使用后自动选中，默认开关开启后该数据源后续默认使用该参数集；若已有默认参数集，替换前二次确认。'],
  ['参数管理维护参数集', '用户在参数管理按参数类型维护参数集，通过关联数据源列判断参数集被哪些数据源使用；一个参数集可关联多个数据源，但 schema 必须一致。', '参数集能被新增计划选择，关联关系清晰可见；新增/编辑保存后同步影响后续新建或编辑计划。'],
];

const historyDataRows = [
  ['事项', '处理规则', '验收口径'],
  ['是否需要清洗', '不做历史数据清洗，不回填历史参数集与数据源的关联关系。', '上线后历史参数集的“关联数据源”为空，列表展示“-”；系统不通过名称、平台或类目猜测关联关系。'],
  ['历史参数集处理', '历史参数集明细不改写、不补字段、不做兼容性校验。后台表头变更后，旧参数集仍可被选择；缺失字段由 RPA 流程运行时上报心跳错误。', '前端不因历史参数集字段缺失阻断保存；运行失败原因由心跳错误体现。'],
  ['历史计划处理', '历史计划和历史运行记录继续读取原参数快照，不回写、不重算。', '参数集后续编辑只影响后续新建计划，或用户再次编辑并保存后的计划。'],
  ['手动补充关联', '用户进入参数管理编辑历史参数集时，可手动补充关联数据源。', '保存后仅影响后续新建或编辑计划；系统不通过名称、平台或类目猜测关联关系。'],
  ['删除参数集影响', '删除参数集不影响历史计划快照；若该参数集是某数据源默认参数集，需要同步清空该数据源默认关系。', '删除后未来新建或编辑计划不可再选择该参数集；已运行或历史计划仍按原快照展示。'],
];

const flowDiagrams = [
  {
    id: 'definition-to-plan',
    title: '1. 参数定义到计划创建主流程',
    defaultZoom: 0.72,
    chart: `
flowchart LR
  subgraph backend["后台数据源管理"]
    start(["新增/编辑数据源"])
    bizType["选择业务参数类型"]
    schema["维护表头 schema"]
    custom["维护自定义配置与 info"]
    time["维护采集时间类型与建议启动时间"]
    save["保存数据源参数定义"]
  end

  subgraph market["前台市场详情"]
    detail["打开数据源详情"]
    preview["展示查询条件和取数时间"]
  end

  subgraph plan["前台新建计划"]
    select["选择平台、店铺和数据源"]
    read["读取数据源参数定义"]
    need{"是否要求业务参数"}
    hasDefault{"是否存在默认参数集"}
    applyDefault["自动带入默认参数集"]
    choose["选择已有参数集"]
    edit["新增或编辑参数集"]
    valid{"参数是否完整"}
    block["阻断下一步并提示缺失项"]
    submit["提交计划并保存参数快照"]
  end

  start --> bizType --> schema --> custom --> time --> save
  save --> detail --> preview --> select --> read --> need
  need -->|"否"| submit
  need -->|"是"| hasDefault
  hasDefault -->|"是"| applyDefault --> valid
  hasDefault -->|"否"| choose
  choose --> valid
  choose --> edit --> valid
  valid -->|"否"| block --> choose
  valid -->|"是"| submit
`,
  },
  {
    id: 'param-set-reuse',
    title: '2. 参数集沉淀与默认复用流程',
    defaultZoom: 0.72,
    chart: `
flowchart LR
  subgraph edit["参数集维护"]
    entry(["新建计划或参数管理进入"])
    render["按数据源表头渲染字段"]
    fill["填写参数明细"]
    check{"必填列是否完整"}
    error["行内提示，保留已填内容"]
    write["保存到对应参数管理菜单"]
  end

  subgraph relation["关联与复用"]
    link["维护关联数据源，可多选"]
    schemaMatch{"关联数据源 schema 是否一致"}
    schemaBlock["阻断保存，提示拆分参数集"]
    defaultSwitch{"是否设为默认参数配置"}
    oldDefault{"数据源是否已有默认参数集"}
    confirm["二次确认是否替换原默认参数集"]
    setDefault["替换为数据源默认参数集"]
    normal["仅保存普通参数集"]
    next["后续选择关联数据源"]
    useDefault["默认带入参数集"]
    manual["用户手动选择参数集"]
  end

  subgraph runtime["计划运行"]
    snapshot["创建计划时保存参数快照"]
    execute["任务执行读取快照与自定义参数"]
  end

  entry --> render --> fill --> check
  check -->|"否"| error --> fill
  check -->|"是"| write --> link --> schemaMatch
  schemaMatch -->|"否"| schemaBlock --> link
  schemaMatch -->|"是"| defaultSwitch
  defaultSwitch -->|"开启"| oldDefault
  oldDefault -->|"是"| confirm
  oldDefault -->|"否"| setDefault
  confirm -->|"确认"| setDefault
  confirm -->|"取消"| normal
  setDefault --> next --> useDefault --> snapshot
  defaultSwitch -->|"关闭"| normal --> next --> manual --> snapshot
  snapshot --> execute
`,
  },
];

const nonFunctionalRows = [
  ['类型', '详细说明'],
  ['-', '-'],
];

const eventRows = [
  ['埋点', '页面', '触发时机', '关键字段'],
  ['-', '-', '-', '-'],
];

const outOfScopeRows = [
  ['事项', '说明'],
  ['-', '-'],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function MermaidDiagram({
  chart,
  defaultZoom,
  diagramId,
  title,
}: {
  chart: string;
  defaultZoom: number;
  diagramId: string;
  title: string;
}) {
  const diagramIdRef = useRef(`business-custom-flow-${diagramId}-${Math.random().toString(36).slice(2)}`);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(defaultZoom);

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
          flowchart: {
            curve: 'basis',
            nodeSpacing: 42,
            rankSpacing: 46,
          },
        });

        const result = await mermaid.render(diagramIdRef.current, chart);
        if (cancelled) return;

        setSvg(result.svg);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setSvg('');
        setError(err instanceof Error ? err.message : '流程图渲染失败');
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  const changeZoom = (delta: number) => {
    setZoom((value) => Math.min(1.6, Math.max(0.45, Number((value + delta).toFixed(2)))));
  };

  return (
    <div className={styles.mermaidBlock} data-flow-id={diagramId}>
      <div className={styles.mermaidHeader}>
        <h4>{title}</h4>
        <div className={styles.mermaidControls} aria-label={`${title} 缩放控制`}>
          <button type="button" onClick={() => changeZoom(-0.1)} aria-label="缩小流程图">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(0.1)} aria-label="放大流程图">＋</button>
          <button type="button" onClick={() => setZoom(defaultZoom)}>适配</button>
        </div>
      </div>
      <div className={styles.mermaidViewport}>
        {error ? (
          <div className={styles.mermaidError}>{error}</div>
        ) : (
          <div
            className={styles.mermaidCanvas}
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  );
}

export default function BusinessCustomParameterExperiencePrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>
        【01】优化业务、自定义参数全链路体验
      </Typography.Title>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={changeRows} /></Section>
          <Section title="术语说明"><PrdTable className={styles.table} rows={termRows} /></Section>

          <Section title="需求背景">
            <p className={styles.paragraph}>
              当前取数宝计划配置中，业务参数和自定义参数的定义、配置入口、校验反馈和参数管理展示没有形成闭环：用户在市场详情或新建计划选择数据源后，只知道“需要配置参数”，但不知道具体要配置哪些参数、参数含义是什么、去哪里配置，也无法判断配置是否正确；自定义参数里的开始推移时长、结束推移时长等概念又增加了理解和培训成本。最终导致计划创建过程变成黑盒，参数集与数据源的关联关系不清晰，配置错误难以及时发现。
            </p>
          </Section>

          <Section title="目标">
            <p className={styles.paragraph}>
              优化取数宝计划配置中「业务参数」和「自定义参数」的理解、配置与校验体验，打通后台数据源定义、前台市场详情、前台计划创建和参数管理链路，降低用户因参数概念不清、入口不明、配置结果不可感知而产生的计划创建失败和培训成本。上线后以近 30 日基线对比，目标为：因参数配置错误导致的计划创建失败率下降 30%，参数配置返工率下降 30%，数据源参数提示后的配置完成率达到 80% 以上，参数集定位耗时下降 50%，正常新建计划提交耗时较基线增加不超过 5 秒。
            </p>
          </Section>

          <Section title="用户故事"><PrdTable className={styles.table} rows={storyRows} /></Section>
          <Section title="需求范围"><PrdTable className={styles.table} rows={scopeRows} /></Section>
        </div>

        <div className={styles.panel}>
          <Section title="用户场景与交互说明">
            <PrdTable className={`${styles.table} ${styles.scenarioTable}`} rows={scenarioRows} />
          </Section>

          <Section title="用户操作流程">
            <div className={styles.flowGrid}>
              {flowDiagrams.map((diagram) => (
                <MermaidDiagram
                  key={diagram.id}
                  diagramId={diagram.id}
                  title={diagram.title}
                  chart={diagram.chart}
                  defaultZoom={diagram.defaultZoom}
                />
              ))}
            </div>
            <PrdTable className={styles.table} rows={flowRows} />
          </Section>

          <Section title="历史数据处理与清洗规则">
            <PrdTable className={styles.table} rows={historyDataRows} />
          </Section>

          <Section title="非功能要求"><PrdTable className={styles.table} rows={nonFunctionalRows} /></Section>

          <Section title="埋点要求"><PrdTable className={styles.table} rows={eventRows} /></Section>

          <Section title="本期不做"><PrdTable className={styles.table} rows={outOfScopeRows} /></Section>
        </div>
      </div>
    </div>
  );
}
