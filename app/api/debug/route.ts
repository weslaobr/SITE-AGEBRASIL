// app/api/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 INICIANDO DEBUG...');
    
    // Testar conexão com o banco
    let dbTest = '✅ OK';
    try {
      const testResult = await new Promise((resolve, reject) => {
        database.db.get('SELECT 1 as test', [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      console.log('✅ Teste do banco:', testResult);
    } catch (dbError) {
      dbTest = `❌ Erro: ${dbError}`;
      console.error('❌ Erro no banco:', dbError);
    }

    // Testar API AOE4 World
    let apiTest = '✅ OK';
    try {
      const response = await fetch('https://aoe4world.com/api/v0/players/123');
      apiTest = `✅ Status: ${response.status}`;
      console.log('✅ Teste API AOE4:', response.status);
    } catch (apiError) {
      apiTest = `❌ Erro: ${apiError}`;
      console.error('❌ Erro na API:', apiError);
    }

    // Testar temporadas
    let seasonsTest = '✅ OK';
    let seasonsData = [];
    try {
      seasonsData = await database.getSeasons();
      console.log('✅ Temporadas:', seasonsData.length);
    } catch (seasonsError) {
      seasonsTest = `❌ Erro: ${seasonsError}`;
      console.error('❌ Erro nas temporadas:', seasonsError);
    }

    return NextResponse.json({
      status: 'Debug completo',
      tests: {
        database: dbTest,
        aoe4_api: apiTest,
        seasons: seasonsTest
      },
      seasons_count: seasonsData.length,
      seasons_sample: seasonsData.slice(0, 3),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ ERRO NO DEBUG:', error);
    return NextResponse.json({
      status: 'Erro no debug',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}