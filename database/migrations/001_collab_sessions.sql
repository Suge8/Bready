-- 协作会话表（用于租约式计费）
CREATE TABLE IF NOT EXISTS collab_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    remaining_ms_at_start BIGINT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    end_reason TEXT,
    consumed_ms BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_user_id ON collab_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_expires_at ON collab_sessions(expires_at);

-- 添加活跃会话约束（一人同时只能有一个活跃会话）
CREATE UNIQUE INDEX IF NOT EXISTS idx_collab_sessions_active 
ON collab_sessions(user_id) WHERE ended_at IS NULL;
