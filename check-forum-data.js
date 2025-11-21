import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function checkDatabase() {
    const client = await pool.connect();
    try {
        console.log('🔍 Verificando dados no banco...\n');

        // Verificar categorias
        const categories = await client.query('SELECT COUNT(*) FROM forum_categories');
        console.log(`📁 Categorias: ${categories.rows[0].count}`);

        if (parseInt(categories.rows[0].count) > 0) {
            const catList = await client.query('SELECT id, name, slug FROM forum_categories LIMIT 5');
            console.log('   Exemplos:');
            catList.rows.forEach(cat => {
                console.log(`   - ${cat.id}: ${cat.name} (${cat.slug})`);
            });
        }

        // Verificar tópicos
        const topics = await client.query('SELECT COUNT(*) FROM forum_topics');
        console.log(`\n📝 Tópicos: ${topics.rows[0].count}`);

        if (parseInt(topics.rows[0].count) > 0) {
            const topicList = await client.query('SELECT id, title, category_id FROM forum_topics LIMIT 5');
            console.log('   Exemplos:');
            topicList.rows.forEach(topic => {
                console.log(`   - ${topic.id}: ${topic.title} (categoria ${topic.category_id})`);
            });
        }

        // Verificar respostas
        const replies = await client.query('SELECT COUNT(*) FROM forum_replies');
        console.log(`\n💬 Respostas: ${replies.rows[0].count}`);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDatabase();
