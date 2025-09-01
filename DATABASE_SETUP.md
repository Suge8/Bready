# 面宝 (Bready) 数据库设置指南

本项目使用本地 PostgreSQL 数据库。请按照以下步骤设置数据库环境。

## 1. 安装 PostgreSQL

### macOS
```bash
# 使用 Homebrew 安装
brew install postgresql@15

# 启动 PostgreSQL 服务
brew services start postgresql@15
```

### Windows
1. 下载 PostgreSQL 安装程序：https://www.postgresql.org/download/windows/
2. 运行安装程序，设置密码（建议使用 `postgres`）
3. 确保 PostgreSQL 服务已启动

### Linux (Ubuntu/Debian)
```bash
# 更新包列表
sudo apt update

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 2. 创建数据库

### 方法一：使用命令行
```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE bready;

# 退出
\q
```

### 方法二：使用 pgAdmin
1. 打开 pgAdmin（如果已安装）
2. 连接到本地 PostgreSQL 服务器
3. 右键点击 "Databases" → "Create" → "Database..."
4. 输入数据库名称：`bready`
5. 点击 "Save"

## 3. 初始化数据库表结构

项目启动时会自动执行数据库初始化，但你也可以手动执行：

```bash
# 进入项目目录
cd /path/to/bready

# 连接到数据库并执行初始化脚本
psql -U postgres -d bready -f database/init.sql
```

## 4. 配置环境变量

1. 复制环境配置文件：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，设置数据库连接信息：
```env
# PostgreSQL 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bready
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT 密钥（生产环境请使用强密钥）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Gemini API 配置
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 5. 验证数据库连接

启动应用后，检查控制台输出：

```
数据库连接成功
数据库初始化完成
```

如果看到这些消息，说明数据库设置成功。

## 6. 默认管理员账户

系统会自动创建一个默认管理员账户：
- 邮箱：`admin@bready.app`
- 密码：`admin123`
- 权限：超级管理员

**重要：** 首次登录后请立即修改默认密码！

## 7. 数据库表结构

项目包含以下主要数据表：

- `user_profiles` - 用户配置信息
- `preparations` - 面试准备项
- `membership_packages` - 会员套餐
- `purchase_records` - 购买记录
- `interview_usage_records` - 面试使用记录
- `user_sessions` - 用户会话管理

## 8. 常见问题

### Q: 连接数据库失败
A: 检查以下项目：
1. PostgreSQL 服务是否正在运行
2. 数据库名称、用户名、密码是否正确
3. 端口号是否正确（默认 5432）
4. 防火墙是否阻止连接

### Q: 权限错误
A: 确保 PostgreSQL 用户有足够权限：
```sql
-- 给用户授权
GRANT ALL PRIVILEGES ON DATABASE bready TO postgres;
```

### Q: 如何重置数据库
A: 删除并重新创建数据库：
```bash
# 连接到 PostgreSQL
psql -U postgres

# 删除数据库
DROP DATABASE IF EXISTS bready;

# 重新创建
CREATE DATABASE bready;

# 退出
\q

# 重新运行初始化脚本
psql -U postgres -d bready -f database/init.sql
```

### Q: 如何备份数据库
A: 使用 pg_dump 命令：
```bash
# 备份数据库
pg_dump -U postgres -d bready > bready_backup.sql

# 恢复数据库
psql -U postgres -d bready < bready_backup.sql
```

## 9. 生产环境建议

1. **安全性**：
   - 使用强密码
   - 更改默认端口
   - 配置防火墙规则
   - 定期更新 JWT 密钥

2. **性能优化**：
   - 调整 PostgreSQL 配置
   - 设置适当的连接池大小
   - 定期维护数据库索引

3. **备份策略**：
   - 设置自动备份
   - 测试恢复流程
   - 异地备份存储

## 10. 开发工具推荐

- **pgAdmin**: PostgreSQL 图形化管理工具
- **DBeaver**: 通用数据库管理工具
- **TablePlus**: macOS 上的数据库客户端
- **psql**: PostgreSQL 命令行工具

---

如有问题，请查看项目 README.md 或提交 Issue。
