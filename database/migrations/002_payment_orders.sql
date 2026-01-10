CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES membership_packages(id),
    order_no VARCHAR(64) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_provider VARCHAR(32) NOT NULL,
    payment_channel VARCHAR(32),
    status VARCHAR(32) DEFAULT 'pending',
    trade_no VARCHAR(128),
    pay_url TEXT,
    qrcode_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    notify_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_no ON payment_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);

CREATE TRIGGER update_payment_orders_updated_at 
    BEFORE UPDATE ON payment_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
