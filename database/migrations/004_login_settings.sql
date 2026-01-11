-- 登录渠道配置
-- Migration: 004_login_settings.sql

-- 添加登录渠道开关配置
INSERT INTO system_settings (key, value, encrypted) VALUES
    ('login_email_enabled', 'true', false),
    ('login_phone_enabled', 'false', false),
    ('login_wechat_enabled', 'false', false),
    ('login_google_enabled', 'false', false)
ON CONFLICT (key) DO NOTHING;

-- 添加 Google OAuth 配置
INSERT INTO system_settings (key, value, encrypted) VALUES
    ('google_login_client_id', '', true),
    ('google_login_client_secret', '', true),
    ('google_login_redirect_uri', '', false)
ON CONFLICT (key) DO NOTHING;

-- 添加密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- 添加 Google OpenID 字段到用户表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'google_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN google_id VARCHAR(64) UNIQUE;
        CREATE INDEX idx_user_profiles_google_id ON user_profiles(google_id);
    END IF;
END $$;
