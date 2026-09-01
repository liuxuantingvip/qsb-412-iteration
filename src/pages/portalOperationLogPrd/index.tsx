import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const versionRows = [
  ['版本号', '创建日期', '变更内容'],
  ['V1.0', '2026/09/01', '新增个人中心操作日志的评审 PRD。'],
];

const scopeRows = [
  ['模块', '功能点', '说明'],
  ['个人中心 / 操作日志', '三 Tab', '门户操作、API、MCP 共享查询、列表、详情与导出框架；API、MCP 增加凭证名称。'],
  ['操作日志', '查询与详情', '支持时间范围、操作者、功能模块、操作类型筛选；列表和详情展示操作内容、操作结果及必要的脱敏信息。'],
  ['操作日志', '导出', '租户管理员按当前 Tab、时间范围及筛选条件导出本租户日志；导出行为自身纳入门户操作记录。'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['租户管理员', '成员误操作、业务执行失败或关键配置变更后需要追溯。', '在个人中心查看本租户的门户操作、API 与 MCP 日志，定位操作者、结果和变更内容。'],
  ['租户管理员', '需要复核成员凭证发起的 API、MCP 调用。', '查看调用对应成员与凭证名称快照，不暴露 Token、API Key 等敏感值。'],
  ['租户管理员', '需要留存当前查询范围的审计记录。', '导出仅包含当前租户、当前 Tab、时间范围和筛选条件下的脱敏日志。'],
];

const flowRows = [
  ['步骤', '服务端应提供 / 原型 mock 展示'],
  ['1. 发起操作', '门户成员发起实际到达服务端的业务动作；API、MCP 调用通过可归属成员的凭证发起。原型 mock 展示三类来源。'],
  ['2. 校验与执行', '服务端应完成身份、租户及凭证校验，并执行对应业务请求；前端不得以传入的其他租户作为查询依据。'],
  ['3. 生成记录', '服务端应依据实际结果记录成功或失败；编辑类仅保存实际变化字段，变更前后值按脱敏规则展示。日志写入不阻断原业务。'],
  ['4. 查询与导出', '服务端应基于当前登录租户限定查询和导出范围。原型 mock 展示默认近 7 天、列表、详情与导出反馈。'],
];

const permissionRows = [
  ['规则', '说明'],
  ['可见范围', '仅租户管理员可见“个人中心 / 操作日志”；普通租户成员不展示入口，服务端应拒绝其接口访问。'],
  ['租户隔离', '租户管理员仅能查询、查看和导出本租户日志；查询、详情和导出均不得跨租户。'],
  ['历史快照', '成员被删除或凭证被撤销后，服务端应保留操作发生时的成员名称、成员标识、凭证名称和凭证标识快照。'],
  ['不可变更', '日志不可编辑、不可手动删除；用户不能调整保留周期。'],
];

const fieldRows = [
  ['字段', '展示与口径'],
  ['来源 Tab', '门户操作、API、MCP；系统自动行为不展示。'],
  ['操作时间、操作者、功能模块、操作类型、IP 地址', '列表展示，默认按操作时间倒序；服务端应提供本租户可见数据。'],
  ['操作类型', '新增、修改、删除、启用、停用、执行、重试、导入、导出、授权、其他；作为门户操作、API、MCP 三类来源统一分类口径。'],
  ['操作内容、操作结果', '列表展示；操作结果仅为成功或失败并使用状态标签区分。操作内容和操作结果不作为筛选条件。'],
  ['凭证名称', '仅 API、MCP 展示，使用凭证名称快照。'],
  ['失败原因、变更前后值、请求信息', '详情展示失败原因、实际变化字段及脱敏后的变更前后值；敏感请求信息不展示完整值。'],
  ['敏感信息', '手机号等个人信息按既有安全规则脱敏；Token、API Key、密码、Cookie、密钥和完整敏感参数不得写入或展示。'],
];

const queryRows = [
  ['事项', '规则'],
  ['筛选条件', '三个 Tab 支持时间范围、操作者、功能模块、操作类型；API、MCP 额外支持凭证名称。'],
  ['默认与上限', '默认查询近 7 天；单次查询时间跨度最长 90 天，超出时阻止查询并提示缩短时间范围。'],
  ['保留期限', '服务端应保留 180 天日志，到期由系统自动清理；原型 mock 展示该规则。'],
  ['记录范围', '门户仅记录成员主动发起且实际请求到达服务端的业务操作；门户不记录浏览行为，包括进入页面、查看详情、搜索、筛选和切换 Tab。'],
  ['成功与失败', '门户、API、MCP 的成功和失败均应记录；用户取消、仅前端校验且未发请求、字段未实际变化不生成记录。'],
  ['自动行为', '系统定时任务、自动重试、自动推送等无法归属成员或其凭证的系统自动行为不展示。'],
];

const exceptionRows = [
  ['场景', '反馈与恢复'],
  ['查询失败', '查询接口失败时页面应展示失败状态和“重新加载”；当前原型 mock 不模拟该状态。服务端应提供可读错误信息，页面不展示旧数据或虚构内容。'],
  ['无数据', '按当前 Tab 和筛选条件展示对应空状态。'],
  ['详情缺失', '显示“详情暂不可用”，不影响继续查看列表。'],
  ['导出失败', '展示可读失败原因并允许重试；发起导出本身及其成功、失败均应记录为门户操作。'],
  ['日志写入失败', '服务端日志写入失败时应告警并进入补偿，不得改变原业务操作结果或向用户返回原业务失败；当前原型 mock 不模拟补偿。'],
  ['无权限或租户失效', '禁止展示日志并给出明确权限提示；服务端应拒绝越权访问。'],
];

const outOfScopeRows = [
  ['事项', '说明'],
  ['普通成员入口', '不向普通租户成员开放操作日志。'],
  ['日志管理', '不支持编辑、删除或调整日志保留周期。'],
  ['记录扩展', '不记录门户浏览行为，不展示系统自动任务日志。'],
  ['筛选扩展', '不新增操作内容、操作结果筛选。'],
  ['跨租户能力', '不提供跨租户查询或导出。'],
];

const acceptanceRows = [
  ['验收点', '验收标准'],
  ['权限与隔离', '仅租户管理员可见入口；页面、接口和导出均无法获取其他租户日志。'],
  ['三 Tab 与字段', '门户操作、API、MCP 分 Tab 展示；API、MCP 包含凭证名称，列表、详情和脱敏字段符合字段说明。'],
  ['记录口径', '门户关键业务操作与 API、MCP 调用的成功、失败均记录；浏览行为和系统自动行为不生成本页面日志。'],
  ['变更与安全', '编辑类可查看脱敏后的实际变更前后值；Token、API Key、密码、Cookie、密钥和完整敏感参数不泄露。'],
  ['查询与留存', '默认近 7 天，单次最长 90 天，日志保留 180 天且用户不可删除。'],
  ['查询失败反馈', '查询接口失败时页面应展示失败状态和“重新加载”；当前原型 mock 不模拟该状态。'],
  ['日志写入保护', '服务端日志写入失败时应告警并进入补偿，不得改变原业务操作结果或向用户返回原业务失败；当前原型 mock 不模拟补偿。'],
  ['导出与异常', '导出范围与当前 Tab、时间范围和筛选条件一致；详情缺失、导出失败均有明确反馈及恢复入口。'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function PortalOperationLogPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>门户操作日志</Typography.Title>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={versionRows} /></Section>
          <Section title="背景">
            <p className={styles.paragraph}>
              租户管理员缺少统一入口，无法追溯本租户成员在取数宝门户以及通过 API、MCP 发起的关键业务操作。本需求在个人中心新增操作日志，帮助定位误操作、调用失败和关键配置变更，并以租户隔离和敏感信息保护为前提。
            </p>
          </Section>
          <Section title="目标">
            <p className={styles.paragraph}>
              在不记录浏览行为、不展示系统自动行为的边界下，让租户管理员按来源追溯成员或成员凭证实际触发的业务操作，查看成功或失败结果、脱敏后的变更内容，并按当前查询范围导出自身租户记录。
            </p>
          </Section>
          <Section title="需求范围"><PrdTable className={styles.table} rows={scopeRows} /></Section>
          <Section title="用户故事"><PrdTable className={styles.table} rows={storyRows} /></Section>
          <Section title="核心流程"><PrdTable className={styles.table} rows={flowRows} /></Section>
        </div>

        <div className={styles.panel}>
          <Section title="权限与租户隔离"><PrdTable className={styles.table} rows={permissionRows} /></Section>
          <Section title="字段说明"><PrdTable className={styles.table} rows={fieldRows} /></Section>
          <Section title="保留与查询规则"><PrdTable className={styles.table} rows={queryRows} /></Section>
          <Section title="异常处理"><PrdTable className={styles.table} rows={exceptionRows} /></Section>
          <Section title="本期不做"><PrdTable className={styles.table} rows={outOfScopeRows} /></Section>
          <Section title="验收清单"><PrdTable className={styles.table} rows={acceptanceRows} /></Section>
        </div>
      </div>
    </div>
  );
}
