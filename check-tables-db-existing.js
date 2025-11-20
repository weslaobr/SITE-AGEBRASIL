import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const result = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

        let currentTable = "";
        console.log("\n📌 RESUMO DAS TABELAS E COLUNAS\n");

        result.rows.forEach(row => {
            if (row.table_name !== currentTable) {
                currentTable = row.table_name;
                console.log(`\n🗂 Tabela: ${currentTable}`);
            }
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });

        pool.end();
    } catch (err) {
        console.error("Erro:", err);
        pool.end();
    }
}

run();
