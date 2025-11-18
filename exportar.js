const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'mainline.proxy.rlwy.net',
  port: 27194,
  database: 'railway',
  user: 'postgres',
  password: 'ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW',
  ssl: { rejectUnauthorized: false }
});

async function exportar() {
  await client.connect();
  
  // Listar tabelas
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  
  console.log('Tabelas:');
  for (let table of tables.rows) {
    console.log(`- ${table.table_name}`);
    
    // Exportar dados
    const data = await client.query(`SELECT * FROM ${table.table_name}`);
    fs.writeFileSync(`${table.table_name}.json`, JSON.stringify(data.rows, null, 2));
  }
  
  await client.end();
  console.log('Exportação concluída!');
}

exportar();