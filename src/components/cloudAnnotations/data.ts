import type { AnnotationContentItem } from '@/components/requirementAnnotations';

export type CloudAnnotationPage = '租户管理 / 新增授权' | '租户管理 / 编辑授权' | '云资源管理' | '状态闭环';

export type CloudAnnotation = {
  noteId: string;
  number: string;
  page: CloudAnnotationPage;
  module: string;
  target: string;
  rule?: string;
  ruleItems?: AnnotationContentItem[];
  ruleLabel?: string;
  exception?: string;
  exceptionItems?: AnnotationContentItem[];
  exceptionLabel?: string;
  state?: string;
  stateItems?: AnnotationContentItem[];
  recovery?: string;
  recoveryItems?: AnnotationContentItem[];
  acceptance: string;
  acceptanceItems?: AnnotationContentItem[];
  menuKey: '租户管理-生态' | '云资源管理';
  openEvent?: string;
};

export const cloudAnnotations: CloudAnnotation[] = [
  {
    noteId: 'CRA-1.1',
    number: '1.1',
    page: '租户管理 / 新增授权',
    module: '选择云桌面机器人',
    target: '新增授权抽屉 > 云桌面机器人权益块',
    ruleLabel: '开通规则',
    ruleItems: [
      { text: '仅分配“云桌面机器人”后展示云厂商配置。' },
      { text: '授权数量 = 云电脑实例数量 = 附带机器人令牌数量。' },
      { text: '新增授权提交后，授权保存和云资源开通一起执行。' },
      {
        text: '厂商返回最终结果前，授权保持',
        previews: [{ color: 'arcoblue', label: '开通中', type: 'tag' }],
      },
    ],
    exceptionLabel: '字段规则',
    exceptionItems: [
      {
        text: '云厂商',
        children: [
          { text: '枚举值', previews: [{ label: '无影云 / 火山云 / 天翼云', type: 'field' }] },
          { text: '切换厂商时清空旧厂商专属值，切回后恢复默认值。' },
        ],
      },
      {
        text: '无影云',
        children: [
          { text: '字段', previews: [{ label: '授权数量', type: 'field' }, { label: '授权时长', type: 'field' }] },
          { text: '字段值与现有无影云逻辑保持一致。' },
        ],
      },
      {
        text: '火山云',
        children: [
          { text: '字段', previews: [{ label: '开通类型', type: 'field' }, { label: '共享带宽包', type: 'field' }, { label: '只读开通配置', type: 'field' }, { label: '授权时长', type: 'field' }, { label: '实例规格', type: 'field' }, { label: '镜像', type: 'field' }, { label: '开通数量', type: 'field' }, { label: '云电脑名称', type: 'field' }] },
          { text: '开通类型：试用 / 合同；共享带宽包由开通类型派生。' },
          { text: '实例规格取火山云规格列表；镜像按实例规格过滤兼容镜像。' },
          { text: '云电脑名称按租户名 + 2 位序号生成，可手改。' },
        ],
      },
      {
        text: '天翼云',
        children: [
          { text: '字段', previews: [{ label: '授权数量', type: 'field' }, { label: '授权时长', type: 'field' }, { label: '规格', type: 'field' }, { label: '镜像', type: 'field' }, { label: '用户账号', type: 'field' }, { label: '云电脑名称', type: 'field' }] },
          { text: '规格取天翼云规格列表；镜像按规格过滤兼容镜像。' },
          { text: '用户账号按租户名或租户 ID 生成，可手改。' },
          { text: '云电脑名称按租户名 + 3 位序号生成，可手改。' },
        ],
      },
    ],
    stateItems: [
      { text: '未分配：不展示云配置。' },
      { text: '已分配：进入待配置。' },
      { text: '切换云厂商：清空旧厂商专属值、云电脑资源、成功/失败数量和厂商错误；切回后恢复默认值。' },
    ],
    acceptanceItems: [
      { text: '研发和测试按本字段矩阵验收，不以界面截图作为字段真值。' },
      { text: '火山云最多 100 台；时长支持 1-9、12、24、36、48、60 个月。' },
      { text: '天翼云最多 50 台；时长支持 1-36 个月。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-create-cloud-desk-authorization',
  },
  {
    noteId: 'CRA-1.2',
    number: '1.2',
    page: '租户管理 / 新增授权',
    module: '提交自动开通',
    target: '新增授权抽屉 > 确定',
    ruleLabel: '提交规则',
    ruleItems: [
      {
        text: '点击确定后，授权保存和云资源开通一起提交。',
        previews: [{ label: '确定', type: 'button', variant: 'primary' }],
      },
      { text: '服务端按云电脑实例生成开通任务。' },
      { text: '每台实例记录资源标识、名称、到期时间和厂商状态。' },
      { text: '厂商返回最终结果前不提示授权成功。' },
    ],
    exceptionLabel: '防重复开通规则',
    exceptionItems: [
      { text: '接口超时或用户重复点击时，不能新建第二批云电脑。' },
      { text: '系统先用同一请求标识查询厂商最终结果。' },
      { text: '防重复标识按操作类型、授权 ID、资源 ID 和本次操作上下文生成。' },
      { text: '同一实例、同一次操作只能创建一次。' },
    ],
    stateItems: [
      { text: '提交后：进入', previews: [{ color: 'arcoblue', label: '开通中', type: 'tag' }] },
      { text: '开通中：确定按钮进入 loading，按钮不可重复点击。', previews: [{ label: '确定', loading: true, type: 'button', variant: 'primary' }] },
      { text: '全部成功：授权成功，租户列表不展示状态 Tag。' },
      { text: '部分或全部失败：按 1.4 聚合状态展示。' },
    ],
    recoveryItems: [
      {
        text: '厂商返回失败：抽屉内展示失败提示，资源级进入云电脑开通失败。',
        previews: [{ label: '网络包容量不足，云电脑开通失败。请处理后点击“失败重试”。', status: 'error', type: 'alert' }],
      },
      { text: '恢复入口：按 1.5 失败重试处理。', previews: [{ label: '失败重试', type: 'button', variant: 'text' }] },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '成功资源不回滚、不重复创建。' },
      { text: '授权提交结果和云电脑资源状态分层记录。' },
      { text: '部分失败时保留成功/失败明细。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-create-authorization',
  },
  {
    noteId: 'CRA-1.3',
    number: '1.3',
    page: '租户管理 / 编辑授权',
    module: '已有资源的厂商限制',
    target: '编辑授权抽屉 > 云厂商',
    ruleLabel: '切换规则',
    ruleItems: [
      { text: '新增授权：允许选择无影云、火山云、天翼云。' },
      { text: '编辑授权：云厂商不允许直接切换。' },
      { text: '如果租户要换厂商重新使用云电脑，必须新建一条授权。', previews: [{ label: '新增授权', type: 'button', variant: 'primary' }] },
    ],
    exceptionLabel: '禁止范围',
    exceptionItems: [
      { text: '未释放：不允许切换。' },
      { text: '释放中：不允许切换。' },
      { text: '释放失败：不允许切换。' },
      { text: '已释放：旧授权保持终态，不通过编辑旧授权再次开通。', previews: [{ color: 'gray', label: '已释放', type: 'tag' }] },
    ],
    stateItems: [
      { text: '不满足条件：云厂商选项禁用。', previews: [{ label: '无影云 / 火山云 / 天翼云', type: 'field' }] },
      { text: '提交时：保持原厂商。' },
      { text: '新增授权：生成新的授权记录和新的云电脑资源。' },
    ],
    recoveryItems: [
      { text: '先完成原厂商释放。' },
      { text: '如需继续使用，走新增授权自动开通流程。', previews: [{ label: '新增授权', type: 'button', variant: 'primary' }] },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '编辑态不能绕过限制直接修改厂商。' },
      { text: '新增态不得触发该判断。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-opened',
  },
  {
    noteId: 'CRA-1.4',
    number: '1.4',
    page: '租户管理 / 编辑授权',
    module: '授权产品聚合状态',
    target: '租户列表 > 授权产品聚合状态标签',
    ruleLabel: '聚合规则',
    ruleItems: [
      { text: '租户列表授权产品列只展示授权产品聚合状态。' },
      {
        text: '状态枚举：',
        children: [
          { text: '开通中', previews: [{ color: 'arcoblue', label: '开通中', type: 'tag' }] },
          { text: '部分成功', previews: [{ color: 'orange', label: '部分成功', type: 'tag' }] },
          { text: '失败', previews: [{ color: 'red', label: '失败', type: 'tag' }] },
          { text: '成功', previews: [{ label: '不展示 Tag', type: 'empty' }] },
        ],
      },
      { text: '文案、标签、Tooltip 都不得展示资源级生命周期状态。' },
    ],
    exceptionLabel: '判断规则',
    exceptionItems: [
      { text: '云电脑部分失败，或同一授权中存在其他成功产品：展示部分成功。', previews: [{ color: 'orange', label: '部分成功', type: 'tag' }] },
      { text: '全部云电脑失败且无其他成功产品：展示失败。', previews: [{ color: 'red', label: '失败', type: 'tag' }] },
      { text: '云电脑开通失败、释放期等子级状态只在详情展示。' },
    ],
    recoveryItems: [
      { text: '处理厂商侧原因后点击失败重试。', previews: [{ label: '失败重试', type: 'button', variant: 'text' }] },
      { text: '重试规则见 1.5。' },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '租户列表不得同时展示部分成功和云电脑开通失败。' },
      { text: '失败资源实例 ID 和用户绑定状态显示“—”。' },
      { text: '其他已成功产品保持成功状态。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:locate-authorization-result-status',
  },
  {
    noteId: 'CRA-1.5',
    number: '1.5',
    page: '租户管理 / 编辑授权',
    module: '失败重试',
    target: '编辑授权抽屉 > 失败重试',
    ruleLabel: '重试规则',
    ruleItems: [
      { text: '点击失败重试后，只重新提交失败资源。', previews: [{ label: '失败重试', loading: true, type: 'button', variant: 'text' }] },
      { text: '已成功资源不重复创建。' },
      { text: '释放失败重试使用授权级入口。' },
    ],
    exceptionLabel: '重试范围',
    exceptionItems: [
      { text: '开通失败：只重试开通失败资源。', previews: [{ color: 'red', label: '云电脑开通失败', type: 'tag' }] },
      { text: '续期失败：只重试续期失败资源。', previews: [{ color: 'red', label: '续期失败', type: 'tag' }] },
      { text: '释放失败：只重试释放失败资源。', previews: [{ color: 'red', label: '释放失败', type: 'tag' }] },
      { text: '再次失败：保留最新厂商错误和操作单。' },
    ],
    stateItems: [
      { text: '点击后：按钮进入处理中，按钮前展示 loading icon。', previews: [{ label: '失败重试', loading: true, type: 'button', variant: 'text' }] },
      { text: '成功后：补齐实例 ID 和绑定状态。' },
      { text: '再次失败：保留失败重试入口。', previews: [{ label: '失败重试', type: 'button', variant: 'text' }] },
    ],
    recoveryItems: [
      { text: '用户处理厂商容量、网络包、规格、镜像或账号问题后重试。' },
      { text: '历史失败日志不覆盖。' },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '重试前后成功资源数量不变。' },
      { text: '已成功资源 ID 不变。' },
      { text: '只新增本次重试日志。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-open-failed',
  },
  {
    noteId: 'CRA-1.6',
    number: '1.6',
    page: '租户管理 / 编辑授权',
    module: '续期与 7 天释放期',
    target: '编辑授权抽屉 > 云资源状态',
    ruleLabel: '释放期规则',
    ruleItems: [
      { text: '授权到期时间下一秒进入 7 天释放期。', previews: [{ color: 'orange', label: '释放期', type: 'tag' }] },
      { text: '释放期内支持续期和手动释放。', previews: [{ label: '续期', type: 'button', variant: 'text' }, { label: '释放', status: 'danger', type: 'button', variant: 'text' }] },
      { text: '释放期结束后系统自动释放。', previews: [{ color: 'orange', label: '自动释放中', type: 'tag' }] },
    ],
    exceptionLabel: '时间规则',
    exceptionItems: [
      { text: '时间按北京时间计算，精确到秒。' },
      { text: '释放期第 7 天 23:59:59 后自动释放。' },
      { text: '服务端每小时扫描释放期已结束资源。' },
    ],
    stateItems: [
      { text: '释放期：展示释放期起止时间和自动释放时间。', previews: [{ color: 'orange', label: '释放期', type: 'tag' }] },
      { text: '续期中：按云电脑实例逐台落结果。', previews: [{ color: 'arcoblue', label: '续期中', type: 'tag' }, { label: '续期', loading: true, type: 'button', variant: 'text' }] },
      { text: '续期失败：保留原到期/释放期状态。', previews: [{ color: 'red', label: '续期失败', type: 'tag' }] },
    ],
    recoveryItems: [
      { text: '续期失败后可重试续期。', previews: [{ label: '失败重试', type: 'button', variant: 'text' }] },
      { text: '若仍处于释放期，主状态继续显示释放期，并追加续期失败风险标签。' },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '释放期内和释放期结束后的操作项一致。' },
      { text: '自动释放任务可在测试环境构造时间触发。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-release-period',
  },
  {
    noteId: 'CRA-1.7',
    number: '1.7',
    page: '租户管理 / 编辑授权',
    module: '手动释放',
    target: '编辑授权抽屉 > 释放',
    ruleLabel: '释放规则',
    ruleItems: [
      { text: '已开通资源支持手动释放。', previews: [{ label: '释放', status: 'danger', type: 'button', variant: 'text' }] },
      { text: '释放期资源支持手动释放。', previews: [{ color: 'orange', label: '释放期', type: 'tag' }, { label: '释放', status: 'danger', type: 'button', variant: 'text' }] },
      { text: '点击释放必须二次确认。' },
      { text: '确认后向当前云厂商提交释放请求。' },
      { text: '释放成功的云电脑同步解绑 1:1 附带机器人令牌。' },
    ],
    exceptionLabel: '任务规则',
    exceptionItems: [
      { text: '手动释放、自动释放、释放重试共用释放任务。' },
      { text: 'trigger_type 区分 manual / automatic / retry。' },
      { text: '服务端按授权和资源加锁。' },
      { text: '已有释放中任务时不重复提交。' },
    ],
    stateItems: [
      { text: '确认后：释放中。', previews: [{ color: 'arcoblue', label: '释放中', type: 'tag' }, { label: '释放', loading: true, status: 'danger', type: 'button', variant: 'text' }] },
      { text: '全部成功：已释放。', previews: [{ color: 'gray', label: '已释放', type: 'tag' }] },
      { text: '部分或全部失败：释放失败。', previews: [{ color: 'red', label: '释放失败', type: 'tag' }] },
      { text: '单独“机器人令牌”授权额度不因云电脑释放回补或扣减。' },
    ],
    recoveryItems: [
      { text: '释放失败保留失败资源、厂商操作单和失败原因。' },
      { text: '查询暂时失败时沿用原操作单继续查询，不重复提交。' },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '取消二次确认不发起请求。' },
      { text: '三家云厂商遵守同一状态闭环。' },
      { text: '部分失败时只允许重试失败资源。' },
      { text: '操作记录展示已解绑附带机器人令牌数。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-opened',
  },
  {
    noteId: 'CRA-1.8',
    number: '1.8',
    page: '租户管理 / 编辑授权',
    module: '已释放终态',
    target: '编辑授权抽屉 > 已释放状态',
    ruleLabel: '终态规则',
    ruleItems: [
      { text: '已释放是云电脑资源终态。', previews: [{ color: 'gray', label: '已释放', type: 'tag' }] },
      { text: '对应附带机器人令牌同步解绑。' },
      { text: '旧授权内不展示重新开通入口。', previews: [{ label: '不展示重新开通', type: 'empty' }] },
      { text: '如需继续使用云电脑，创建新的授权。', previews: [{ label: '新增授权', type: 'button', variant: 'primary' }] },
    ],
    exceptionLabel: '限制规则',
    exceptionItems: [
      { text: '已释放资源不再进入开通中或已开通。' },
      { text: '附带机器人令牌解绑后不可继续使用。' },
      { text: '不复用原云电脑实例 ID。' },
      { text: '不调用开通 OpenAPI 恢复旧授权资源。' },
    ],
    stateItems: [
      { text: '租户授权抽屉：只展示已释放状态。', previews: [{ color: 'gray', label: '已释放', type: 'tag' }] },
      { text: '云资源管理：保留详情和日志，不展示危险操作。', previews: [{ label: '详情', type: 'button', variant: 'text' }, { label: '日志', type: 'button', variant: 'text' }] },
      { text: '新增授权：按新增授权自动开通流程生成新资源。' },
    ],
    recoveryItems: [
      { text: '用户误以为要恢复旧资源时，引导创建新授权。', previews: [{ label: '新增授权', type: 'button', variant: 'primary' }] },
      { text: '旧授权只用于查看历史状态、详情和日志。' },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '全局不出现重新开通按钮、权限点和操作日志类型。' },
      { text: '已释放资源不会被更新为开通中或已开通。' },
      { text: '单独“机器人令牌”授权产品额度保持不变。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-unsubscribed',
  },
  {
    noteId: 'CRA-1.9',
    number: '1.9',
    page: '租户管理 / 编辑授权',
    module: '抽屉操作权限与状态限制',
    target: '编辑授权抽屉 > 云资源操作区',
    ruleLabel: '操作规则',
    ruleItems: [
      { text: '续期、失败重试、释放按云电脑资源状态展示。', previews: [{ label: '续期', type: 'button', variant: 'text' }, { label: '失败重试', type: 'button', variant: 'text' }, { label: '释放', status: 'danger', type: 'button', variant: 'text' }] },
      { text: '状态不允许时不展示或置灰。' },
      { text: '处理中状态禁止重复提交。' },
    ],
    exceptionLabel: '权限规则',
    exceptionItems: [
      { text: '所有危险操作受后台权限点控制。' },
      { text: '无权限时按钮置灰并提示无权限。', previews: [{ disabled: true, label: '续期', type: 'button', variant: 'text' }] },
      { text: '不能绕过前端直接发起后端操作。' },
    ],
    stateItems: [
      { text: '已开通 / 释放期：展示续期、释放。', previews: [{ label: '续期', type: 'button', variant: 'text' }, { label: '释放', status: 'danger', type: 'button', variant: 'text' }] },
      { text: '失败状态：展示失败重试。', previews: [{ label: '失败重试', type: 'button', variant: 'text' }] },
      { text: '已释放：不展示续期、释放、失败重试或重新开通。', previews: [{ color: 'gray', label: '已释放', type: 'tag' }, { label: '无危险操作', type: 'empty' }] },
      { text: '开通中 / 续期中 / 释放中 / 自动释放中：禁止重复提交，并展示对应 loading。', previews: [{ label: '续期', loading: true, type: 'button', variant: 'text' }, { label: '释放', loading: true, status: 'danger', type: 'button', variant: 'text' }] },
    ],
    acceptanceItems: [
      { text: '抽屉操作入口和 PRD 场景表一致。' },
      { text: '至少覆盖全权限、只读、无危险操作 3 类角色。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-opened',
  },
  {
    noteId: 'CRA-2.1',
    number: '2.1',
    page: '云资源管理',
    module: '厂商总览与列表结构',
    target: '云厂商 Tab；云资源列表',
    ruleLabel: '列表规则',
    ruleItems: [
      { text: '云资源管理按云厂商切换资源视图。', previews: [{ label: '无影云', type: 'button', variant: 'text' }, { label: '火山云', type: 'button', variant: 'text' }, { label: '天翼云', type: 'button', variant: 'text' }] },
      { text: '每个厂商展示对应统计和资源列表。' },
      { text: '列表使用租户父行 + 云桌面子行。' },
    ],
    exceptionLabel: '固定列规则',
    exceptionItems: [
      { text: '父行展示租户名称和云桌面数量。', previews: [{ label: '租户名  6 台', type: 'field' }] },
      { text: '子行展示单台云桌面明细。' },
      { text: '左侧租户名称列和右侧操作列固定。', previews: [{ label: '租户名称列固定', type: 'field' }, { label: '操作列固定', type: 'field' }] },
    ],
    stateItems: [
      { text: '切换厂商：刷新统计和列表。' },
      { text: '横向滚动：固定列表头和表体同步固定。' },
    ],
    acceptanceItems: [
      { text: '租户名称列和操作列不脱节。' },
      { text: '父子表结构和云厂商 Tab 数据一致。' },
    ],
    acceptance: '',
    menuKey: '云资源管理',
  },
  {
    noteId: 'CRA-2.2',
    number: '2.2',
    page: '云资源管理',
    module: 'ToDesk 字段',
    target: '云资源列表 > ToDesk；复合搜索',
    ruleLabel: '字段规则',
    ruleItems: [
      { text: '云资源列表新增 ToDesk 字段。', previews: [{ label: 'ToDesk', type: 'field' }] },
      { text: '复合搜索支持 ToDesk。', previews: [{ label: '搜索字段：ToDesk', type: 'field' }] },
      { text: '导出包含 ToDesk。' },
    ],
    exceptionLabel: '查询规则',
    exceptionItems: [
      { text: 'ToDesk 为空：显示', previews: [{ label: '--', type: 'empty' }] },
      { text: '搜索字段选择 ToDesk 后，支持完整或部分编号匹配。' },
    ],
    stateItems: [
      { text: '列表、搜索、导出使用同一 ToDesk 数据口径。' },
    ],
    acceptanceItems: [
      { text: '页面查询结果和导出结果一致。' },
      { text: 'ToDesk 字段便于交付和远程连接核对。' },
    ],
    acceptance: '',
    menuKey: '云资源管理',
  },
  {
    noteId: 'CRA-2.3',
    number: '2.3',
    page: '云资源管理',
    module: '创建时间筛选',
    target: '云资源列表 > 筛选区',
    ruleLabel: '筛选规则',
    ruleItems: [
      { text: '创建时间按云桌面创建时间过滤。', previews: [{ label: '创建时间起 - 创建时间止', type: 'field' }] },
      { text: '起止日期包含当天 00:00:00 至 23:59:59。' },
      { text: '切换云厂商时清空当前筛选。' },
    ],
    exceptionLabel: '刷新规则',
    exceptionItems: [
      { text: '刷新只触发厂商状态同步。', previews: [{ label: '刷新', type: 'button', variant: 'secondary' }] },
      { text: '刷新不承担自动释放调度。' },
      { text: '刷新同步成功：更新本地状态，筛选条件和分页不清空。' },
      { text: '刷新同步失败：提示同步失败，日志记录失败原因，本地旧状态不覆盖。' },
    ],
    stateItems: [
      { text: '清空日期：恢复当前厂商全部数据。' },
      {
        text: '测试支持',
        children: [
          { text: '支持造到期时间和释放期结束时间，可立即触发自动释放任务。' },
          { text: '支持手动触发自动释放任务入口或脚本。' },
          { text: '支持一条授权下成功资源与失败资源并存。' },
        ],
      },
    ],
    acceptanceItems: [
      { text: '刷新不清空筛选和分页。' },
      { text: '测试环境支持强制同步失败。' },
      { text: '可验证释放成功、部分失败、全部失败和重复触发去重。' },
      { text: '部分成功造数结果在租户列表、抽屉、云资源管理、导出和日志中一致。' },
    ],
    acceptance: '',
    menuKey: '云资源管理',
  },
  {
    noteId: 'CRA-2.4',
    number: '2.4',
    page: '云资源管理',
    module: '导出',
    target: '云资源列表 > 导出',
    ruleLabel: '导出规则',
    ruleItems: [
      { text: '按当前云厂商导出。', previews: [{ label: '导出', type: 'button', variant: 'secondary' }] },
      { text: '按当前筛选条件导出。' },
      { text: '导出取数宝本地资源表明细。' },
    ],
    exceptionLabel: '字段规则',
    exceptionItems: [
      {
        text: '导出字段',
        children: [
          { text: '租户名称：租户父行名称。' },
          { text: '授权提交结果：开通中 / 成功 / 部分成功 / 失败，导出中文状态。' },
          { text: '云桌面名称：云电脑资源名称。' },
          { text: '云桌面 ID：云厂商实例 ID，空值显示', previews: [{ label: '--', type: 'empty' }] },
          { text: '机器人口令：资源对应机器人口令，空值显示', previews: [{ label: '--', type: 'empty' }] },
          { text: 'ToDesk：ToDesk 编号，空值显示', previews: [{ label: '--', type: 'empty' }] },
          { text: '创建时间 / 到期时间：本地资源表时间，格式 YYYY-MM-DD HH:mm:ss。' },
          { text: '机器人状态 / 云桌面状态：资源维度状态，导出中文状态。' },
          { text: '厂商操作单：最近一次相关厂商操作单，空值显示', previews: [{ label: '--', type: 'empty' }] },
          { text: '失败原因：标准失败原因；详情/日志保留厂商原始错误，空值显示', previews: [{ label: '--', type: 'empty' }] },
        ],
      },
      { text: '无匹配数据：不生成空文件，并提示“暂无可导出数据”。' },
    ],
    stateItems: [
      { text: '有数据时生成 CSV。' },
      { text: '文件名包含云厂商和导出时间。' },
      { text: '状态字段使用中文值。' },
    ],
    acceptanceItems: [
      { text: '导出结果必须与当前列表筛选条件一致。' },
      { text: '导出字段顺序按本标注字段规则执行。' },
    ],
    acceptance: '',
    menuKey: '云资源管理',
  },
  {
    noteId: 'CRA-3.1',
    number: '3.1',
    page: '状态闭环',
    module: '统一状态映射',
    target: '租户授权状态；云资源列表 > 云桌面状态',
    ruleLabel: '状态分层规则',
    ruleItems: [
      { text: '授权提交结果和云电脑资源状态分层维护。' },
      {
        text: '授权提交结果：',
        previews: [
          { color: 'arcoblue', label: '开通中', type: 'tag' },
          { color: 'orange', label: '部分成功', type: 'tag' },
          { color: 'red', label: '失败', type: 'tag' },
          { label: '成功不展示 Tag', type: 'empty' },
        ],
      },
      {
        text: '云电脑资源状态：',
        previews: [
          { color: 'green', label: '已开通', type: 'tag' },
          { color: 'red', label: '云电脑开通失败', type: 'tag' },
          { color: 'orange', label: '释放期', type: 'tag' },
          { color: 'gray', label: '已释放', type: 'tag' },
        ],
      },
    ],
    exceptionLabel: '展示规则',
    exceptionItems: [
      { text: '租户列表展示授权产品聚合状态。' },
      { text: '授权抽屉和云资源管理展示资源级状态。' },
      { text: '详情和日志保留厂商原始状态和操作单。' },
    ],
    stateItems: [
      { text: '开通中：禁止编辑。', previews: [{ color: 'arcoblue', label: '开通中', type: 'tag' }] },
      { text: '失败状态：按当前操作提供匹配重试入口。', previews: [{ label: '失败重试', type: 'button', variant: 'text' }] },
      { text: '已释放：终态，不提供重新开通。', previews: [{ color: 'gray', label: '已释放', type: 'tag' }, { label: '不展示重新开通', type: 'empty' }] },
    ],
    recoveryItems: [
      { text: '失败恢复沿用原操作上下文。' },
      { text: '前台展示标准化失败原因。' },
    ],
    recovery: '',
    acceptanceItems: [
      { text: '租户管理、授权抽屉、云资源管理、导出、日志状态一致。' },
      { text: '详情和日志保留厂商原始错误码和原始错误文案。' },
    ],
    acceptance: '',
    menuKey: '云资源管理',
  },
  {
    noteId: 'CRA-3.2',
    number: '3.2',
    page: '状态闭环',
    module: '权限与状态操作',
    target: '云资源管理 > 操作列',
    ruleLabel: '权限规则',
    ruleItems: [
      { text: '新增、编辑、失败重试、续期、释放、导出均挂后台权限点。', previews: [{ label: '新增授权', type: 'button', variant: 'primary' }, { label: '编辑', type: 'button', variant: 'text' }, { label: '导出', type: 'button', variant: 'secondary' }] },
      { text: '无权限时按钮置灰并提示无权限。', previews: [{ disabled: true, label: '导出', type: 'button', variant: 'secondary' }] },
      { text: '不采用静默隐藏。' },
    ],
    exceptionLabel: '只读规则',
    exceptionItems: [
      { text: '详情按只读权限开放。', previews: [{ label: '详情', type: 'button', variant: 'text' }] },
      { text: '日志按只读权限开放。', previews: [{ label: '日志', type: 'button', variant: 'text' }] },
      { text: '只读用户不能发起危险操作。' },
    ],
    stateItems: [
      { text: '有权限：展示可操作入口。' },
      { text: '无权限：置灰并提示无权限。' },
      { text: '状态不允许：不展示或置灰。' },
    ],
    acceptanceItems: [
      { text: '无权限账号不能绕过前端直接发起操作。' },
      { text: '至少覆盖全权限、只读、无危险操作 3 类测试角色。' },
    ],
    acceptance: '',
    menuKey: '云资源管理',
  },
  {
    noteId: 'CRA-3.3',
    number: '3.3',
    page: '状态闭环',
    module: '操作日志与审计',
    target: '编辑授权抽屉 > 云资源操作记录',
    ruleLabel: '日志规则',
    ruleItems: [
      { text: '操作日志按“操作批次 + 资源实例”双层记录。', previews: [{ label: '日志', type: 'button', variant: 'text' }] },
      { text: '覆盖开通、失败重试、续期、手动释放、自动释放和导出。' },
    ],
    exceptionLabel: '记录规则',
    exceptionItems: [
      { text: '自动释放操作人为系统用户。' },
      { text: '失败重试新增重试日志，不覆盖原失败日志。' },
      { text: '释放失败保留失败资源和厂商操作单。' },
      { text: '释放成功记录已解绑附带机器人令牌数。' },
    ],
    stateItems: [
      { text: '抽屉展示最近记录。' },
      { text: '完整日志走日志入口。', previews: [{ label: '日志', type: 'button', variant: 'text' }] },
      { text: '部分成功、部分失败、自动释放和失败重试均可追溯。' },
    ],
    acceptanceItems: [
      { text: '日志包含操作人、时间、类型、云厂商、授权 ID、实例 ID、防重复提交标识、厂商操作单、成功数、失败数、已解绑附带机器人令牌数和失败原因。' },
      { text: '同一资源的状态变化可串联追踪。' },
    ],
    acceptance: '',
    menuKey: '租户管理-生态',
    openEvent: 'cloud-resource:open-edit-unsubscribed',
  },
];

export function getCloudAnnotation(noteId: string) {
  return cloudAnnotations.find((item) => item.noteId === noteId);
}
