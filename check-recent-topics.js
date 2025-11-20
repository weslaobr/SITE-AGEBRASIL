const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkRecentTopics() {
    let client;
    try {
        console.log('🔍 VERIFICANDO TÓPICOS RECENTES NO POSTGRESQL\n');
        client = await pool.connect();

        // 1. Verificar últimos tópicos inseridos
        console.log('📝 ÚLTIMOS 10 TÓPICOS:');
        const topics = await client.query(`
            SELECT 
                id,
                title,
                author_name,
                author_discord_id,
                category_id,
                created_at,
                views,
                is_pinned,
                is_locked
            FROM forum_topics 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        if (topics.rows.length === 0) {
            console.log('   ❌ NENHUM TÓPICO ENCONTRADO');
        } else {
            topics.rows.forEach((topic, index) => {
                console.log(`   ${index + 1}. ID: ${topic.id}`);
                console.log(`      Título: "${topic.title}"`);
                console.log(`      Autor: ${topic.author_name} (${topic.author_discord_id})`);
                console.log(`      Categoria: ${topic.category_id}`);
                console.log(`      Criado: ${topic.created_at}`);
                console.log(`      Views: ${topic.views} | Fixado: ${topic.is_pinned} | Bloqueado: ${topic.is_locked}`);
                console.log('   ──────────────────────────────────────────');
            });
        }

        // 2. Verificar contagem por categoria
        console.log('\n📊 TÓPICOS POR CATEGORIA:');
        const categoryStats = await client.query(`
            SELECT 
                c.name as categoria,
                COUNT(t.id) as total_topicos
            FROM forum_categories c
            LEFT JOIN forum_topics t ON c.id = t.category_id
            GROUP BY c.id, c.name
            ORDER BY c.id
        `);

        categoryStats.rows.forEach(stat => {
            console.log(`   📂 ${stat.categoria}: ${stat.total_topicos} tópicos`);
        });

        // 3. Verificar última atividade
        console.log('\n🕒 ÚLTIMA ATIVIDADE:');
        const lastActivity = await client.query(`
            SELECT 
                MAX(created_at) as ultimo_topico,
                MAX(updated_at) as ultima_atualizacao
            FROM forum_topics
        `);

        console.log(`   📝 Último tópico: ${lastActivity.rows[0].ultimo_topico || 'Nenhum'}`);
        console.log(`   🔄 Última atualização: ${lastActivity.rows[0].ultima_atualizacao || 'Nenhuma'}`);

    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

checkRecentTopics();