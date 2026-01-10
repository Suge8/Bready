CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO system_settings (key, value, encrypted) VALUES
    ('ai_provider', 'doubao', false),
    ('ai_gemini_api_key', '', true),
    ('ai_doubao_chat_api_key', '', true),
    ('ai_doubao_asr_app_id', '', true),
    ('ai_doubao_asr_access_key', '', true),
    ('payment_provider', '', false),
    ('payment_epay_pid', '', true),
    ('payment_epay_key', '', true),
    ('payment_epay_api_url', 'https://zpayz.cn', false),
    ('payment_wechat_mchid', '', true),
    ('payment_wechat_appid', '', true),
    ('payment_wechat_api_key', '', true),
    ('payment_wechat_cert_serial', '', true),
    ('payment_wechat_private_key', '', true),
    ('payment_alipay_app_id', '', true),
    ('payment_alipay_private_key', '', true),
    ('payment_alipay_public_key', '', true),
    ('payment_notify_url', '', false)
ON CONFLICT (key) DO NOTHING;
