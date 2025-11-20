-- =============================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DO FÓRUM
-- Age of Empires IV Brasil
-- =============================================

-- Tabela de Categorias do Fórum
CREATE TABLE IF NOT EXISTS FORUM_CATEGORIES (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    topic_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Tópicos do Fórum
CREATE TABLE IF NOT EXISTS FORUM_TOPICS (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES FORUM_CATEGORIES(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_discord_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(100),
    views INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    last_reply_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Respostas dos Tópicos
CREATE TABLE IF NOT EXISTS FORUM_REPLIES (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES FORUM_TOPICS(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_discord_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(100),
    reply_to INTEGER REFERENCES FORUM_REPLIES(id) ON DELETE SET NULL,
    likes INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    last_edited_by VARCHAR(100),
    last_edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Administradores do Fórum
CREATE TABLE IF NOT EXISTS FORUM_ADMINS (
    id SERIAL PRIMARY KEY,
    discord_user_id VARCHAR(50) UNIQUE NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{"manage_topics": true, "manage_replies": true, "manage_categories": true}',
    added_by VARCHAR(50),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Tabela de Logs de Moderação
CREATE TABLE IF NOT EXISTS FORUM_MOD_LOGS (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id INTEGER,
    target_info JSONB,
    moderator_discord_id VARCHAR(50) NOT NULL,
    moderator_name VARCHAR(100) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Estatísticas dos Usuários
CREATE TABLE IF NOT EXISTS FORUM_USER_STATS (
    id SERIAL PRIMARY KEY,
    discord_user_id VARCHAR(50) UNIQUE NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    topics_created INTEGER DEFAULT 0,
    replies_created INTEGER DEFAULT 0,
    likes_received INTEGER DEFAULT 0,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Configurações do Fórum
CREATE TABLE IF NOT EXISTS FORUM_SETTINGS (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para FORUM_TOPICS
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON FORUM_TOPICS(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_author ON FORUM_TOPICS(author_discord_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned ON FORUM_TOPICS(is_pinned, last_reply_at);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON FORUM_TOPICS(created_at);

-- Índices para FORUM_REPLIES
CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON FORUM_REPLIES(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON FORUM_REPLIES(author_discord_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created ON FORUM_REPLIES(created_at);

-- Índices para FORUM_ADMINS
CREATE INDEX IF NOT EXISTS idx_forum_admins_user ON FORUM_ADMINS(discord_user_id);

-- Índices para FORUM_MOD_LOGS
CREATE INDEX IF NOT EXISTS idx_forum_mod_logs_action ON FORUM_MOD_LOGS(action);
CREATE INDEX IF NOT EXISTS idx_forum_mod_logs_moderator ON FORUM_MOD_LOGS(moderator_discord_id);
CREATE INDEX IF NOT EXISTS idx_forum_mod_logs_created ON FORUM_MOD_LOGS(created_at);

-- Índices para FORUM_USER_STATS
CREATE INDEX IF NOT EXISTS idx_forum_user_stats_user ON FORUM_USER_STATS(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_forum_user_stats_activity ON FORUM_USER_STATS(last_activity);

-- Índices para FORUM_SETTINGS
CREATE INDEX IF NOT EXISTS idx_forum_settings_key ON FORUM_SETTINGS(setting_key);

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Inserir categorias padrão
INSERT INTO FORUM_CATEGORIES (name, slug, description, icon, color, display_order) VALUES
('Estratégias e Dicas', 'estrategias-dicas', 'Compartilhe e aprenda estratégias avançadas', 'fas fa-chess', '#3e8ce5', 1),
('Discussões Gerais', 'discussoes-gerais', 'Conversas sobre Age of Empires IV', 'fas fa-comments', '#48bb78', 2),
('Multiplayer', 'multiplayer', 'Partidas, ranks e competições', 'fas fa-users', '#e53e3e', 3),
('Civilizações', 'civilizacoes', 'Discussões sobre as civilizações', 'fas fa-landmark', '#9f7aea', 4)
ON CONFLICT (slug) DO NOTHING;

-- Inserir configurações padrão
INSERT INTO FORUM_SETTINGS (setting_key, setting_value, description) VALUES
('forum_name', '"Age of Empires IV Brasil - Fórum"', 'Nome do fórum'),
('posts_per_page', '20', 'Número de posts por página'),
('allow_registrations', 'true', 'Permitir novos registros'),
('maintenance_mode', 'false', 'Modo manutenção'),
('max_topics_per_user', '50', 'Máximo de tópicos por usuário')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================
-- MENSAGEM DE CONFIRMAÇÃO
-- =============================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ TABELAS DO FÓRUM CRIADAS COM SUCESSO!';
    RAISE NOTICE '📊 % categorias inseridas', (SELECT COUNT(*) FROM FORUM_CATEGORIES);
    RAISE NOTICE '⚙️ % configurações definidas', (SELECT COUNT(*) FROM FORUM_SETTINGS);
END $$;