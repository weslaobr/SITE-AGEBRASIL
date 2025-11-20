const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Iniciando criação das tabelas do fórum...');
console.log('📁 Diretório atual:', __dirname);

// Configuração do banco de dados
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    max: 20
};

console.log('🔗 String de conexão:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada');

const pool = new Pool(poolConfig);

// SQL direto no arquivo para evitar problemas com leitura de arquivo
const SQL_SCRIPT = `
-- =============================================
-- CRIAÇÃO DAS TABELAS DO FÓRUM
-- =============================================

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS forum_categories (
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

-- Tabela de Tópicos
CREATE TABLE IF NOT EXISTS forum_topics (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES forum_categories(id) ON DELETE CASCADE,
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

-- Tabela de Respostas
CREATE TABLE IF NOT EXISTS forum_replies (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_discord_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(100),
    reply_to INTEGER REFERENCES forum_replies(id) ON DELETE SET NULL,
    likes INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    last_edited_by VARCHAR(100),
    last_edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Administradores
CREATE TABLE IF NOT EXISTS forum_admins (
    id SERIAL PRIMARY KEY,
    discord_user_id VARCHAR(50) UNIQUE NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{"manage_topics": true, "manage_replies": true, "manage_categories": true}',
    added_by VARCHAR(50),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Tabela de Logs de Moderação
CREATE TABLE IF NOT EXISTS forum_mod_logs (
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
CREATE TABLE IF NOT EXISTS forum_user_stats (
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

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS forum_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON forum_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_author ON forum_topics(author_discord_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned ON forum_topics(is_pinned, last_reply_at);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_discord_id);

CREATE INDEX IF NOT EXISTS idx_forum_admins_user ON forum_admins(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_forum_user_stats_user ON forum_user_stats(discord_user_id);

-- =============================================
-- DADOS INICIAIS
-- =============================================

INSERT INTO forum_categories (name, slug, description, icon, color, display_order) VALUES
('Estratégias e Dicas', 'estrategias-dicas', 'Compartilhe e aprenda estratégias avançadas', 'fas fa-chess', '#3e8ce5', 1),
('Discussões Gerais', 'discussoes-gerais', 'Conversas sobre Age of Empires IV', 'fas fa-comments', '#48bb78', 2),
('Multiplayer', 'multiplayer', 'Partidas, ranks e competições', 'fas fa-users', '#e53e3e', 3),
('Civilizações', 'civilizacoes', 'Discussões sobre as civilizações', 'fas fa-landmark', '#9f7aea', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO forum_settings (setting_key, setting_value, description) VALUES
('forum_name', '"Age of Empires IV Brasil - Fórum"', 'Nome do fórum'),
('posts_per_page', '20', 'Número de posts por página'),
('allow_registrations', 'true', 'Permitir novos registros'),
('maintenance_mode', 'false', 'Modo manutenção')
ON CONFLICT (setting_key) DO NOTHING;
`;

async function createForumTables() {
    let client;
    try {
        console.log('🔗 Conectando ao banco de dados...');
        client = await pool.connect();

        console.log('📦 Executando script SQL...');

        // Executar o script SQL completo
        await client.query(SQL_SCRIPT);

        console.log('✅ Todas as tabelas do fórum foram criadas com sucesso!');
        console.log('📊 Estrutura criada:');
        console.log('   • forum_categories');
        console.log('   • forum_topics');
        console.log('   • forum_replies');
        console.log('   • forum_admins');
        console.log('   • forum_mod_logs');
        console.log('   • forum_user_stats');
        console.log('   • forum_settings');
        console.log('');
        console.log('🎯 Dados iniciais inseridos:');
        console.log('   • 4 categorias padrão');
        console.log('   • Configurações do fórum');

    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error.message);
        console.error('📋 Detalhes:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        console.log('🔌 Conexão com o banco encerrada.');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createForumTables();
}

module.exports = { createForumTables };