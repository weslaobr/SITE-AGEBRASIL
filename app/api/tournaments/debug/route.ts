import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Iniciando teste de APIs...');
    
    const testResults = [];

    // Testar AoE4World API
    try {
      console.log('📡 Testando AoE4World API...');
      const aoe4Response = await fetch('https://aoe4world.com/api/v0/tournaments?limit=3', {
        signal: AbortSignal.timeout(8000)
      });
      
      testResults.push({
        name: 'AoE4World API',
        url: 'https://aoe4world.com/api/v0/tournaments',
        status: aoe4Response.status,
        ok: aoe4Response.ok,
        contentType: aoe4Response.headers.get('content-type')
      });
      
      if (aoe4Response.ok) {
        const data = await aoe4Response.json();
        testResults[testResults.length - 1].data = {
          total_tournaments: data.tournaments?.length || 0,
          sample: data.tournaments?.slice(0, 2) || []
        };
      }
    } catch (error) {
      testResults.push({
        name: 'AoE4World API',
        url: 'https://aoe4world.com/api/v0/tournaments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Testar Liquipedia
    try {
      console.log('📡 Testando Liquipedia...');
      const liquipediaResponse = await fetch('https://liquipedia.net/ageofempires/Age_of_Empires_IV/Tournaments', {
        signal: AbortSignal.timeout(8000)
      });
      
      testResults.push({
        name: 'Liquipedia Page',
        url: 'https://liquipedia.net/ageofempires/Age_of_Empires_IV/Tournaments',
        status: liquipediaResponse.status,
        ok: liquipediaResponse.ok,
        contentType: liquipediaResponse.headers.get('content-type')
      });
    } catch (error) {
      testResults.push({
        name: 'Liquipedia Page',
        url: 'https://liquipedia.net/ageofempires/Age_of_Empires_IV/Tournaments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    console.log('✅ Testes completos');
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests: testResults,
      summary: {
        total_tests: testResults.length,
        successful: testResults.filter(t => t.ok).length,
        failed: testResults.filter(t => !t.ok || t.error).length
      }
    });

  } catch (error) {
    console.error('❌ Erro no debug:', error);
    return NextResponse.json({
      error: 'Debug completo falhou',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}