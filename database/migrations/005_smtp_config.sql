-- SMTP 邮件服务配置
-- Migration: 005_smtp_config.sql

-- 添加 SMTP 配置到 system_settings
INSERT INTO system_settings (key, value, encrypted) VALUES
    ('smtp_host', '', false),
    ('smtp_port', '465', false),
    ('smtp_secure', 'true', false),
    ('smtp_user', '', false),
    ('smtp_pass', '', true),
    ('smtp_from_name', 'Bready', false),
    ('smtp_from_email', '', false)
ON CONFLICT (key) DO NOTHING;
