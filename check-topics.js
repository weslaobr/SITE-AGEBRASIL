const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTopics() {
    let client;
    try {
        console.log('🔍 Verificando tópicos no PostgreSQL...\n');
        client = await pool.connect();

        // Verificar tópicos
        const topics = await client.query(`
            SELECT 
                t.id,
                t.title,
                t.author_name,
                t.author_discord_id,
                c.name as category_name,
                t.created_at,
                t.views
            FROM forum_topics t
            JOIN forum_categories c ON t.category_id = c.id
            ORDER BY t.created_at DESC
            LIMIT 10
        `);

        console.log('📝 TÓPICOS NO BANCO DE DADOS:');
        console.log('================================');

        if (topics.rows.length === 0) {
            console.log('❌ Nenhum tópico encontrado no PostgreSQL');
        } else {
            topics.rows.forEach((topic, index) => {
                console.log(`${index + 1}. "${topic.title}"`);
                console.log(`   👤 Autor: ${topic.author_name} (${topic.author_discord_id})`);
                console.log(`   📂 Categoria: ${topic.category_name}`);
                console.log(`   📅 Data: ${topic.created_at}`);
                console.log(`   👀 Views: ${topic.views}`);
                console.log('--------------------------------');
            });
        }

        // Verificar respostas
        const replies = await client.query(`
            SELECT COUNT(*) as total_replies FROM forum_replies
        `);

        console.log(`\n💬 TOTAL DE RESPOSTAS: ${replies.rows[0].total_replies}`);

    } catch (error) {
        console.error('❌ Erro ao verificar tópicos:', error.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

checkTopics();