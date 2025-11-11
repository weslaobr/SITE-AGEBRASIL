// app/api/players/route.ts - VERSÃO 100% CORRIGIDA
import { NextResponse } from 'next/server';
import { database } from '../../../lib/database';

export async function GET() {
  try {
    // CHAMADA SEM PARÂMETROS
    const players = await database.getLeaderboardData();
    
    return NextResponse.json({
      success: true,
      data: players,
      count: players.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro na API players:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}