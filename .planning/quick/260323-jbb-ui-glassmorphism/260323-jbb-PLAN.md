# Quick Task 260323-jbb: UI重设计

**Date:** 2026-03-23
**Status:** In Progress

## Description
UI重设计：采用Glassmorphism毛玻璃风格、渐变色背景、现代化圆角和阴影效果

## Design Requirements

### 1. Glassmorphism (毛玻璃) 风格
- 使用半透明背景和 backdrop-filter 模糊效果
- 玻璃质感卡片和面板
- 层次分明的深度感

### 2. 渐变色背景
- 紫蓝渐变: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)`
- 粉紫渐变点缀
- 动态渐变背景覆盖层

### 3. 现代化圆角
- 大圆角设计: rounded-xl (24px), rounded-2xl (32px)
- 全圆角徽章和标签: rounded-full
- 圆角一致性

### 4. 高级阴影效果
- 多层柔和阴影
- 发光效果 (glow): `box-shadow: 0 0 40px rgba(139, 92, 246, 0.15)`
- 悬浮阴影增强

### 5. 配色方案
- 主色调: Indigo/Purple/Violet 色系
- 深色主题背景: #0f0f1a
- 玻璃边框: rgba(255, 255, 255, 0.1)

### 6. 交互动画
- 平滑过渡: 250ms cubic-bezier(0.4, 0, 0.2, 1)
- 悬浮效果: translateY(-2px) + 阴影增强
- 按钮点击反馈: scale(0.98)
- 渐变按钮光泽动画

## Tasks

### Task 1: 更新全局样式 (index.css)
**Files:**
- `/workspace/frontend/src/index.css`

**Changes:**
- 定义CSS变量: 渐变色、玻璃效果、阴影、圆角
- 暗色主题背景
- 全局动画定义
- 滚动条样式
- 基础组件样式 (按钮、卡片、徽章)

### Task 2: 更新组件样式
**Files:**
- `/workspace/frontend/src/components/SessionPanel.css`
- `/workspace/frontend/src/components/SessionTabs.css`
- `/workspace/frontend/src/components/TabNavigation.css`
- `/workspace/frontend/src/components/CreateSessionForm.css`
- `/workspace/frontend/src/components/SceneControls.css`
- `/workspace/frontend/src/components/ConnectionStatus.css`
- `/workspace/frontend/src/components/Toast.css`
- `/workspace/frontend/src/components/ErrorBoundary.css`
- `/workspace/frontend/src/components/SessionsList.css`
- `/workspace/frontend/src/components/ExportTab.css`
- `/workspace/frontend/src/components/config/LLMConfigTab.css`
- `/workspace/frontend/src/components/config/SessionParamsTab.css`
- `/workspace/frontend/src/components/dashboard/dashboard.css`
- `/workspace/frontend/src/components/templates/TemplatesTab.css`
- `/workspace/frontend/src/components/visualization/visualization.css`

**Changes per file:**
- 玻璃质感背景 (glass-bg)
- 模糊效果 (backdrop-filter)
- 渐变按钮
- 发光状态指示器
- 卡片悬浮效果

## Verification Checklist

- [x] 全局CSS变量定义完整
- [x] 所有组件使用Glassmorphism风格
- [x] 渐变色按钮带光泽动画
- [x] 圆角统一使用设计系统变量
- [x] 阴影和发光效果协调
- [x] 暗色主题背景正确显示
- [x] 响应式设计保持
- [x] 交互动画流畅
