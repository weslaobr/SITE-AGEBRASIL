// Sistema de debug para identificar problemas
console.log('🐛 Iniciando debug...');

// Testar conexão com o backend
async function testBackendConnection() {
    try {
        console.log('🔍 Testando conexão com backend...');
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        console.log('✅ Backend conectado:', data);
        return true;
    } catch (error) {
        console.error('❌ Backend offline:', error);
        return false;
    }
}

// Testar API de players
async function testPlayersAPI() {
    try {
        console.log('🔍 Testando API de players...');
        const response = await fetch('http://localhost:3001/api/players?page=1&limit=5');
        const data = await response.json();
        console.log('✅ API Players:', data);
        return data;
    } catch (error) {
        console.error('❌ API Players falhou:', error);
        return null;
    }
}

// Testar API de seasons
async function testSeasonsAPI() {
    try {
        console.log('🔍 Testando API de seasons...');
        const response = await fetch('http://localhost:3001/api/seasons');
        const data = await response.json();
        console.log('✅ API Seasons:', data);
        return data;
    } catch (error) {
        console.error('❌ API Seasons falhou:', error);
        return null;
    }
}

// Verificar se apiService está funcionando
function testApiService() {
    console.log('🔍 Verificando apiService...');
    if (typeof window.apiService === 'undefined') {
        console.error('❌ apiService não está definido!');
        return false;
    }
    
    console.log('✅ apiService disponível:', window.apiService);
    return true;
}

// Executar todos os testes
async function runAllTests() {
    console.log('🧪 Executando testes de diagnóstico...');
    
    const tests = [
        await testBackendConnection(),
        await testPlayersAPI(),
        await testSeasonsAPI(),
        testApiService()
    ];
    
    const passedTests = tests.filter(test => test).length;
    console.log(`📊 Resultado: ${passedTests}/${tests.length} testes passaram`);
    
    return passedTests === tests.length;
}

// Executar automaticamente quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        runAllTests();
    }, 1000);
});