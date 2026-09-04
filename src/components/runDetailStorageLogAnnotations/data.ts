import type { RequirementAnnotation } from '@/components/requirementAnnotations';

export const runDetailStorageLogAnnotations: RequirementAnnotation[] = [
  {
    noteId: 'RSL-1', number: '1', page: '运行记录详情', module: '入库日志入口', target: '基础信息操作区 / 入库日志',
    ruleLabel: '对象与触发',
    ruleItems: [
      { text: '对象是当前打开的运行记录；点击“入库日志”后按该运行记录 ID 查询入库执行结果，不混入其他运行记录。' },
      { text: '入口仅用于查看入库日志，不在此处发起入库重试、修改或删除。' },
    ],
    stateLabel: '状态与边界',
    stateItems: [
      { text: '打开抽屉后保留当前运行记录详情；关闭入库日志返回原详情位置。' },
      { text: '没有有效运行记录上下文时不发起查询，也不展示其他记录的缓存结果。' },
    ],
    acceptance: '分别从两条运行记录进入入库日志，列表数据必须随运行记录切换且不串数据；关闭后仍停留在原运行记录详情。',
    topTab: '电商取数宝', menuKey: '运行记录', openEvent: 'run-detail-storage-log:open-entry',
  },
  {
    noteId: 'RSL-2', number: '2', page: '入库日志', module: '查询与筛选', target: '搜索框、最新入库结果、失败筛选',
    ruleLabel: '字段规则',
    ruleItems: [
      { text: '搜索仅匹配数据表中文名和英文名；数据库类型、失败原因、店铺和连接器不参与搜索。' },
      { text: '“最新入库结果”按每张数据表最新一次尝试的状态筛选；“失败筛选”选择“仅看失败”后只保留失败表。' },
      { text: '搜索、最新结果和失败筛选同时生效；变更任一条件后回到第 1 页。', previews: [{ type: 'filter-bar', searchPlaceholder: '搜索数据表中英文名', selectPlaceholders: ['最新入库结果', '失败筛选'], actionLabel: '重置', relationLabel: '搜索 + 最新入库结果 + 失败筛选 → 同时生效' }] },
    ],
    recoveryLabel: '清空与恢复',
    recoveryItems: [{ text: '点击“重置”清空搜索及全部筛选，恢复当前运行记录下的全部数据表。' }],
    acceptance: '中文名和英文名均可命中；输入 MySQL 或失败原因不得命中；组合筛选结果和总数一致，重置后恢复全量。',
    topTab: '电商取数宝', menuKey: '运行记录', openEvent: 'run-detail-storage-log:open',
  },
  {
    noteId: 'RSL-3', number: '3', page: '入库日志', module: '数据表字段', target: '入库日志结果列表',
    ruleLabel: '字段来源与展示',
    ruleItems: [
      { text: '数据表中文名、英文名取入库任务执行时的目标表元数据快照，同列展示；数据库类型取目标数据源配置。' },
      { text: '写入条数取最新一次入库尝试的实际写入记录数，使用千分位；实际写入 0 条显示“0”，无有效值显示“-”。' },
      { text: '业务日期格式为 YYYY-MM-DD；完成时间格式为 YYYY-MM-DD HH:mm:ss，下方按“秒”或“分 + 秒”展示耗时。' },
      { text: '字段顺序为：数据表、数据库类型、最新入库结果、写入条数、业务日期、完成时间、失败原因。' },
      { text: '字段无有效值时显示“-”；不得展示 NaN、undefined、其他记录的值或虚构内容。' },
    ],
    stateLabel: '内容与长文本',
    stateItems: [
      { text: '失败时按“失败阶段：失败原因”展示；成功显示“-”；成功但部分业务日期无数据时展示具体无数据说明。' },
      { text: '中英文表名和失败原因超出列宽时省略，悬停展示完整内容。' },
    ],
    acceptance: '逐列核对字段来源、顺序、格式和空值；长表名和长失败原因可查看完整内容。',
    topTab: '电商取数宝', menuKey: '运行记录', openEvent: 'run-detail-storage-log:open', locateMode: 'column-headers',
  },
  {
    noteId: 'RSL-4', number: '4', page: '入库日志', module: '最新入库结果', target: '最新入库结果与失败原因列',
    ruleLabel: '归并与状态规则',
    ruleItems: [
      { text: '以数据库类型、数据表英文名、业务日期识别一张目标数据表；同表多次尝试只展示尝试次数最大的一次，次数相同时取完成时间最新的一次。', previews: [{ type: 'result-text', status: 'error', label: '第 1 次：失败' }, { type: 'field', label: '→' }, { type: 'result-text', status: 'success', label: '第 2 次：成功（列表展示）' }] },
      { text: '待运行：尚未开始入库。', previews: [{ type: 'tag', color: 'gray', icon: 'waiting', label: '待运行' }] },
      { text: '运行中：入库任务正在执行。', previews: [{ type: 'tag', color: 'arcoblue', icon: 'waiting', label: '运行中' }] },
      { text: '成功：最新一次入库完成且无异常。', previews: [{ type: 'tag', color: 'green', icon: 'success', label: '成功' }] },
      { text: '成功（部分无数据）展示绿色“成功”标签，右侧展示“部分无数据”；该状态不计入失败筛选。', previews: [{ type: 'tag', color: 'green', icon: 'success', label: '成功' }, { type: 'field', label: '部分无数据' }] },
      { text: '失败展示红色“失败”标签，并按“失败阶段：失败原因”展示可读原因。', previews: [{ type: 'tag', color: 'red', icon: 'failed', label: '失败' }] },
    ],
    exceptionLabel: '本期边界',
    exceptionItems: [{ text: '不展开历史尝试记录，不增加汇总统计卡片，也不在日志抽屉内提供入库重试。' }],
    acceptance: '构造同表多次尝试验证只展示最新结果；部分无数据不进入失败筛选，失败状态和失败原因一致。',
    topTab: '电商取数宝', menuKey: '运行记录', openEvent: 'run-detail-storage-log:open', locateMode: 'column-headers',
  },
  {
    noteId: 'RSL-5', number: '5', page: '入库日志', module: '分页', target: '列表底部 / 分页',
    ruleLabel: '分页规则',
    ruleItems: [
      { text: '分页对象是当前搜索和筛选后的数据表集合；总数显示筛选后的数据表数量。' },
      { text: '默认每页 10 张数据表，可切换为每页 10、20、50 张；切换每页条数后回到第 1 页。' },
    ],
    acceptance: '验证筛选后的分页总数、默认每页条数、10/20/50 切换及切换后回到第 1 页。',
    topTab: '电商取数宝', menuKey: '运行记录', openEvent: 'run-detail-storage-log:open',
  },
  {
    noteId: 'RSL-6', number: '6', page: '入库日志', module: '查询状态与异常恢复', target: '结果列表主体',
    ruleLabel: '状态规则',
    stateItems: [
      { text: '首次打开并查询入库日志时展示加载状态，不提前展示旧数据。', previews: [{ type: 'loading-state', label: '正在加载入库日志' }] },
      { text: '查询成功但无匹配数据时展示空状态，不回退展示未筛选的全量结果。', previews: [{ type: 'empty-state', status: 'empty', label: '暂无符合条件的数据表' }] },
      { text: '查询失败时展示统一错误反馈，并与“无匹配数据”明确区分。', previews: [{ type: 'alert', status: 'error', label: '入库日志加载失败，请关闭后重新进入' }] },
    ],
    recoveryLabel: '失败与更新',
    recoveryItems: [
      { text: '查询失败时保留当前运行记录上下文，不展示旧数据或虚构内容，不影响运行记录详情的其他内容。' },
      { text: '用户关闭后重新进入入库日志再次查询；待运行或运行中的结果也通过重新进入获取最新状态，本期不新增自动轮询或刷新按钮。' },
    ],
    acceptance: '分别验证加载、空结果、查询失败三种状态；失败后关闭并重新进入可再次查询，三种状态不得混用。',
    topTab: '电商取数宝', menuKey: '运行记录', openEvent: 'run-detail-storage-log:open',
  },
];
