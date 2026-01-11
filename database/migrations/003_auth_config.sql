-- 认证配置：短信网关和微信登录
-- Migration: 003_auth_config.sql

-- 添加短信网关配置
INSERT INTO system_settings (key, value, encrypted) VALUES
    ('sms_provider', '', false),
    ('sms_aliyun_access_key_id', '', true),
    ('sms_aliyun_access_key_secret', '', true),
    ('sms_aliyun_sign_name', '', false),
    ('sms_aliyun_template_code', '', false),
    ('sms_tencent_secret_id', '', true),
    ('sms_tencent_secret_key', '', true),
    ('sms_tencent_app_id', '', false),
    ('sms_tencent_sign_name', '', false),
    ('sms_tencent_template_id', '', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, encrypted) VALUES
    ('wechat_login_enabled', 'false', false),
    ('wechat_login_app_id', '', true),
    ('wechat_login_app_secret', '', true),
    ('wechat_login_redirect_uri', '', false)
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(20) UNIQUE;
        CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'wechat_openid'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN wechat_openid VARCHAR(64) UNIQUE;
        ALTER TABLE user_profiles ADD COLUMN wechat_unionid VARCHAR(64);
        CREATE INDEX idx_user_profiles_wechat_openid ON user_profiles(wechat_openid);
    END IF;

    ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE user_profiles ALTER COLUMN password_hash DROP NOT NULL;
END $$;
