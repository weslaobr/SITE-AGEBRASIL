import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    // Extrair clanId da URL
    const url = new URL(request.url);
    const pathname = url.pathname;
    const pathSegments = pathname.split('/').filter(segment => segment !== '');
    const clansIndex = pathSegments.indexOf('clans');
    
    if (clansIndex === -1 || clansIndex + 1 >= pathSegments.length) {
      return NextResponse.json(
        { success: false, error: 'URL inválida' },
        { status: 400 }
      );
    }
    
    const clanId = parseInt(pathSegments[clansIndex + 1]);

    if (isNaN(clanId)) {
      return NextResponse.json(
        { success: false, error: 'ID do clan inválido' },
        { status: 400 }
      );
    }

    console.log(`\n👥 API CLAN MEMBERS - Buscando membros do clan ${clanId}`);

    // 🔥 AGORA O getClanMembers JÁ RETORNA DADOS COMPLETOS
    const members = await database.getClanMembers(clanId);
    
    // Ordenar por pontos (maior primeiro) e adicionar role
    const sortedMembers = members
      .map(member => ({
        ...member,
        role: member.is_owner ? 'Líder' : 'Membro'
      }))
      .sort((a, b) => b.points - a.points);

    console.log(`✅ ${sortedMembers.length} membros retornados para clan ${clanId}`);

    return NextResponse.json({
      success: true,
      members: sortedMembers,
      stats: {
        total: sortedMembers.length,
        with_data: sortedMembers.filter(m => m.hasValidData).length,
        average_elo: sortedMembers.filter(m => m.hasValidData).length > 0 ? 
          Math.round(sortedMembers.filter(m => m.hasValidData).reduce((sum, m) => sum + m.elo, 0) / sortedMembers.filter(m => m.hasValidData).length) : 0,
        total_points: sortedMembers.filter(m => m.hasValidData).reduce((sum, m) => sum + m.points, 0)
      },
      metadata: {
        clanId,
        timestamp: new Date().toISOString(),
        source: "aoe4world_api"
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO NA API CLAN MEMBERS:', error.message);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao buscar membros do clan',
        details: error.message
      },
      { status: 500 }
    );
  }
}