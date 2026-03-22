---
quick_id: 260322-elt
type: execute
---

<objective>
为 LLM Config 页面添加 OpenAI 兼容接口支持，允许用户自定义 baseURL

Purpose: 支持 OpenAI 兼容的第三方 API 服务（如 Azure OpenAI、其他兼容 OpenAI API 格式的服务）
Output: LLMConfigTab 组件新增 baseURL 字段，表单可配置自定义 API 地址
</objective>

<execution_context>
@/workspace/.claude/get-shit-done/workflows/execute-plan.md
@/workspace/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@/workspace/frontend/src/components/config/LLMConfigTab.tsx
@/workspace/frontend/src/lib/types.ts
@/workspace/frontend/src/store/appStore.ts
</context>

<tasks>

<task type="auto">
  <name>更新 LLM 配置类型定义，添加 baseURL 字段</name>
  <files>src/lib/types.ts</files>
  <action>
    1. 读取 types.ts 文件，找到 LLMConfig 相关类型定义
    2. 在 LLMConfig 接口或类型中添加 `baseURL?: string;` 字段
    3. 确保 baseURL 是可选字段，保持向后兼容性
  </action>
  <verify>
    <automated>grep -n "baseURL" /workspace/frontend/src/lib/types.ts</automated>
  </verify>
  <done>LLMConfig 类型定义包含 baseURL 可选字段</done>
</task>

<task type="auto">
  <name>更新 LLMConfigTab 组件，添加 baseURL 输入框</name>
  <files>frontend/src/components/config/LLMConfigTab.tsx, frontend/src/components/config/LLMConfigTab.css</files>
  <action>
    1. 在 LLMConfigTab.tsx 中，更新表单 schema（llmConfigSchema）添加 baseURL 字段验证
    2. 在 Provider 选择为 OpenAI 或 Anthropic 时，显示 baseURL 输入框
    3. 将 baseURL 输入框放在 API Key 输入框下方，保持一致的样式
    4. 使用 react-hook-form 的 register 绑定 baseURL 字段
    5. 添加适当的提示文本，说明 baseURL 的用途（例如："自定义 API 地址（可选），留空使用默认值"）
    6. 在 LLMConfigTab.css 中，为 baseURL 输入框添加适当的间距和样式（使用 var(--spacing-md)）
  </action>
  <verify>
    <automated>grep -n "baseURL" /workspace/frontend/src/components/config/LLMConfigTab.tsx</automated>
  </verify>
  <done>LLMConfigTab 组件包含 baseURL 输入框，仅在 OpenAI/Anthropic provider 时显示，表单验证正确</done>
</task>

<task type="auto">
  <name>更新 appStore，确保 baseURL 正确保存和加载</name>
  <files>frontend/src/store/appStore.ts</files>
  <action>
    1. 读取 appStore.ts 文件，找到 updateLLMConfig 函数
    2. 确保 updateLLMConfig 函数能正确处理 baseURL 字段
    3. 验证初始配置加载时是否包含 baseURL 字段的默认值（或 undefined）
  </action>
  <verify>
    <automated>grep -A 5 "updateLLMConfig" /workspace/frontend/src/store/appStore.ts</automated>
  </verify>
  <done>appStore 正确保存和加载 LLM 配置的 baseURL 字段</done>
</task>

</tasks>

<success_criteria>
- [ ] LLMConfig 类型包含 baseURL 可选字段
- [ ] LLMConfigTab 页面显示 baseURL 输入框
- [ ] baseURL 输入框仅在 OpenAI/Anthropic provider 时显示
- [ ] 表单可以提交和保存 baseURL 值
- [ ] 样式与现有表单元素一致，使用 Apple Design System 间距标准
</success_criteria>

<output>
After completion, create `.planning/quick/260322-elt-llm-config-openai-baseurl/260322-elt-SUMMARY.md`
</output>
