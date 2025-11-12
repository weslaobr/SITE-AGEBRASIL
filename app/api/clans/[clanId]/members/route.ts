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

    // 🔥 Busca os membros do banco de dados
    const members = await database.getClanMembers(clanId);

    // 🔄 Ordenar por pontos e definir papel (Líder / Membro)
    const sortedMembers = members
      .map((member: any) => ({
        ...member,
        role: member.is_owner ? 'Líder' : 'Membro'
      }))
      .sort((a, b) => b.points - a.points);

    console.log(`✅ ${sortedMembers.length} membros retornados para clan ${clanId}`);

    // 📊 Estatísticas agregadas
    const validMembers = sortedMembers.filter(m => m.hasValidData);
    const totalValid = validMembers.length;

    const stats = {
      total: sortedMembers.length,
      with_data: totalValid,
      average_elo: totalValid > 0
        ? Math.round(validMembers.reduce((sum, m) => sum + m.elo, 0) / totalValid)
        : 0,
      total_points: validMembers.reduce((sum, m) => sum + m.points, 0)
    };

    // ✅ Retorno final
    return NextResponse.json({
      success: true,
      members: sortedMembers,
      stats,
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
