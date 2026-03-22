# Phase 11: Script Generation & Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 11-Script Generation & Export
**Areas discussed:** Export Content Scope, Export UI Location, JSON Format Structure, Markdown Script Style, PDF Generation Approach, Export Timing & Limitations

---

## Export Content Scope

|| Option | Description | Selected |
||--------|-------------|----------|
|| 完整剧本 | 包含 Session 元信息、所有 scene beats、角色卡信息、剧情大纲、场景时间戳 | ✓ |
|| 精简剧本 | 仅包含 scene beats（角色: 台词）+ 场景标题 | |
|| 可定制导出 | 默认导出完整剧本，但用户可选择导出范围 | |

**User's choice:** recommended
**Notes:** Selected "完整剧本" (Complete script) - includes full metadata, character cards, plot backbone, scene beats, and timestamps.

---

## Export UI Location

|| Option | Description | Selected |
||--------|-------------|----------|
|| 独立 "Export" Tab | 在侧边栏添加 "Export" tab，右侧面板显示导出选项 | ✓ |
|| SessionPanel 中导出按钮 | 在 SessionPanel 右上角添加导出按钮 | |
|| 双模式 | SessionPanel 中快速导出 + Export Tab 中高级选项 | |

**User's choice:** recommended
**Notes:** Selected "独立 Export Tab" (Dedicated Export tab) - adds "Export" tab to sidebar, right panel displays export options.

---

## JSON Format Structure

|| Option | Description | Selected |
||--------|-------------|----------|
|| 分层嵌套结构 | {session, config, characters, backbone, scenes[]} | ✓ |
|| 扁平时间线 | {session, events: [{type, character, text}, ...]} | |
|| 完整黑板数据 | 分层结构 + 完整 blackboard 对象 | |

**User's choice:** recommended
**Notes:** Selected "分层嵌套结构" (Nested hierarchical structure) - clear hierarchy matching script logic, excludes full blackboard entries.

---

## Markdown Script Style

|| Option | Description | Selected |
||--------|-------------|----------|
|| 戏剧剧本格式 | # 剧本名称 ## 角色列表 ## 场景 N: Location **Character**: 台词 | ✓ |
|| 叙事散文风格 | # 剧本名称 Character1 说道："台词1" | |
|| 混合格式 | 戏剧剧本格式 + 章节标题和剧情大纲 | |

**User's choice:** recommended
**Notes:** Selected "戏剧剧本格式" (Dramatic script format) - follows standard play script conventions, easy to read for playwrights.

---

## PDF Generation Approach

|| Option | Description | Selected |
||--------|-------------|----------|
|| 客户端生成 - html2pdf.js | 前端将 Markdown 渲染为 HTML，再用 html2pdf.js 转为 PDF | ✓ |
|| 客户端生成 - jsPDF | 直接用 jsPDF API 绘制文本和格式 | |
|| 服务端生成 - Puppeteer | 后端生成 HTML，用 Puppeteer 渲染为 PDF | |
|| 混合模式 | JSON/Markdown 用客户端，PDF 用服务端 | |

**User's choice:** recommended
**Notes:** Selected "客户端生成 - html2pdf.js" (Client-side html2pdf.js) - no backend dependency, fast response, reuses Markdown styling.

---

## Export Timing & Limitations

|| Option | Description | Selected |
||--------|-------------|----------|
|| 仅完成状态的 session 可导出 | 只有 status: completed 的 session 显示导出按钮 | ✓ |
|| 任何状态都可导出 | 所有 session 都可导出，未完成的显示"部分导出"提示 | |
|| 选择性导出 | 用户可选择导出哪些 scene | |

**User's choice:** recommended
**Notes:** Selected "仅完成状态的 session 可导出" (Export only completed sessions) - avoids incomplete exports, clearer UX.

---

## Claude's Discretion

Areas where user deferred to Claude:
- Exact file naming convention
- PDF page layout and typography details
- Export error handling and user feedback (toasts)
- Loading states during export
- Whether to add cover page for PDF exports

---

## Deferred Ideas

None — discussion stayed within phase scope.
