import { Typography } from '@arco-design/web-react';
import PrdTable from '@/components/prd/PrdTable';
import styles from './index.module.less';

const changeRows = [
  ['版本号', '创建日期', '变更人', '变更内容'],
  ['V1.0', '2026/07/22', '森森', '创建消息盒子与公告管理需求'],
];

const scopeRows = [
  ['模块', '功能点', '端', '优先级', '说明'],
  ['消息盒子', '取数消息', '前台', 'P0', '按计划实际产生的运行详情任务生成消息，支持展开详情和跳转运行详情。'],
  ['消息盒子', '公告消息', '前台', 'P0', '展示后台已发布公告，支持默认展开和可配置跳转按钮。'],
  ['公告管理', '公告列表', '后台', 'P0', '管理公告草稿、发布、下线、阅读情况和跳转配置。'],
  ['公告管理', '新建/编辑公告', '后台', 'P0', '只保存草稿，发布动作在列表完成。'],
];

const storyRows = [
  ['角色', '场景', '期望结果'],
  ['运营/实施/客服', '计划运行后需要快速知道当天哪些任务成功、失败、超时或仍在运行。', '在消息盒子中看到取数消息，展开后能看到数据表、店铺、计划名称和失败原因。'],
  ['运营/实施/客服', '发现取数失败后需要继续处理。', '点击查看运行详情后，直接进入对应计划的运行详情，消息同步变为已读。'],
  ['运营', '需要给用户发布维护、运营或平台公告。', '在后台公告管理新建草稿，保存后再发布，前台公告消息同步可见。'],
  ['用户', '收到公告后需要判断是否需要进一步查看。', '公告正文直接展示；只有后台配置跳转链接时才展示“查看详情”。'],
];

const scenarioRows = [
  ['页面/事项', '规则', '验收口径'],
  ['顶部消息入口', '头像左侧保留消息 icon，未读总数 = 取数消息未读数 + 已发布公告消息未读数。', '点击 icon 打开消息盒子；任一消息已读后，顶部徽标和分类徽标同步扣减。'],
  ['消息盒子结构', '弹窗左侧菜单只包含取数消息、公告消息；默认选中取数消息；分类未读徽标只统计当前分类。', '分类切换不关闭弹窗；侧边菜单 hover/选中态与系统二级导航一致。'],
  ['取数消息生成', '按实际产生的运行详情任务生成消息；每次重试产生新的运行详情任务时生成新消息。', '一条运行详情任务对应一条消息。'],
  ['取数消息内容', '收起态展示计划名称和发生时间；展开态展示数据表、店铺、计划名称、失败原因。失败原因来源于“运行记录 > 运行详情 > 当前 work > 对应店铺取数执行结果行”，不读取父级运行记录或 work 汇总行兜底。', '失败、超时取当前结果行原因，部分成功取失败结果行原因；成功、运行中和字段为空显示 -。'],
  ['取数消息处理', '点击查看运行详情后标记已读，关闭消息盒子，进入运行记录并打开对应计划的运行详情抽屉。', '不展示临时定位提示条；按钮文案为“查看运行详情”。'],
  ['公告消息展示', '公告消息只展示已发布公告；默认展开，字段包含公告标题、公告类型、发布时间、公告正文。', '卡片内不出现“公告内容：”和“未读”文字；公告类型 tag 圆角为 4px。'],
  ['公告跳转', '后台配置跳转链接时，前台公告展示“查看详情”；未配置时不展示按钮。', '跳转按钮文案默认“查看详情”；无链接时无按钮占位。'],
  ['公告列表字段', '后台公告列表字段：公告标题、公告类型、发送范围、状态、发布时间、跳转配置、阅读情况、操作。', '列表容器无额外内边距，分页置底固定；字段逐项可验收。'],
  ['公告状态与操作', '状态包含未发布、已发布、已下线；未发布可编辑/发布，已发布可编辑/下线，已下线可编辑/发布。', '未发布不进入前台；发布后进入前台；下线后前台移除。'],
  ['新建/编辑公告', '字段包含公告标题、公告类型、发送范围、公告内容、跳转按钮文案、跳转链接；新建默认保存为未发布。', '不提供发布状态下拉；保存后通过列表操作发布。'],
];

const annotationRows = [
  ['编号', '位置', '交互标注'],
  ['1', '顶部消息 icon', '说明未读总数口径、已读同步和默认打开分类。'],
  ['2', '消息盒子左侧菜单', '说明分类范围、分类未读数、切换行为和 hover/选中态。'],
  ['3', '取数消息卡片', '说明消息生成口径、字段来源、状态排序和查看运行详情闭环。'],
  ['4', '公告消息卡片', '说明已发布公告展示、字段、已读规则和跳转按钮条件。'],
  ['5', '后台公告列表', '说明列表字段、字段含义、状态动作、阅读情况和分页固定。'],
  ['6', '新建/编辑公告抽屉', '说明字段必填、默认值、跳转配置和保存/发布分工。'],
];

const outOfScopeRows = [
  ['事项', '说明'],
  ['-', '-'],
];

const acceptanceRows = [
  ['验收点', '验收标准'],
  ['PRD/原型入口', '411 顶部需求条可切换到“消息盒子与公告管理”，支持 PRD 和交互原型。'],
  ['标注入口', '交互标注入口展示标注数量，点击后可查看并定位关键交互点。'],
  ['消息盒子', '取数消息、公告消息均可打开、切换、展开、收起。'],
  ['运行详情闭环', '取数消息点击查看运行详情后关闭消息盒子并打开运行详情抽屉。'],
  ['公告管理闭环', '后台可新建草稿、发布、下线；前台只展示已发布公告。'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function MessageCenterPrd() {
  return (
    <div className={styles.page}>
      <Typography.Title className={styles.title} heading={2}>
        消息盒子与公告管理
      </Typography.Title>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <Section title="版本信息"><PrdTable className={styles.table} rows={changeRows} /></Section>
          <Section title="需求背景">
            <p className={styles.paragraph}>
              取数宝当前缺少统一消息入口。计划运行异常、超时、部分成功等信息散落在运行记录中，用户需要主动巡检；公告信息也缺少从后台配置到前台触达的闭环。本需求通过消息盒子承接前台提醒，通过公告管理承接后台发布，形成可评审、可开发的前端交互闭环。
            </p>
          </Section>
          <Section title="目标">
            <p className={styles.paragraph}>
              建立取数消息和公告消息两类消息体验，让用户能及时看到取数执行结果、失败原因和处理入口；让运营能在后台维护公告，并控制是否在前台提供跳转。
            </p>
          </Section>
          <Section title="需求范围"><PrdTable className={styles.table} rows={scopeRows} /></Section>
          <Section title="用户故事"><PrdTable className={styles.table} rows={storyRows} /></Section>
        </div>

        <div className={styles.panel}>
          <Section title="用户场景与交互说明">
            <PrdTable className={`${styles.table} ${styles.wideTable}`} rows={scenarioRows} />
          </Section>
          <Section title="交互标注清单"><PrdTable className={styles.table} rows={annotationRows} /></Section>
          <Section title="本期不做"><PrdTable className={styles.table} rows={outOfScopeRows} /></Section>
          <Section title="验收清单"><PrdTable className={styles.table} rows={acceptanceRows} /></Section>
        </div>
      </div>
    </div>
  );
}
