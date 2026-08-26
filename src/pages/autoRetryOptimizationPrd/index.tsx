import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const versionRows = [
  ['版本号', '创建日期'],
  ['V3.2', '2026/07/30'],
];

const changeRows = [
  ['时间', '版本号', '变更人', '主要变更内容'],
  ['2026/07/30', 'V3.2', '森森', '调整为运维修复事件驱动；删除用户触发条件、最大重试次数和重试间隔。'],
  ['2026/07/29', 'V3.1', '森森', '重试触发条件新增店铺权限异常，并纳入计划级自动重试规则。'],
  ['2026/07/24', 'V3.0', '森森', '重试策略调整为计划级配置；明确平台未出数、平台改版和入库失败三类触发条件，并补齐执行时段、云资源和排队规则。'],
];

const termRows = [
  ['术语/缩略词', '说明'],
  ['重试策略', '用户允许系统在运维平台确认异常已修复后，按计划配置自动重新执行一次。'],
  ['修复事件', '运维平台对某个异常工单确认已修复并回传的事件；是生成自动重试任务的唯一触发来源。'],
  ['重试执行单元', '店铺 × 连接器 × 数据周期；成功单元不重复执行。'],
  ['修复版本', '同一工单每次确认修复的唯一版本，用于识别一次新的可重试机会。'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['计划配置人员', '希望异常修复后自动恢复计划，又不影响正常任务。', '只需开启重试策略并配置执行时段和机器人。'],
  ['运维人员', '修复平台侧或 RPA 侧异常并确认上线。', '在运维工单点击已修复后，受影响计划按配置进入一次重试。'],
];

const scopeRows = [
  ['功能模块', '新增或优化', '功能点', '端', '产品线', '优先级'],
  ['新建/编辑计划', '优化', '计划级重试策略仅配置开关、执行时段和执行机器人', 'PC端', '电商取数宝', 'P0'],
  ['运维平台联动', '新增', '计划异常上报工单；接收修复完成事件并生成一次待重试任务', '服务端', '电商取数宝', 'P0'],
  ['重试调度', '新增', '遵守重试时段、正常计划优先、资源忙排队且不抢占', '服务端', '电商取数宝', 'P0'],
];

const scenarioRows = [
  ['编号', '模块', '页面/事项', '规则', '例外', '状态', '验收口径'],
  ['1.1', '计划管理', '重试列表字段', '只展示未开启或已开启，支持按开启状态筛选。', '历史计划默认关闭。', '不展示触发条件数量。', '列表、筛选、编辑和详情一致。'],
  ['2.1', '新建/编辑计划', '重试总开关', '用户只决定是否允许运维修复后自动重试；开关下方始终展示功能说明。', '关闭不改写历史记录，也不响应后续修复事件。', '新建默认关闭，功能说明始终可见。', '开关可保存并回显，开启和关闭时提示文案一致。'],
  ['2.2', '新建/编辑计划', '重试时段与云资源', '重试只在配置时段内排队；支持使用计划执行机器人或指定机器人。', '正常计划优先；资源忙等待，窗口结束顺延。', '指定机器人时必选可用机器人。', '字段显隐、校验、保存和回显正确。'],
  ['2.3', '运维平台联动', '修复事件触发', '运维工单确认已修复后，系统校验受影响计划与重试开关，为每个计划生成一次待重试任务。', '计划关闭、删除或重试开关关闭时不生成。', '回调先进入待重试，不立即抢占机器。', '一次修复事件只产生一次重试。'],
  ['3.1', '计划详情', '重试详情', '只读展示开启状态、执行时段和执行机器人。', '未开启时不展示空字段。', '展示当前计划配置。', '与编辑回显一致。'],
  ['4.1', '计划生命周期', '复制/关闭/删除', '复制同步配置；关闭停止新增重试；删除前处理在途任务。', '历史记录和工单关联保留。', '指定机器人重新校验。', '生命周期影响范围可验收。'],
];

const flowRows = [
  ['步骤', '触发条件/动作', '系统结果'],
  ['1', '用户在计划高级设置中开启重试并配置执行时段、机器人。', '配置作为计划属性保存；未开启时不允许自动重试。'],
  ['2', '计划执行异常。', '取数宝上报运维平台并关联原始运行记录、计划和受影响执行单元。'],
  ['3', '运维人员修复异常并在工单中点击已修复。', '运维平台回传工单、修复版本和受影响范围。'],
  ['4', '取数宝收到修复事件。', '校验计划有效且开关开启；按工单＋修复版本＋计划幂等生成一次待重试任务。'],
  ['5', '任务到达重试执行时段。', '正常计划优先；资源空闲后使用计划机器人或指定机器人执行。'],
  ['6A', '重试成功。', '按普通计划运行记录展示本次执行结果，并结束本次异常闭环。'],
  ['6B', '重试仍失败。', '重新上报运维平台并等待下一次修复事件，不立即连续重跑。'],
];

const nonFunctionalRows = [
  ['事项', '要求'],
  ['幂等', '同一运维工单、修复版本和计划不得生成重复重试任务。'],
  ['调度', '正常计划优先；重试任务不得抢占运行中资源。'],
  ['后台审计', '后台保存运维工单、修复版本、重试配置快照和状态流转时间，不增加客户侧运行记录字段。'],
  ['迁移', '历史计划统一默认关闭；不从旧触发条件、次数或间隔推导开启状态。'],
];

const trackingRows = [
  ['事件', '触发时机', '属性'],
  ['recovery_strategy_saved', '计划保存重试配置', 'plan_id、enabled、time_range、resource_mode、robot_id'],
  ['repair_event_received', '收到运维修复事件', 'work_order_id、repair_version、plan_id、accepted、reject_reason'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function AutoRetryOptimizationPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>
        重试策略
      </Typography.Title>
      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={versionRows} /></Section>
          <Section title="变更日志"><PrdTable className={styles.table} rows={changeRows} /></Section>
          <Section title="文档说明"><PrdTable className={styles.table} rows={termRows} /></Section>
          <Section title="需求背景">
            <p className={styles.paragraph}>计划异常需要先由取数宝上报运维平台，由运维人员定位并完成修复。异常类型和是否具备重试条件由系统与运维流程判断，不应由用户逐项配置。</p>
          </Section>
          <Section title="目标">
            <p className={styles.paragraph}>用户只需决定是否允许自动重试，并配置可占用机器的执行时段和机器人；运维平台确认修复后，系统安全、幂等地执行一次计划重试。</p>
          </Section>
          <Section title="用户故事"><PrdTable className={styles.table} rows={storyRows} /></Section>
          <Section title="需求范围"><PrdTable className={styles.table} rows={scopeRows} /></Section>
          <Section title="用户场景与交互说明"><PrdTable className={`${styles.table} ${styles.sceneTable}`} rows={scenarioRows} /></Section>
          <Section title="用户操作流程"><PrdTable className={styles.table} rows={flowRows} /></Section>
          <Section title="非功能需求"><PrdTable className={styles.table} rows={nonFunctionalRows} /></Section>
          <Section title="埋点"><PrdTable className={styles.table} rows={trackingRows} /></Section>
        </div>
      </div>
    </div>
  );
}
