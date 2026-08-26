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
