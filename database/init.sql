-- 面宝 (Bready) 数据库初始化脚本
-- 创建所有必要的表和索引

-- 创建数据库（如果不存在）
-- CREATE DATABASE bready;

-- 连接到数据库
-- \c bready;

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    user_level TEXT DEFAULT '小白',
    membership_expires_at TIMESTAMP WITH TIME ZONE,
    remaining_interview_minutes INTEGER DEFAULT 0,
    total_purchased_minutes INTEGER DEFAULT 0,
    discount_rate NUMERIC DEFAULT 1.00,
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 面试准备表
CREATE TABLE IF NOT EXISTS preparations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    job_description TEXT NOT NULL,
    resume TEXT,
    analysis JSONB,
    is_analyzing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会员套餐表
CREATE TABLE IF NOT EXISTS membership_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    price NUMERIC NOT NULL,
    interview_minutes INTEGER NOT NULL,
    validity_days INTEGER DEFAULT 30,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 购买记录表
CREATE TABLE IF NOT EXISTS purchase_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES membership_packages(id),
    original_price NUMERIC NOT NULL,
    actual_price NUMERIC NOT NULL,
    discount_rate NUMERIC DEFAULT 1.00,
    interview_minutes INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'completed',
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 面试使用记录表
CREATE TABLE IF NOT EXISTS interview_usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    preparation_id UUID REFERENCES preparations(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL,
    minutes_used INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户会话表（用于身份验证）
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_preparations_user_id ON preparations(user_id);
CREATE INDEX IF NOT EXISTS idx_preparations_updated_at ON preparations(updated_at);
CREATE INDEX IF NOT EXISTS idx_purchase_records_user_id ON purchase_records(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_records_expires_at ON purchase_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_interview_usage_records_user_id ON interview_usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_usage_records_started_at ON interview_usage_records(started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 插入默认会员套餐数据
INSERT INTO membership_packages (name, level, price, interview_minutes, validity_days, description) VALUES
('基础套餐', '小白', 29.9, 60, 30, '适合初学者的基础面试练习套餐'),
('进阶套餐', '螺丝钉', 59.9, 150, 30, '适合有一定经验的求职者'),
('专业套餐', '大牛', 99.9, 300, 30, '适合资深求职者的专业套餐'),
('企业套餐', '管理', 199.9, 600, 30, '适合管理层的企业级套餐')
ON CONFLICT DO NOTHING;

-- 创建默认管理员用户（密码：admin123）
INSERT INTO user_profiles (email, password_hash, full_name, role, user_level, remaining_interview_minutes) VALUES
('admin@bready.app', '$2b$10$DbKk7nqADXknfTEv/JfOFOwUD.TRDAdFJpFTUJPUozEuQ2O5lrLpu', '系统管理员', 'admin', '超级', 9999)
ON CONFLICT (email) DO NOTHING;

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preparations_updated_at BEFORE UPDATE ON preparations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_packages_updated_at BEFORE UPDATE ON membership_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
