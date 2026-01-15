# 用户中心 (User Profile)

用户设置、会员管理、安全配置模块。

## 结构

```
user-profile/
├── UserProfileModal.tsx    # 主入口模态框 [574行]
├── SecuritySettings.tsx    # 安全设置 [580行]
├── AppearanceSettings.tsx  # 外观设置
├── ShortcutSettings.tsx    # 快捷键设置
├── MembershipCard.tsx      # 会员卡片
├── MembershipBenefits.tsx  # 会员权益
├── PackageList.tsx         # 套餐列表
├── PurchaseHistory.tsx     # 购买记录
├── UsageHistory.tsx        # 使用记录
├── ProfileHeader.tsx       # 头部信息
├── ProfileEditor.tsx       # 资料编辑
├── AvatarSelector.tsx      # 头像选择
├── SkeletonLoaders.tsx     # 骨架屏
├── hooks/                  # 状态管理
│   ├── useUserProfile.ts   # 用户数据
│   ├── usePurchaseHistory.ts
│   └── useUsageHistory.ts
└── index.ts                # 导出
```

## 快速定位

| 任务     | 文件                      |
| -------- | ------------------------- |
| 用户设置 | `UserProfileModal.tsx`    |
| 安全配置 | `SecuritySettings.tsx`    |
| 会员展示 | `MembershipCard.tsx`      |
| 套餐购买 | `PackageList.tsx`         |
| 用户状态 | `hooks/useUserProfile.ts` |

## 模式

- **Hook 分离**: 复杂状态逻辑抽取到 `hooks/`
- **骨架屏**: 使用 `SkeletonLoaders.tsx` 统一加载态
- **模态框**: 通过 `UserProfileModal` 统一入口

## 技术债务

| 文件                   | 问题   | 状态   |
| ---------------------- | ------ | ------ |
| `SecuritySettings.tsx` | 580 行 | 待拆分 |
| `UserProfileModal.tsx` | 574 行 | 待拆分 |
