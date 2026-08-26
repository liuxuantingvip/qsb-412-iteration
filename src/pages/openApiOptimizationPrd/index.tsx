import type { ReactNode } from 'react';
import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const versionRows = [
  ['版本号', '创建日期'],
  ['V1.3', '2026/08/20'],
];

const changeRows = [
  ['时间', '版本号', '变更人', '主要变更内容'],
  ['2026/08/20', 'V1.3', '森森', '个人中心菜单统一使用 16×16 Streamline 面性图标；账号名称与账号支持原位编辑，修改密码移至头像行；存储区使用真实品牌 Logo，数据库标记为推荐'],
  ['2026/08/20', 'V1.2', '森森', '个人中心将账号资料、安全设置与存储管理合并到账号设置页，移除独立存储管理菜单'],
  ['2026/07/15', 'V1.1', '森森', '收敛为单 API Key 接入模型，移除独立能力配置和状态字段'],
];

const documentRows = [
  ['术语', '说明'],
  ['Agent API', '面向 Codex、Claude 等外部 AI 原生应用的稳定 OpenAPI 产品面。'],
  ['API Key', '外部 agent 调用取数宝 OpenAPI 的唯一凭证，可在个人中心自助生成和复制。'],
  ['ClientToken', '写接口幂等标识，用于重复提交时返回同一业务结果。'],
  ['requestId', '每次调用返回的排查标识，用于调用日志和失败定位。'],
  ['机器可读文档', '不是只给人看的接口说明，而是可被 AI、SDK 生成器、schema lint 和契约测试直接解析的 OpenAPI YAML/JSON。'],
];

const objectiveRows = [
  ['验收指标', '口径'],
  ['用户在取数宝前台可自助生成 API Key', '入口在开放平台 / API Keys；创建只填写名称，创建成功后在列表中密文展示并可复制完整 Key。'],
  ['100 次核心链路调用成功率 ≥98%', '使用 OpenAPI 从查数据源到查结果和重试完整跑 100 次，成功率不低于 98%。'],
  ['OpenAPI 同步接口平均响应耗时 ≤500ms', '统计网关鉴权、参数校验和业务受理响应耗时；P95 不高于 1s。创建、执行、重试等异步接口只统计受理响应，不统计任务实际采集、清洗、入库耗时。'],
  ['OpenAPI 覆盖前台核心取数链路 99%', '覆盖店铺、数据源、业务参数、任务、执行记录、重试、数据交付；不含后台授权、云桌面、商业化订单、测算、需求提交。'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['AI 应用开发者', 'Codex / Claude 需要代替用户稳定完成取数宝核心操作。', '拿到 API Key 后即可按签名规范调用创建任务、执行、查询结果和重试。'],
  ['租户管理员', '需要控制哪些账号能创建和管理 API Key。', 'API Key 按账号既有租户角色判断可调用能力，不在 Key 上单独配置能力。'],
  ['实施/运营', '需要排查 AI 应用调用失败原因。', '能用 requestId 查看调用日志、错误码和建议恢复动作。'],
];

function ScopeItem({
  children,
  status,
}: {
  children: ReactNode;
  status: '已有' | '需补' | '待确认';
}) {
  const statusClass = {
    已有: styles.scopeStatusExisting,
    需补: styles.scopeStatusMissing,
    待确认: styles.scopeStatusPending,
  }[status];

  return (
    <li>
      {children}
      <span className={`${styles.scopeStatus} ${statusClass}`}>{status}</span>
    </li>
  );
}

const coreApiScope = (
  <ol className={styles.scopeList}>
    <li>
      <strong>店铺管理</strong>
      <ol>
        <ScopeItem status="已有">店铺列表（帮助文档：查询所有的店铺信息）</ScopeItem>
        <ScopeItem status="需补">店铺详情</ScopeItem>
        <ScopeItem status="已有">店铺新增（帮助文档：新增店铺）</ScopeItem>
        <ScopeItem status="需补">店铺编辑</ScopeItem>
        <ScopeItem status="需补">店铺删除</ScopeItem>
        <ScopeItem status="需补">店铺校验</ScopeItem>
        <ScopeItem status="需补">店铺导入</ScopeItem>
        <ScopeItem status="需补">店铺导出</ScopeItem>
        <ScopeItem status="需补">店铺字段配置</ScopeItem>
        <ScopeItem status="需补">店铺分组</ScopeItem>
      </ol>
    </li>
    <li>
      <strong>数据源管理</strong>
      <ol>
        <ScopeItem status="已有">数据源列表（帮助文档：数据源信息分页查询）</ScopeItem>
        <ScopeItem status="需补">数据源详情</ScopeItem>
        <ScopeItem status="待确认">数据源参数配置</ScopeItem>
        <ScopeItem status="待确认">可用数据源查询</ScopeItem>
      </ol>
    </li>
    <li>
      <strong>业务参数管理</strong>
      <ol>
        <ScopeItem status="需补">业务参数列表</ScopeItem>
        <ScopeItem status="需补">业务参数新增</ScopeItem>
        <ScopeItem status="需补">业务参数编辑</ScopeItem>
        <ScopeItem status="需补">业务参数删除</ScopeItem>
        <ScopeItem status="需补">业务参数导入</ScopeItem>
        <ScopeItem status="需补">业务参数导出</ScopeItem>
        <ScopeItem status="需补">业务参数可选项查询（供任务创建/编辑时选择业务参数）</ScopeItem>
      </ol>
    </li>
    <li>
      <strong>任务管理</strong>
      <ol>
        <ScopeItem status="需补">任务列表</ScopeItem>
        <ScopeItem status="已有">任务详情（帮助文档：任务详情）</ScopeItem>
        <ScopeItem status="已有">任务创建（帮助文档：创建任务接口）</ScopeItem>
        <ScopeItem status="需补">任务编辑</ScopeItem>
        <ScopeItem status="待确认">任务执行</ScopeItem>
        <ScopeItem status="需补">任务批量执行</ScopeItem>
        <ScopeItem status="需补">任务删除</ScopeItem>
        <ScopeItem status="需补">任务批量删除</ScopeItem>
        <ScopeItem status="需补">任务启停</ScopeItem>
        <ScopeItem status="需补">任务停止</ScopeItem>
        <ScopeItem status="需补">任务关联数据源配置（查看/修改任务使用的数据源）</ScopeItem>
      </ol>
    </li>
    <li>
      <strong>执行记录</strong>
      <ol>
        <ScopeItem status="已有">执行记录列表（帮助文档：任务运行记录列表）</ScopeItem>
        <ScopeItem status="需补">执行记录详情</ScopeItem>
        <ScopeItem status="需补">执行日志</ScopeItem>
        <ScopeItem status="待确认">执行结果</ScopeItem>
        <ScopeItem status="待确认">结果文件</ScopeItem>
      </ol>
    </li>
    <li>
      <strong>重试</strong>
      <ol>
        <ScopeItem status="需补">取数重试</ScopeItem>
        <ScopeItem status="需补">批量重试</ScopeItem>
        <ScopeItem status="需补">入库重试</ScopeItem>
      </ol>
    </li>
    <li>
      <strong>数据交付</strong>
      <ol>
        <ScopeItem status="需补">数据映射</ScopeItem>
        <ScopeItem status="需补">数据清洗</ScopeItem>
        <ScopeItem status="需补">数据校验</ScopeItem>
        <ScopeItem status="需补">数据预览</ScopeItem>
        <ScopeItem status="需补">入库状态</ScopeItem>
        <ScopeItem status="需补">数据监控</ScopeItem>
      </ol>
    </li>
  </ol>
);

const machineReadableDocScope = (
  <ol className={styles.scopeList}>
    <li>
      <strong>可直接被工具解析</strong>
      <ol>
        <li>交付 OpenAPI YAML/JSON 文件，Apifox / Swagger / SDK 生成器可直接导入。</li>
        <li>每个接口具备稳定的 path、method、operationId、tags、summary。</li>
        <li>文档内不出现内部 auth_token、异常 header 名、JSON 注释或不合法示例。</li>
      </ol>
    </li>
    <li>
      <strong>请求和响应结构完整</strong>
      <ol>
        <li>请求参数、Header、Query、Body 均写清字段类型、必填、条件必填、nullable、format、长度和枚举。</li>
        <li>响应体统一包含 code、message、requestId、data、error，并定义成功和失败 schema。</li>
        <li>异步接口明确 status 枚举和状态流转：PENDING / RUNNING / SUCCESS / FAILED / CANCELED / TIMEOUT。</li>
      </ol>
    </li>
    <li>
      <strong>AI 可按示例完成调用</strong>
      <ol>
        <li>提供完整链路示例：查数据源、查店铺、创建任务、执行、查记录、查结果、重试。</li>
        <li>每个接口至少提供成功、参数错误、鉴权失败、限流、业务失败示例。</li>
        <li>写接口示例必须包含 ClientToken，失败示例必须说明是否可重试和建议等待时间。</li>
      </ol>
    </li>
    <li>
      <strong>可自动验收</strong>
      <ol>
        <li>schema lint 通过，无语法错误和缺失引用。</li>
        <li>TypeScript / Python SDK 生成通过。</li>
        <li>使用文档生成的 SDK 能跑通 100 次核心链路契约测试。</li>
      </ol>
    </li>
  </ol>
);

const requirementRows = [
  ['功能模块', '新增或优化', '功能点', '端', '产品线', '优先级'],
  ['账号设置', '优化', '个人中心菜单图标统一为 16×16 Streamline Core Flat；账号卡取消独立标题栏，姓名与账号支持头像行原位编辑，修改密码固定在同一行；存储区展示数据库面性图标、钉钉与飞书真实品牌 Logo，并为数据库增加推荐标识', '前台 PC', '取数宝', 'P0'],
  ['API Keys', '新增', '创建、密文展示、复制、删除、调用日志、失败原因、最近调用时间；不单独配置能力', '前台 PC', '取数宝', 'P0'],
  ['鉴权网关', '优化', '统一 API Key / Timestamp / Nonce / Signature，移除内部 auth_token，稳定 Nonce 去重、时间窗口、签名失败错误码和 requestId', 'OpenAPI', '取数宝', 'P0'],
  ['前台核心 API', '优化', <div><p className={styles.scopeNote}>基于 2026/07/14 抓取的 OpenAPI 帮助文档对比：明确命中文档的标为“已有”，未在文档中独立覆盖的标为“需补”，可能被现有接口顺带返回但能力边界不清的标为“待确认”。</p>{coreApiScope}</div>, 'OpenAPI', '取数宝', 'P0'],
  ['幂等与异步状态机', '新增', '所有写接口支持 ClientToken，创建/执行/重试返回 PENDING/RUNNING/SUCCESS/FAILED/CANCELED/TIMEOUT', 'OpenAPI', '取数宝', 'P0'],
  ['错误码体系', '新增', '给 AI 可恢复错误码，并标注是否可重试、建议等待多久、用户需补充什么信息', 'OpenAPI', '取数宝', 'P0'],
  ['稳定性与限流', '新增', '租户级并发上限、任务排队、结果缓存、429 Retry-After、超时后可用 ClientToken 查询最终结果', 'OpenAPI', '取数宝', 'P0'],
  ['机器可读文档', '优化', machineReadableDocScope, 'OpenAPI', '取数宝', 'P0'],
  ['自动化验收', '新增', '鉴权、Nonce、100 次链路压测、幂等、失败重试、结果轮询、schema lint、SDK 生成测试', '测试平台', '取数宝', 'P0'],
];

const scenarioRows = [
  ['标注', '模块', '页面/事项', '规则', '边界/限制', '状态'],
  [
    <strong data-note-id="OAI-1.1">1.1</strong>,
    'API Key 列表',
    '开放平台 / API Keys',
    '只展示名称、API Key、创建人、创建时间、最近调用、失败原因、操作。',
    '不展示独立能力配置和状态字段；API Key 密文展示，复制图标常驻。',
    '第一列和操作列固定；长文本单行省略并通过 Tooltip 展示完整值。',
  ],
  [
    <strong data-note-id="OAI-1.2">1.2</strong>,
    '新建 API Key',
    'API Keys > 新建密钥',
    '只填写名称，创建成功后立即在列表顶部生成一条可复制的 Key。',
    '名称为空不允许创建；创建后不弹二次结果窗。',
    '创建成功关闭弹窗并刷新列表；失败停留在弹窗内。',
  ],
  [
    <strong data-note-id="OAI-1.3">1.3</strong>,
    '日志与删除',
    'API Keys > 操作',
    '日志打开当前 Key 的调用日志；删除立即废止该 Key。',
    '调用日志只保留近 1 年记录；删除前必须二次确认；删除不影响保留期内的历史日志排查。',
    '删除成功后列表移除该 Key；取消删除保持原列表。',
  ],
  [
    '全链路',
    '核心调用链路',
    '外部 agent 调用 OpenAPI',
    '查数据源、查店铺、创建任务、执行、查记录、查结果、重试必须可串成一条完整链路。',
    '所有写接口必须支持 ClientToken；重复请求不能重复创建业务对象。',
    '异步状态固定为 PENDING / RUNNING / SUCCESS / FAILED / CANCELED / TIMEOUT。',
  ],
  [
    '错误恢复',
    '错误码体系',
    'OpenAPI 响应',
    '错误码需告诉 AI 是否可重试、建议等待多久、用户需要补什么信息。',
    '覆盖 AUTH_FAILED、PERMISSION_DENIED、RATE_LIMITED、INVALID_PARAM、RESOURCE_NOT_FOUND、DUPLICATE_REQUEST、JOB_RUNNING、CONNECTOR_UNAVAILABLE、STORE_LOGIN_FAILED、RESULT_NOT_READY、UPSTREAM_TIMEOUT。',
    '所有失败响应返回 requestId。',
  ],
];

const operationRows = [
  ['步骤', '用户操作', '系统响应'],
  ['1', '用户进入开放平台 / API Keys。', '展示 API Key 列表、最近调用、失败原因和操作入口。'],
  ['2', '点击新建密钥并填写名称。', '校验名称后生成 API Key，插入列表顶部，并允许复制完整 Key。'],
  ['3', 'AI 应用携带 API Key 按签名规范调用核心链路。', '网关校验签名、Nonce、时间窗口，返回 requestId。'],
  ['4', 'AI 应用提交写接口。', '系统按 ClientToken 幂等处理，返回业务结果或异步状态。'],
  ['5', 'AI 应用轮询任务和结果状态。', '系统返回固定状态枚举、结果文件、错误码和恢复建议。'],
  ['6', '发生泄露或异常调用。', '管理员删除 Key，并通过调用日志定位 requestId 和失败原因。'],
];

const nonFunctionalRows = [
  ['类型', '详细说明'],
  ['安全', 'API Key 密文展示，复制完整值；删除后不可继续调用。'],
  ['稳定性', '100 次核心链路调用成功率 ≥98%；写接口支持幂等；限流返回 Retry-After。'],
  ['可观测性', '所有响应返回 requestId；调用日志保留近 1 年；保留失败原因、最近调用时间。'],
  ['文档质量', 'OpenAPI 3.0/3.1 schema 干净，不出现 JSON 注释；枚举、必填、条件必填、nullable、格式和失败示例必须结构化。'],
];

const trackingRows = [
  ['事件', '触发时机', '关键属性'],
  ['openapi_key_create', '创建 API Key 成功', 'tenantId、apiKey、operator、createdAt'],
  ['openapi_key_delete', '删除 API Key', 'tenantId、apiKey、operator、deletedAt'],
  ['openapi_call_failed', 'OpenAPI 调用失败', 'apiKey、apiName、errorCode、requestId、retryable'],
  ['openapi_contract_test_run', '契约测试执行完成', 'passCount、failCount、successRate、schemaLintResult、sdkGenerateResult'],
];

const excludedRows = [
  ['事项', '说明'],
  ['后台授权', '不含后台授权管理。'],
  ['云桌面', '不含云桌面开通、续期、释放、改 IP。'],
  ['商业化订单', '不含订单、支付、开票、商业化自助购买。'],
  ['测算与需求提交', '不含测算、采购单、需求提交流程。'],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function OpenApiOptimizationPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>
        优化 OPENAPI
      </Typography.Title>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={versionRows} /></Section>
          <Section title="变更日志"><PrdTable className={styles.table} rows={changeRows} /></Section>
          <Section title="文档说明"><PrdTable className={styles.table} rows={documentRows} /></Section>
          <Section title="需求背景">
            <p className={styles.paragraph}>
              为支持 Codex / Claude 这类 AI 原生应用稳定调用取数宝，需要建设面向外部 agent 的 OpenAPI 产品面，而不是把现有前端接口简单包一层开放出去。
            </p>
          </Section>
          <Section title="目标">
            <PrdTable className={styles.table} rows={objectiveRows} />
          </Section>
          <Section title="用户故事"><PrdTable className={styles.table} rows={storyRows} /></Section>
          <Section title="需求范围"><PrdTable className={styles.table} rows={requirementRows} /></Section>
        </div>

        <div className={styles.panel}>
          <Section title="用户场景与交互说明">
            <PrdTable className={`${styles.table} ${styles.scenarioTable}`} rows={scenarioRows} />
          </Section>
          <Section title="用户操作流程"><PrdTable className={styles.table} rows={operationRows} /></Section>
          <Section title="非功能需求"><PrdTable className={styles.table} rows={nonFunctionalRows} /></Section>
          <Section title="埋点"><PrdTable className={styles.table} rows={trackingRows} /></Section>
          <Section title="本期不做"><PrdTable className={styles.table} rows={excludedRows} /></Section>
        </div>
      </div>
    </div>
  );
}
