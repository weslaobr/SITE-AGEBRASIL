import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function fixCategorySlugs() {
    const client = await pool.connect();
    try {
        console.log('🔧 Corrigindo slugs das categorias...\n');

        // Atualizar slug de "estrategias-dicas" para "estrategias"
        const result = await client.query(`
            UPDATE forum_categories 
            SET slug = 'estrategias' 
            WHERE slug = 'estrategias-dicas'
            RETURNING id, name, slug
        `);

        if (result.rows.length > 0) {
            console.log('✅ Slug atualizado:');
            result.rows.forEach(cat => {
                console.log(`   ${cat.id}: ${cat.name} → ${cat.slug}`);
            });
        } else {
            console.log('⚠️ Nenhuma categoria encontrada com slug "estrategias-dicas"');
        }

        // Mostrar todas as categorias atualizadas
        const allCats = await client.query('SELECT id, name, slug FROM forum_categories ORDER BY id');
        console.log('\n📁 Categorias atuais:');
        allCats.rows.forEach(cat => {
            console.log(`   ${cat.id}: ${cat.name} (${cat.slug})`);
        });

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixCategorySlugs();
