# 账号设置页 Design QA

## 对照基准

- Source visual truth: `audit/account-settings-redesign/selected-reference.png`
- Implementation screenshot: `audit/account-settings-redesign/implementation-final-1487x1058.png`
- Full-view comparison: `audit/account-settings-redesign/comparison-final-exact.png`
- Focused profile comparison: `audit/account-settings-redesign/focused-profile-comparison.png`
- Focused storage comparison: `audit/account-settings-redesign/focused-storage-comparison.png`
- Viewport: 1487 × 1058 CSS px
- Source pixels: 1487 × 1058
- Implementation pixels: 1487 × 1058
- Density normalization: 无；实现截图与 CSS 视口 1:1，和源图像素尺寸一致
- State: 浅色主题；用户菜单已进入个人中心；账号设置选中；无弹层、Toast 或悬浮态遮挡

## Findings

- 无剩余 P0 / P1 / P2 问题。
- [P3] 存储类型图标使用 Arco 标准图标，未使用选稿中的钉钉、飞书品牌图形。
  - Location: 存储管理三行数据源图标。
  - Evidence: 源图使用品牌化图标，实现使用统一线性 Arco 图标。
  - Impact: 不影响识别和操作，图标风格与当前原型的 Arco 设计系统更一致。
  - Decision: 接受；项目内没有可复用的品牌图标资产，不用自绘 SVG 或低清截图替代。

## Required fidelity surfaces

- Fonts and typography: 沿用 Arco 中文系统字体与全局字号、字重、行高；标题层级、账号名称单行结构、说明文字灰阶与选稿一致，无异常折行。
- Spacing and layout rhythm: 主内容起点、卡片顶部、29% / 71% 双栏比例、750px 视口内卡片高度、三行存储间距与选稿对齐；1280 × 720 较窄桌面视口无重叠或横向溢出。
- Colors and visual tokens: 背景、边框、文字、链接、成功状态、圆角和间距均使用 Arco 全局变量；无额外硬编码品牌色。
- Image quality and asset fidelity: 用户头像复用项目高清资产；其余可见图标来自 Arco 图标库，无 emoji、CSS 绘图或自绘 SVG 替代。
- Copy and content: 页面标题、副标题、账号字段、资源摘要、三类存储、脱敏关键信息、配置文档与编辑入口均与选稿和当前需求一致。

## Comparison history

### Iteration 1

- Earlier P2: 主内容起点偏左、账号卡片占比过大，双栏比例和整体高度与选稿不一致。
- Fix: 为账号设置内容增加 Arco 间距变量；栅格调整为约 29% / 71%；卡片高度改为视口和 Arco 尺寸变量计算；拉开账号详情与存储表头节奏。
- Post-fix evidence: `audit/account-settings-redesign/comparison-v2-exact.png`。

### Iteration 2

- Earlier P2: 存储行内容相对分隔线偏低，状态缺少圆点，编辑按钮强调色过强；窄屏账号信息标题可能折行。
- Fix: 存储行改为顶部 token 对齐；补充成功状态圆点；按钮改为中性边框 token；账号名称合并为单行并增大头像；标题禁止折行。
- Post-fix evidence: `audit/account-settings-redesign/comparison-final-exact.png`、`audit/account-settings-redesign/focused-profile-comparison.png`、`audit/account-settings-redesign/focused-storage-comparison.png`。

## Interaction and runtime checks

- Primary interactions: 编辑资料、修改密码、数据库配置文档、数据库编辑均出现对应 Arco Message 反馈。
- Navigation: 个人中心仅保留账号设置、连接器管理、短信队列管理、机器人设备管理；独立存储管理入口已移除。
- Responsive evidence: `audit/account-settings-redesign/responsive-1024x768.png`（浏览器实际输出 1280 × 720），无控件重叠或横向溢出；标题折行问题已修复。
- Console: 最终页面 `error` / `warn` 日志为 0。

## Implementation checklist

- [x] 账号信息与存储管理合并为同页双栏布局
- [x] 移除左侧独立存储管理菜单
- [x] 三类存储展示连接状态、脱敏关键信息、文档与编辑入口
- [x] 使用 Arco 组件、图标和全局设计变量
- [x] 同步 PRD、测试、构建和真页验收

final result: passed

---

# 概况排期阶段卡片高度分档 Design QA

## Verification evidence

- Runtime URL: `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`
- Runtime cwd: `/Users/sensen/Desktop/storedata/qsb-requirement-iterations/412 迭代需求文件`
- 周视图 `02:05~03:00（耗时55min）` 卡片实测高度 `36.66px`，DOM 仅保留单个文本行；文本宽度不足时使用省略号，无垂直溢出。
- 日视图高度 `45.33px`、`47.33px`、`50px`、`52.66px` 的卡片均展示阶段名和时间/耗时两行，两行分别限制为单行省略。
- 44px 边界回归覆盖：55 分钟和 65 分钟使用单行，66 分钟起使用双行。
- 55 分钟卡片悬浮后完整展示计划名、运行次数、最新结果、涉及店铺和涉及入库表。
- 45 条自动化测试、TypeScript 检查、Vite 生产构建和目标文件 `git diff --check` 通过。
- 页面无业务运行错误；内嵌浏览器存在一条 Vite HMR WebSocket 连接提示，不影响页面加载、交互与本次验收。

final result: passed

---

# 概况日历边界与计划 Tooltip Design QA

## Implementation checks

- [x] Tooltip 外层弹层与内容区均按内容自适应，最大宽度受视口约束。
- [x] 8 个店铺与 8 张入库表完整换行展示，无横向溢出、固定高度裁剪或滚动截断。
- [x] 日视图最多切换至昨日；到达 `2026-08-27` 后下一日按钮禁用。
- [x] 周视图允许查看本周，但下一周按钮禁用。
- [x] 月视图允许查看本月，但下一月按钮禁用。
- [x] 运行趋势标题中的更新时间文案已移除。
- [x] 43 条自动化测试、TypeScript 检查、Vite 生产构建和 `git diff --check` 通过。
- [x] 最终页面控制台 `error` / `warn` 日志为 0。

final result: passed

---

# 概况排期默认状态与计划 Tooltip Design QA

## Implementation checks

- [x] 首次进入默认选中“月”，并渲染机器人月度运行排期。
- [x] 机器人视图默认选中，且入口排在运行数据视图之前。
- [x] 日、周时间日历计划卡片四向计算内边距均为 `4px`。
- [x] Tooltip 字段顺序为计划名称、运行次数、最新结果、涉及店铺、涉及入库表。
- [x] 成功项显示“入库成功”，失败项显示“失败（QSB 错误码）”。
- [x] 真页覆盖 8 个店铺和 8 张入库表的计划，全部名称完整展示并支持换行滚动。
- [x] 42 条自动化测试、TypeScript 检查、Vite 生产构建和 `git diff --check` 通过。
- [x] 最终页面控制台 `error` / `warn` 日志为 0。

final result: passed

---

# 概况机器人日/周日历 Design QA

## 对照基准

- Source visual truth: 用户提供的钉钉日视图、周视图截图，以及当前已确认的月视图。
- Target model: 机器人保留为外层纵向分组；日视图为 1 个日期列 × 24 小时，周视图为 7 个日期列 × 24 小时，月视图保持 7 × 6 自然月历。
- Runtime URL: `http://127.0.0.1:5178/?requirement=qsbOverview&tab=prototype`

## Implementation checks

- [x] 日、周共用 `TimeRobotCalendar`，不再复用横向甘特图。
- [x] 日视图只生成 1 个日期列，周视图只生成周日到周六 7 个日期列。
- [x] 计划卡片按开始时间和耗时映射到 24 小时纵轴。
- [x] 机器人名称、计划数和超限状态继续占据外层纵向分组。
- [x] 日期前后切换覆盖日、周、月三种视图。
- [x] 月视图保持 7 × 6 自然月历；日、周、月共用计划名称、起止时间、耗时和悬浮详情组件。
- [x] 悬浮详情的运行结果改为最新一条 work 的最终结果，不再展示成功/失败累计次数。
- [x] 涉及店铺支持完整多店铺集合，并在有限高度内自动换行和滚动。
- [x] 42 条自动化测试通过，TypeScript 检查与 Vite 生产构建通过。
- [x] 本地服务已恢复，5178 端口监听且 HTTP 返回 200。

## Visual comparison status

- 内嵌浏览器已分别切换日、周、月视图验收：日/周均显示 24 小时时间轴，月视图保持自然月历；三种视图均显示计划名称、起止时间和耗时。
- 悬浮验收覆盖最新一次成功、最新一次失败和 8 个店铺的计划；店铺名称完整展示。
- 最终页面控制台 `error` / `warn` 日志为 0。

final result: passed
