// check-db.js — Roda com node check-db.js e gera database-structure.txt

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabase() {
    const client = await pool.connect();

    try {
        console.log('Conectado ao banco! Listando tabelas...\n');

        // 1. Lista todas as tabelas
        const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

        let output = `=== ESTRUTURA DO BANCO DE DADOS ===\n`;
        output += `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\n`;
        output += `Total de tabelas encontradas: ${tablesRes.rows.length}\n\n`;

        if (tablesRes.rows.length === 0) {
            output += "NENHUMA TABELA ENCONTRADA NO SCHEMA 'public'\n";
        }

        // 2. Para cada tabela, pega as colunas
        for (const row of tablesRes.rows) {
            const tableName = row.tablename;
            output += `TABELA: ${tableName}\n`;
            output += `${'='.repeat(Math.min(tableName.length + 8, 50))}\n`;

            const columnsRes = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

            if (columnsRes.rows.length === 0) {
                output += "   (sem colunas ou tabela vazia)\n\n";
                continue;
            }

            for (const col of columnsRes.rows) {
                output += `   • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)}`;
                if (col.character_maximum_length) output += `(${col.character_maximum_length})`;
                if (col.is_nullable === 'NO') output += ` NOT NULL`;
                if (col.column_default) output += ` DEFAULT ${col.column_default}`;
                output += `\n`;
            }
            output += `\n`;
        }

        // Salva no arquivo
        fs.writeFileSync('database-structure.txt', output);
        console.log('Tudo pronto!');
        console.log('Arquivo gerado: database-structure.txt');
        console.log('\nPrimeiras linhas:\n');
        console.log(output.split('\n').slice(0, 15).join('\n'));

    } catch (err) {
        console.error('Erro ao conectar ou consultar o banco:', err.message);
        console.error(err.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDatabase();