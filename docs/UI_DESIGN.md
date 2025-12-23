# Bready UI/UX 设计规范

## 模态框设计理念

### 核心原则

所有模态框遵循统一的交互设计，确保用户体验的一致性。

### 结构规范

```tsx
<div 
  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
  onClick={handleClose}  // 点击外部关闭
>
  <div 
    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl cursor-auto"
    onClick={(e) => e.stopPropagation()}  // 阻止事件冒泡
  >
    {/* 模态框内容 */}
  </div>
</div>
```

### 交互规范

#### 1. 关闭方式
- ❌ **不使用**右上角 X 关闭按钮
- ✅ **点击外部背景**关闭（外层 div 的 onClick）
- ✅ 内容区域点击不关闭（stopPropagation）

#### 2. 光标样式（Electron 应用）

**外层背景**：
- `cursor-pointer` - 提示用户可以点击关闭

**内层内容**：
- `cursor-auto` - 重置光标，避免继承外层的 cursor-pointer

**交互元素**：
- 所有按钮：`cursor-pointer`
- 所有下拉框：`cursor-pointer`
- 可点击的卡片/div：`cursor-pointer`

> ⚠️ **重要**：在 Electron 应用中，必须手动为所有可交互元素添加 `cursor-pointer`，
> 因为 Electron 不像浏览器那样自动为按钮提供手型光标。

#### 3. 视觉效果

- **背景**：`bg-black/50` + `backdrop-blur-sm`（黑色半透明+模糊）
- **内容卡片**：
  - 圆角：`rounded-xl`
  - 阴影：`shadow-2xl`
  - 内边距：`p-6`
- **深色模式支持**：所有颜色都有 dark: 变体

### 按钮规范

#### 主要操作按钮
```tsx
<button className="bg-black text-white hover:bg-gray-800 cursor-pointer">
  确定
</button>
```

#### 取消/次要按钮
```tsx
<button 
  variant="outline"
  className="border-gray-300 hover:bg-gray-50 cursor-pointer"
>
  取消
</button>
```

### 实际案例

#### 案例 1：准备面试模态框
- 标题居左
- 无关闭按钮
- 按钮居中显示
- 点击外部关闭

#### 案例 2：退出确认对话框
- 只有一个"退出"按钮（全宽）
- 删除了"取消"按钮（点击外部即可取消）
- 按钮居中显示

#### 案例 3：权限设置模态框
- 无右上角关闭按钮
- 无底部关闭按钮
- 点击外部关闭

### 布局规范

- **标题**：居左，无右侧关闭按钮
- **按钮位置**：
  - 单个按钮：居中（`justify-center`）
  - 多个按钮：根据重要性居左/右/分散

### 文字规范

保持简洁：
- "请选择本次面试的准备项" → "准备面试"
- "面试语言" → "语言"
- "使用目的" → "目的"
- "不准备，直接开始" → 简洁明了

### Z-index 层级

- 一般模态框：`z-50` 或 `z-[100]`
- 重要模态框（如系统权限）：`z-[9999]`

---

## 设计原则总结

1. **简洁至上** - 移除非必要元素
2. **一致性** - 所有模态框使用相同的交互模式
3. **直观性** - 光标变化明确提示用户可以做什么
4. **Electron 优化** - 手动添加所有 cursor-pointer
5. **无障碍** - 点击外部可关闭，降低操作门槛
