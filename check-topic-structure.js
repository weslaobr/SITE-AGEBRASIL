import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function checkTopicStructure() {
    const client = await pool.connect();
    try {
        console.log('🔍 Verificando estrutura do tópico 8...\n');

        const topic = await client.query(`
            SELECT t.*, c.name AS category_name, c.slug AS category_slug
            FROM forum_topics t
            JOIN forum_categories c ON t.category_id = c.id
            WHERE t.id = $1
        `, [8]);

        if (topic.rows.length === 0) {
            console.log('❌ Tópico 8 não encontrado!');
            return;
        }

        console.log('📝 Dados do tópico:');
        console.log(JSON.stringify(topic.rows[0], null, 2));

        const replies = await client.query(`
            SELECT * FROM forum_replies
            WHERE topic_id = $1
            ORDER BY created_at ASC
        `, [8]);

        console.log(`\n💬 Respostas: ${replies.rows.length}`);
        if (replies.rows.length > 0) {
            console.log(JSON.stringify(replies.rows[0], null, 2));
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTopicStructure();
