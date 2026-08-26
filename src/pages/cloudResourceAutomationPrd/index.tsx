import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tag, Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

type RuleRow = {
  noteId: string;
  number: string;
  scene: string;
  page: string;
  module: string;
  action: ReactNode;
  systemRule: ReactNode;
  statusRule: ReactNode;
  acceptance: ReactNode;
};

let mermaidRenderQueue: Promise<void> = Promise.resolve();

const changeRows = [
  ['时间', '版本号', '变更人', '主要变更内容'],
  [
    '2026-07-10',
    'V0.1',
    '森森',
    '建立云资源自动化开通 PRD 与交互原型，覆盖无影云、火山云、天翼云的开通、状态同步、失败重试、续期、7 天释放期、释放闭环，以及云资源管理列表的 ToDesk、父子表、创建时间筛选和导出能力。',
  ],
];

const termRows = [
  ['术语/缩略词', '说明'],
  ['云资源自动化开通', '租户完成云桌面机器人授权后，由取数宝调用云厂商 OpenAPI 创建并维护对应云资源。'],
  ['云桌面机器人', '租户授权产品之一，业务含义为“云电脑 + 机器人令牌”；授权数量与云电脑实例、附带机器人令牌数量一一对应。'],
  ['附带机器人令牌', '云桌面机器人随云电脑自动附带的 1:1 机器人令牌；云电脑释放成功后同步解绑，不影响单独“机器人令牌”授权额度。'],
  ['云厂商操作单', '一次开通、续期、释放或重试请求在云厂商侧对应的请求或订单标识。'],
  ['7 天释放期', '授权到期后保留 7 天的处理窗口，期间支持续期或手动释放，窗口结束后由系统自动提交释放。'],
];

const storyRows = [
  ['生态运营人员', '为租户新增云桌面机器人授权', '一次完成云厂商、时长、规格、镜像、数量等配置，提交后自动开通云资源。'],
  ['交付运维人员', '查看租户云资源开通结果', '在租户列表识别授权产品聚合状态，在授权详情中查看云电脑资源级状态和失败原因。'],
  ['交付运维人员', '处理厂商容量、网络包或参数异常', '修复厂商侧问题后点击失败重试，不重复创建已成功的云电脑。'],
  ['生态运营人员', '处理授权到期资源', '授权到期后进入 7 天释放期，期间可续期或手动释放；释放成功后云电脑及其附带机器人令牌一并解绑。'],
  ['云资源运维人员', '统一查看三家云厂商资源', '按云厂商、租户、机器人状态、云桌面状态、ToDesk 和创建时间查询资源，并按租户父子层级查看云桌面。'],
  ['云资源运维人员', '导出云资源清单', '按当前云厂商和筛选条件导出资源明细，用于交付核对、异常排查和厂商侧对账。'],
];

const scopeRows = [
  ['功能模块', '新增或优化', '功能点', '端', '产品线', '优先级'],
  ['租户管理', '优化', '云桌面机器人授权及厂商配置', '智能门户后台', '取数宝', 'P0'],
  ['自动开通', '新增', '无影云、火山云、天翼云 OpenAPI 开通与结果同步', '服务端', '取数宝', 'P0'],
  ['失败处理', '新增', '授权产品聚合状态、云电脑失败原因和失败重试', '智能门户后台', '取数宝', 'P0'],
  ['资源维护', '新增', '续期及云厂商状态同步', '智能门户后台 / 服务端', '取数宝', 'P0'],
  ['资源释放', '新增', '7 天释放期、手动释放、自动释放、附带机器人令牌解绑及释放失败重试', '智能门户后台 / 服务端', '取数宝', 'P0'],
  [{ children: '云资源管理', rowSpan: 5 }, '优化', '三厂商资源总览、查询、状态和操作', '智能门户后台', '取数宝', 'P0'],
  [{ children: null, rowSpan: 0 }, '新增', '列表新增 ToDesk 字段，支持展示和按 ToDesk 检索', '智能门户后台', '取数宝', 'P0'],
  [{ children: null, rowSpan: 0 }, '优化', '列表样式调整为租户父行 + 云桌面子行的级联父子表', '智能门户后台', '取数宝', 'P0'],
  [{ children: null, rowSpan: 0 }, '新增', '新增创建时间筛选，按创建时间起止范围过滤云桌面资源', '智能门户后台', '取数宝', 'P0'],
  [{ children: null, rowSpan: 0 }, '新增', '新增导出功能，按当前云厂商和筛选条件导出资源清单', '智能门户后台', '取数宝', 'P0'],
];

function ApiList({ items }: { items: string[] }) {
  return (
    <span className={styles.apiList}>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </span>
  );
}

const providerRows = [
  ['云厂商', 'OpenAPI 责任', '开通 / 查询', '续期 / 释放', '本需求约束'],
  [
    '无影云',
    '后端 owner 最终确认 endpoint、版本、入参、出参、异步查询、轮询频率、超时终态、限流和错误码。',
    <ApiList items={['CreateDesktops', 'DescribeDesktops']} />,
    <ApiList items={['RenewDesktops', 'DeleteDesktops']} />,
    '创建前需具备办公网络、用户及策略；DeleteDesktops 用于释放按量云电脑或已到期包年包月云电脑；释放批量上限按 100 台控制。',
  ],
  [
    '火山云',
    '后端 owner 最终确认 endpoint、版本、入参、出参、异步查询、轮询频率、超时终态、限流和错误码。',
    <ApiList items={['ECS RunInstances', 'ECS DescribeInstances']} />,
    <ApiList items={['费用中心 RenewInstance', '费用中心 UnsubscribeInstance']} />,
    '地域、可用区、网络和登录凭证使用预置配置；规格、镜像、时长、数量由授权配置确定；续期和释放按实例提交，并传入防重复提交标识。',
  ],
  [
    '天翼云',
    '后端 owner 最终确认 endpoint、版本、入参、出参、异步查询、轮询频率、超时终态、限流和错误码。',
    <ApiList items={['创建云电脑 v3', '查询云电脑列表 v3', '绑定用户 v3']} />,
    <ApiList items={['POST /v3/desktop/batch/delete']} />,
    '同一请求最多提交 10 台云电脑；开通成功后再记录实例 ID 和用户绑定状态。',
  ],
];

const errorReasonRows = [
  ['标准失败原因', '前台展示文案', '典型来源', '是否允许重试'],
  ['CAPACITY_INSUFFICIENT', '厂商资源容量不足', '云桌面库存、区域资源池不足', '是'],
  ['NETWORK_PACKAGE_INSUFFICIENT', '网络包容量不足', '天翼云网络包、带宽包不足', '是，需先处理厂商侧资源'],
  ['SPEC_UNAVAILABLE', '规格不可用', '实例规格停售、不支持当前地域/可用区', '是，需调整配置'],
  ['IMAGE_UNAVAILABLE', '镜像不可用', '镜像不存在、未授权、与规格不兼容', '是，需调整镜像'],
  ['ACCOUNT_BIND_FAILED', '账号绑定失败', '天翼云用户绑定、账号不存在或已绑定', '是，需处理账号'],
  ['PERMISSION_DENIED', '厂商权限不足', 'AK/SK、角色、资源权限不足', '否，需修复权限后重试'],
  ['API_TIMEOUT', '厂商接口超时', 'OpenAPI 超时或查询暂不可用', '是，先按操作单查询最终结果'],
  ['API_RATE_LIMITED', '厂商接口限流', 'OpenAPI 频控、批量上限触发', '是，按退避策略重试'],
  ['UNKNOWN', '云厂商返回未知错误', '未映射错误码或异常文案', '视厂商原始错误判断'],
];

const permissionRows = [
  ['权限点', '控制范围', '无权限表现'],
  ['cloud_resource:create', '新增授权时提交云资源自动开通', '确定按钮置灰并提示无权限'],
  ['cloud_resource:edit', '编辑授权及云厂商配置', '编辑入口置灰并提示无权限'],
  ['cloud_resource:retry', '开通失败、续期失败、释放失败的失败重试', '失败重试按钮置灰并提示无权限'],
  ['cloud_resource:renew', '续期', '续期按钮置灰并提示无权限'],
  ['cloud_resource:release', '手动释放', '释放按钮置灰并提示无权限'],
  ['cloud_resource:export', '云资源管理导出', '导出按钮置灰并提示无权限'],
  ['cloud_resource:view_detail', '详情查看', '无权限时不可打开详情'],
  ['cloud_resource:view_log', '日志查看', '无权限时不可打开日志'],
];

const operationLogRows = [
  ['字段', '记录口径', '说明'],
  ['operation_batch_id', '操作批次 ID', '一次开通、续期、释放或重试生成一个批次。'],
  ['operation_type', 'open / retry / renew / release / auto_release / export', '区分用户动作和系统动作。'],
  ['trigger_type', 'manual / automatic / retry', '释放任务统一字段，区分手动、自动、重试。'],
  ['authorization_id', '授权记录 ID', '用于回查租户授权。'],
  ['resource_id', '云电脑资源 ID', '按资源实例记录成功/失败。'],
  ['provider', 'wuying / huoshan / tianyi', '三家厂商统一枚举。'],
  ['dedupe_token', '防重复提交标识', '按 operation_type + authorization_id + resource_id + attempt_context 生成。'],
  ['vendor_operation_id', '厂商操作单', '厂商返回请求 ID、订单号或批量删除单。'],
  ['success_count / fail_count', '成功数 / 失败数', '批次层面统计。'],
  ['unbound_robot_token_count', '已解绑附带机器人令牌数', '仅释放成功资源计数；不影响单独机器人令牌授权额度。'],
  ['standard_error_reason', '标准失败原因', '前台展示和统计使用。'],
  ['vendor_error_code / vendor_error_message', '厂商原始错误', '仅在详情和日志中保留，便于排查。'],
  ['operator_id / operator_name', '操作人', '自动释放记录为系统用户。'],
  ['submitted_at / completed_at', '提交时间 / 完成时间', '统一使用北京时间展示。'],
];

const flowDiagrams = [
  {
    id: 'provision',
    title: '1. 新增授权自动开通流程',
    defaultZoom: 0.78,
    chart: `
flowchart LR
  start(["新增授权"])
  select["选择云桌面机器人"]
  config["选择云厂商并填写配置"]
  save["确定：授权保存与云资源开通一起提交"]
  pending["提交状态：开通中，禁止再次编辑"]
  tasks["按授权数量生成云电脑任务"]
  openapi["调用厂商 OpenAPI"]
  result{"厂商最终结果"}
  success["写入实例 ID、到期时间、绑定状态"]
  opened(["授权结果：成功"])
  fail["失败资源记录错误码和原因"]
  visible["授权产品聚合状态：部分成功或失败"]
  retry["点击失败重试"]
  retryTask["仅重试失败资源"]
  querying["按操作单继续查询"]

  start --> select --> config --> save --> pending --> tasks --> openapi --> result
  result -->|"全部成功"| success --> opened
  result -->|"部分或全部失败"| fail --> visible --> retry --> retryTask --> openapi
  result -->|"处理中或超时"| querying --> result
`,
  },
  {
    id: 'provider-edit',
    title: '2. 编辑授权与云厂商差异流程',
    defaultZoom: 0.74,
    chart: `
flowchart LR
  entry(["进入编辑授权"])
  change{"是否切换云厂商"}
  keep["保留当前厂商，仅保存非开通类配置"]
  hasResource{"存在未释放云资源"}
  block["禁止保存，提示先释放"]
  closed["已释放为终态，旧授权不重新开通"]
  newAuth["如需继续使用，新增授权"]
  save["保存配置"]
  create["进入新增授权自动开通流程"]

  entry --> change
  change -->|"否"| keep --> save
  change -->|"是"| hasResource
  hasResource -->|"是"| block
  hasResource -->|"否，均已释放"| closed --> newAuth --> create
`,
  },
  {
    id: 'renew-release',
    title: '3. 续期、释放期与释放流程',
    defaultZoom: 0.72,
    chart: `
flowchart LR
  expired(["授权到期"])
  release["北京时间下一秒进入 7 天释放期"]
  action{"释放期内操作"}
  renew["按授权产品提交续期"]
  renewApi["按实例调用续期 OpenAPI"]
  renewResult{"续期结果"}
  renewSuccess(["回到已开通，清除释放期"])
  renewFail["保留原状态，标记续期失败，允许重试"]
  manual["点击释放"]
  confirm{"二次确认"}
  stay["取消，保持当前状态"]
  releaseTask["共用释放任务：trigger_type 区分来源"]
  releasing["状态：释放中"]
  releaseResult{"释放结果"}
  releaseSuccess(["状态：已释放；解绑附带机器人令牌"])
  releaseFail["释放失败：只重试失败资源"]
  auto["每小时扫描到释放期结束"]
  autoSubmit["系统自动提交释放"]

  expired --> release --> action
  action -->|"续期"| renew --> renewApi --> renewResult
  renewResult -->|"成功"| renewSuccess
  renewResult -->|"失败"| renewFail --> renew
  action -->|"手动释放"| manual --> confirm
  confirm -->|"取消"| stay
  confirm -->|"确认"| releaseTask
  action -->|"无操作"| auto --> autoSubmit --> releaseTask
  releaseTask --> releasing --> releaseResult
  releaseResult -->|"成功"| releaseSuccess
  releaseResult -->|"部分或全部失败"| releaseFail --> releaseTask
`,
  },
];

const ruleRows: RuleRow[] = [
  {
    noteId: 'CRA-3.1',
    number: '3.1',
    scene: '全局状态闭环',
    page: '租户列表 / 授权详情 / 云资源管理',
    module: '统一状态映射',
    action: '运营或交付查看授权结果、云电脑状态、失败原因和厂商操作单。',
    systemRule: '状态分为两层：授权提交结果包括开通中、成功、部分成功、失败；云电脑资源状态包括已开通、云电脑开通失败、续期中、释放期、释放中、已释放、释放失败。',
    statusRule: '开通中禁止编辑；授权提交结果为部分成功或失败时允许失败重试；释放期允许续期和手动释放；释放中禁止重复释放；已释放为终态，不允许重新开通。',
    acceptance: '同一资源在租户列表、授权抽屉、云资源管理、导出和日志中状态一致；前台展示标准失败原因，详情和日志保留厂商原始错误。',
  },
  {
    noteId: 'CRA-3.2',
    number: '3.2',
    scene: '全局状态闭环',
    page: '所有危险操作入口',
    module: '权限与状态操作',
    action: '用户点击新增、编辑、失败重试、续期、释放、导出、详情或日志。',
    systemRule: '所有危险动作和数据导出均挂后台权限点；详情和日志按只读权限开放。',
    statusRule: '无权限时按钮置灰并提示无权限；不采用静默隐藏。状态不允许时按钮不展示或置灰，不能绕过前端直接调用后端。',
    acceptance: '云资源列表操作入口与交互标注中的操作限制一致；至少覆盖全权限、只读、无危险操作 3 类测试角色。',
  },
  {
    noteId: 'CRA-3.3',
    number: '3.3',
    scene: '全局状态闭环',
    page: '授权抽屉 / 云资源操作记录',
    module: '操作日志与审计',
    action: '查看开通、失败重试、续期、手动释放、自动释放和导出记录。',
    systemRule: '操作日志按“操作批次 + 资源实例”双层记录，包含操作人、时间、类型、云厂商、授权 ID、实例 ID、防重复提交标识、厂商操作单、成功数、失败数、解绑附带机器人令牌数和失败原因。',
    statusRule: '自动释放操作人为系统用户；失败重试新增一条重试日志，不覆盖原失败日志；释放失败保留失败资源和厂商操作单。',
    acceptance: '抽屉展示最近记录，完整日志走日志入口；部分成功、部分失败、自动释放和失败重试均可追溯。',
  },
  {
    noteId: 'CRA-1.1',
    number: '1.1',
    scene: '新增授权并自动开通',
    page: '租户管理 / 新增授权',
    module: '选择云桌面机器人',
    action: '生态运营选择云桌面机器人，并选择无影云、火山云或天翼云。',
    systemRule: '开通规则：1. 仅分配云桌面机器人后展示云厂商配置；2. 授权数量=云电脑实例数量=附带机器人令牌数量；3. 新增授权提交后，授权保存和云资源开通一起执行；4. 厂商返回终态前保持开通中，不可再次编辑。',
    statusRule: '字段规则：1. 云厂商=无影云、火山云、天翼云，切换时清空旧厂商专属值，切回后恢复默认值；2. 无影云=授权数量、授权时长（保持现有逻辑不变）；3. 火山云=开通类型、共享带宽包、只读开通配置、授权时长、实例规格、镜像、开通数量、云电脑名称；4. 天翼云=授权数量、授权时长、规格、镜像、用户账号、云电脑名称。',
    acceptance: '字段来源：火山云共享带宽包由开通类型派生；授权时长/数量上限取厂商策略；规格取当前厂商规格列表；镜像按规格过滤；天翼云用户账号按租户生成，允许手改；云电脑名称按租户名和厂商序号规则生成，允许手改。',
  },
  {
    noteId: 'CRA-1.2',
    number: '1.2',
    scene: '新增授权并自动开通',
    page: '租户管理 / 新增授权',
    module: '提交自动开通',
    action: '用户点击确定提交授权。',
    systemRule: '授权保存与云资源开通作为同一提交链路一起开始执行；服务端按授权数量生成云电脑任务并调用厂商 OpenAPI。',
    statusRule: '提交后进入开通中，禁止再次编辑；全部成功后授权结果为成功且租户列表不展示状态；部分失败或存在其他授权产品成功时展示部分成功；全部失败且无其他成功产品时展示失败。',
    acceptance: '请求超时不得直接重复创建，应先按请求标识、厂商操作单或资源标识查询最终状态；成功资源不回滚、不重复创建。',
  },
  {
    noteId: 'CRA-1.4',
    number: '1.4',
    scene: '新增授权并自动开通',
    page: '租户管理 / 编辑授权',
    module: '授权产品聚合状态',
    action: '用户查看授权产品聚合状态与云电脑失败详情。',
    systemRule: '租户列表授权产品列只展示授权产品聚合状态，列文案、标签和 Tooltip 均不展示云电脑资源级生命周期状态。',
    statusRule: (
      <>
        状态枚举：
        <Tag color="arcoblue">开通中</Tag>
        <Tag color="orange">部分成功</Tag>
        <Tag color="red">失败</Tag>
        成功不展示 Tag。
      </>
    ),
    acceptance: '租户列表授权产品列及 Tooltip 不得同时展示“部分成功”和“云电脑开通失败”；失败资源的实例 ID、用户绑定状态显示“—”，不得显示用户已绑定；失败原因使用标准失败原因，详情保留厂商原始错误。',
  },
  {
    noteId: 'CRA-1.5',
    number: '1.5',
    scene: '新增授权并自动开通',
    page: '租户管理 / 编辑授权',
    module: '失败重试',
    action: '交付处理厂商侧容量、网络包、规格、镜像或账号问题后点击失败重试。',
    systemRule: '失败重试只重试失败资源，已成功资源不重复调用；开通、续期、释放重试共用资源维度防重复创建规则。',
    statusRule: '重试中禁止重复提交；成功后补齐实例 ID、到期时间和绑定状态；再次失败时保留最新厂商错误，并允许继续重试。',
    acceptance: '必须支持一条授权下成功资源与失败资源并存，租户列表、抽屉、云资源管理、导出和日志结果一致。',
  },
  {
    noteId: 'CRA-1.3',
    number: '1.3',
    scene: '编辑授权与云厂商切换',
    page: '租户管理 / 编辑授权',
    module: '已有资源的厂商限制',
    action: '用户在编辑授权时尝试切换云厂商。',
    systemRule: '编辑已有授权时，云厂商不允许直接切换；存在未释放云资源时禁止保存厂商切换。',
    statusRule: '未释放、释放中、释放失败资源均不允许切换厂商；已释放资源保持终态，不能在旧授权内重新开通。',
    acceptance: '新增授权不触发该判断；如需换厂商或继续使用云电脑，需创建新的授权记录。',
  },
  {
    noteId: 'CRA-1.8',
    number: '1.8',
    scene: '编辑授权与云厂商切换',
    page: '租户管理 / 编辑授权',
    module: '已释放终态',
    action: '用户查看已释放授权或已释放云电脑资源。',
    systemRule: '已释放是云电脑资源终态，旧授权内不提供重新开通入口；已释放云电脑对应的附带机器人令牌也同步解绑。',
    statusRule: '已释放资源只保留状态、详情、日志和导出记录；不再进入开通中或已开通；附带机器人令牌解绑后不可继续使用。',
    acceptance: '如需继续使用云电脑，必须新增授权；全局不出现重新开通按钮、权限点、操作日志类型或 OpenAPI 调用能力；单独“机器人令牌”授权产品额度保持不变。',
  },
  {
    noteId: 'CRA-1.6',
    number: '1.6',
    scene: '续期、7 天释放期与释放',
    page: '租户管理 / 编辑授权',
    module: '续期与 7 天释放期',
    action: '用户在已开通或释放期内续期；系统在授权到期后处理释放期。',
    systemRule: '按北京时间精确到秒计算：授权到期时间下一秒进入 7 天释放期，释放期第 7 天 23:59:59 后自动释放。',
    statusRule: '释放期内允许续期或手动释放；续期中禁止重复提交；续期失败保持原到期/释放期状态，主状态仍显示释放期，并追加续期失败风险标签。',
    acceptance: '前台按授权产品维度发起续期，服务端按云电脑实例逐台调用厂商接口；测试环境需支持释放期结束造数和自动释放任务手动触发。',
  },
  {
    noteId: 'CRA-1.7',
    number: '1.7',
    scene: '续期、7 天释放期与释放',
    page: '租户管理 / 编辑授权',
    module: '手动释放',
    action: '用户在已开通或释放期点击释放，或释放期结束后系统自动释放。',
    systemRule: '手动释放、自动释放、释放重试共用同一释放任务，用 trigger_type 区分 manual / automatic / retry；释放成功的云电脑同步解绑 1:1 附带机器人令牌。',
    statusRule: '点击释放先二次确认；确认后进入释放中；释放成功进入已释放；部分或全部失败进入释放失败，只允许重试失败资源；单独“机器人令牌”授权额度不因云电脑释放回补或扣减。',
    acceptance: '取消二次确认不发起请求；服务端按授权/资源加锁，已有释放中任务时不重复提交；释放失败保留成功/失败数量、厂商操作单、失败原因和已解绑附带机器人令牌数。',
  },
  {
    noteId: 'CRA-1.9',
    number: '1.9',
    scene: '续期、7 天释放期与释放',
    page: '租户管理 / 编辑授权',
    module: '抽屉操作权限与状态限制',
    action: '用户在授权抽屉内点击续期、失败重试或释放。',
    systemRule: '抽屉操作入口按云电脑资源状态展示，并受后台权限点控制。',
    statusRule: '已开通和释放期展示续期、释放；失败状态展示失败重试；已释放不展示危险操作；处理中状态禁止重复提交。',
    acceptance: '抽屉操作入口与交互标注中的操作限制一致；无权限账号不能绕过前端直接发起后端操作。',
  },
  {
    noteId: 'CRA-2.1',
    number: '2.1',
    scene: '云资源管理查询与导出',
    page: '云资源管理',
    module: '厂商总览与列表结构',
    action: '云资源运维切换无影云、火山云、天翼云 Tab 查看资源。',
    systemRule: '列表以取数宝本地资源表为主数据源，按租户父行 + 云桌面子行的级联父子表展示。',
    statusRule: '父行显示租户名称和云桌面数量；子行展示单台云桌面明细、云电脑资源状态、厂商操作单和可操作项。',
    acceptance: '左右固定列表头与表体同步固定；切换云厂商时清空当前筛选条件，避免跨厂商残留查询条件。',
  },
  {
    noteId: 'CRA-2.2',
    number: '2.2',
    scene: '云资源管理查询与导出',
    page: '云资源管理',
    module: 'ToDesk 字段',
    action: '用户按 ToDesk 编号检索云桌面。',
    systemRule: '列表新增 ToDesk 字段，并纳入复合搜索字段；搜索下拉支持选择 ToDesk。',
    statusRule: '选择 ToDesk 后输入编号检索对应云桌面；空值显示“--”。',
    acceptance: '导出文件包含 ToDesk 字段，便于交付和远程连接核对。',
  },
  {
    noteId: 'CRA-2.3',
    number: '2.3',
    scene: '云资源管理查询与导出',
    page: '云资源管理',
    module: '创建时间筛选与刷新同步',
    action: '用户按创建时间筛选，或点击刷新同步厂商状态。',
    systemRule: '创建时间按云桌面创建时间过滤；刷新只触发云厂商状态同步，不承担自动释放调度。',
    statusRule: '同步成功后更新本地状态；同步失败时保留本地旧状态并提示，不覆盖已有成功/失败记录。',
    acceptance: '清空日期后恢复当前厂商全部数据；刷新不清空筛选和分页；测试环境需支持强制同步失败。',
  },
  {
    noteId: 'CRA-2.4',
    number: '2.4',
    scene: '云资源管理查询与导出',
    page: '云资源管理',
    module: '导出',
    action: '用户按当前云厂商和筛选条件导出资源清单。',
    systemRule: '导出取数宝本地资源表明细；字段包含租户、授权提交结果、云桌面 ID、机器人口令、ToDesk、创建/到期时间、云电脑资源状态、厂商操作单和失败原因。',
    statusRule: '无数据时提示“暂无可导出数据”，不生成空文件；授权提交结果和云电脑资源状态均导出中文值，空值统一显示“--”。',
    acceptance: '文件名包含云厂商和导出时间；导出结果必须与当前列表筛选条件一致。',
  },
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
  const diagramIdRef = useRef(`cloud-resource-flow-${diagramId}-${Math.random().toString(36).slice(2)}`);
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

export default function CloudResourceAutomationPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>
        云资源自动化开通
      </Typography.Title>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={changeRows} /></Section>
          <Section title="文档说明"><PrdTable className={styles.table} rows={termRows} /></Section>
          <Section title="需求背景">
            <p className={styles.paragraph}>
              当前无影云、火山云、天翼云的开通与维护依赖人工在厂商后台操作，租户授权、云电脑资源状态和失败处理分散在不同系统里，导致开通结果不透明、失败恢复依赖人工跟进、续期和释放缺少统一闭环。
            </p>
          </Section>
          <Section title="目标">
            <p className={styles.paragraph}>
              将云资源开通、状态同步、失败重试、续期、释放期和释放接入租户授权流程，使交付和运营能在智能门户后台完成云资源生命周期处理，把人工处理占比由约 80% 降低至 20%。
            </p>
          </Section>
          <Section title="用户故事">
            <PrdTable className={styles.table} rows={[
              ['角色', '场景', '期望结果'],
              ...storyRows,
            ]} />
          </Section>
          <Section title="需求范围">
            <div className={styles.sectionStack}>
              <PrdTable className={`${styles.table} ${styles.scopeTable}`} rows={scopeRows} />
            </div>
          </Section>
        </div>

        <div className={styles.panel}>
          <Section title="关键流程图">
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
          </Section>

          <Section title="统一规则附录">
            <div className={styles.sectionStack}>
              <div>
                <h4 className={styles.subTitle}>云厂商 OpenAPI 对接矩阵</h4>
                <PrdTable className={styles.table} rows={providerRows} />
              </div>
              <div>
                <h4 className={styles.subTitle}>标准失败原因枚举</h4>
                <PrdTable className={styles.table} rows={errorReasonRows} />
              </div>
              <div>
                <h4 className={styles.subTitle}>权限点与无权限表现</h4>
                <PrdTable className={styles.table} rows={permissionRows} />
              </div>
              <div>
                <h4 className={styles.subTitle}>操作日志契约</h4>
                <PrdTable className={styles.table} rows={operationLogRows} />
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
