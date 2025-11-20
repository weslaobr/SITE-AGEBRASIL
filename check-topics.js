// test-api-create.js - VERSÃO SEM node-fetch
const https = require('https');
const http = require('http');

async function testAPICreate() {
    try {
        console.log('🧪 TESTANDO CRIAÇÃO DE TÓPICO VIA API\n');

        const testData = {
            category_id: 1, // Estratégias e Dicas
            title: 'TÓPICO TESTE - ' + Date.now(),
            content: 'Este é um tópico de teste criado via API',
            author_discord_id: 'test_user_123',
            author_name: 'Usuário Teste API',
            author_avatar: null
        };

        console.log('📤 Enviando dados:', testData);

        const data = JSON.stringify(testData);

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/forum/topics',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            console.log('📥 Status:', res.statusCode);
            console.log('📥 Status Message:', res.statusMessage);

            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    if (res.statusCode === 201) {
                        const result = JSON.parse(responseData);
                        console.log('✅ SUCESSO! Tópico criado:');
                        console.log('   ID:', result.id);
                        console.log('   Título:', result.title);
                        console.log('   Autor:', result.author_name);
                        console.log('   Categoria:', result.category_id);
                        console.log('   Criado em:', result.created_at);
                    } else {
                        console.log('❌ ERRO:', responseData);
                    }
                } catch (error) {
                    console.log('❌ Erro ao parsear resposta:', error.message);
                    console.log('Resposta bruta:', responseData);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Erro na requisição:', error.message);
        });

        req.write(data);
        req.end();

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testAPICreate();