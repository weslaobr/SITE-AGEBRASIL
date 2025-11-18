const { Client } = require('pg');
const fs = require('fs');

// Configuração de conexão
const client = new Client({
    host: 'mainline.proxy.rlwy.net',
    port: 27194,
    database: 'railway',
    user: 'postgres',
    password: 'ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW',
    ssl: { rejectUnauthorized: false }
});

async function fazerBackup() {
    try {
        console.log('Conectando ao banco de dados...');
        await client.connect();
        
        // Listar todas as tabelas
        console.log('Buscando lista de tabelas...');
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        const tabelas = result.rows;
        console.log(`\n📊 Encontradas ${tabelas.length} tabelas:`);
        
        // Criar pasta de backup
        const pastaBackup = `backup_${new Date().toISOString().split('T')[0]}`;
        if (!fs.existsSync(pastaBackup)) {
            fs.mkdirSync(pastaBackup);
        }
        
        // Exportar cada tabela
        for (const tabela of tabelas) {
            const nomeTabela = tabela.table_name;
            console.log(`\n📁 Exportando: ${nomeTabela}`);
            
            try {
                // Buscar dados da tabela
                const dados = await client.query(`SELECT * FROM "${nomeTabela}"`);
                
                // Salvar como JSON
                fs.writeFileSync(
                    `${pastaBackup}/${nomeTabela}.json`,
                    JSON.stringify(dados.rows, null, 2)
                );
                
                // Salvar como CSV
                if (dados.rows.length > 0) {
                    const cabecalhos = Object.keys(dados.rows[0]).join(',');
                    const linhas = dados.rows.map(row => 
                        Object.values(row).map(val => 
                            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
                        ).join(',')
                    ).join('\n');
                    
                    fs.writeFileSync(
                        `${pastaBackup}/${nomeTabela}.csv`,
                        `${cabecalhos}\n${linhas}`
                    );
                }
                
                console.log(`✅ ${nomeTabela}: ${dados.rows.length} registros exportados`);
                
            } catch (erro) {
                console.log(`❌ Erro em ${nomeTabela}:`, erro.message);
            }
        }
        
        // Salvar metadados
        const metadados = {
            dataExportacao: new Date().toISOString(),
            totalTabelas: tabelas.length,
            tabelas: tabelas.map(t => t.table_name)
        };
        
        fs.writeFileSync(
            `${pastaBackup}/_metadados.json`,
            JSON.stringify(metadados, null, 2)
        );
        
        console.log(`\n🎉 Backup concluído! Verifique a pasta: ${pastaBackup}`);
        
    } catch (erro) {
        console.error('❌ Erro durante o backup:', erro);
    } finally {
        await client.end();
        console.log('Conexão encerrada.');
    }
}

// Executar o backup
fazerBackup();