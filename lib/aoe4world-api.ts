export interface AoE4WorldTournament {
  id: number;
  name: string;
  description?: string;
  url: string;
  start_at: string;
  end_at: string;
  registration_ends_at?: string;
  participants_count: number;
  participants_max?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  prize_pool?: string;
  organization?: string;
  website_url?: string;
  discord_url?: string;
  brackets_url?: string;
  liquipedia_url?: string;
  platforms: string[];
  game_versions: string[];
  type: string;
  ruleset: string;
}

export async function getLeaderboardData() {
  const res = await fetch("https://aoe4world.com/api/leaderboard/rm_1v1?count=100");
  if (!res.ok) throw new Error("Erro ao buscar leaderboard AOE4World");
  
  const data = await res.json();
  return data.leaderboard || [];
}

export interface AoE4WorldApiResponse {
  tournaments: AoE4WorldTournament[];
  total: number;
}

class AoE4WorldAPI {
  private baseUrl = 'https://aoe4world.com/api/v0';

  async getTournaments(params?: {
    status?: 'upcoming' | 'ongoing' | 'completed';
    limit?: number;
    offset?: number;
  }): Promise<AoE4WorldTournament[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.status) {
        queryParams.append('status', params.status);
      }
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const response = await fetch(
        `${this.baseUrl}/tournaments?${queryParams}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ACEBRASIL/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: AoE4WorldApiResponse = await response.json();
      return data.tournaments;
    } catch (error) {
      console.error('Error fetching tournaments from AoE4World:', error);
      return [];
    }
  }

  async getTournamentById(id: number): Promise<AoE4WorldTournament | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tournaments/${id}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ACEBRASIL/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching tournament ${id}:`, error);
      return null;
    }
  }

  // Converter dados do AoE4World para nosso formato
  convertToOurFormat(tournaments: AoE4WorldTournament[]): any[] {
    return tournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      organizer: tournament.organization || 'AoE4 World',
      game: 'Age of Empires IV',
      format: this.mapTournamentType(tournament.type),
      prize: tournament.prize_pool || 'A confirmar',
      participants: tournament.participants_max || tournament.participants_count,
      registered: tournament.participants_count,
      start_date: tournament.start_at.split('T')[0],
      end_date: tournament.end_at.split('T')[0],
      status: this.mapStatus(tournament.status),
      bracket_url: tournament.brackets_url,
      registration_url: tournament.website_url,
      discord_url: tournament.discord_url,
      vod_url: tournament.liquipedia_url,
      thumbnail: this.generateThumbnail(tournament),
      featured: this.isFeatured(tournament)
    }));
  }

  private mapStatus(status: string): 'active' | 'upcoming' | 'completed' {
    const statusMap = {
      'ongoing': 'active',
      'upcoming': 'upcoming', 
      'completed': 'completed'
    };
    return statusMap[status as keyof typeof statusMap] || 'upcoming';
  }

  private mapTournamentType(type: string): string {
    const typeMap: { [key: string]: string } = {
      '1v1': '1v1 Elimination',
      '2v2': '2v2 Teams',
      '3v3': '3v3 Teams',
      '4v4': '4v4 Teams',
      'round_robin': 'Round Robin',
      'swiss': 'Swiss System',
      'double_elimination': 'Eliminação Dupla',
      'single_elimination': 'Eliminação Simples'
    };
    return typeMap[type] || type;
  }

  private generateThumbnail(tournament: AoE4WorldTournament): string {
    // Placeholder - você pode usar thumbnails personalizadas
    // ou tentar extrair de liquipedia/discord
    return `/tournaments/aoe4world-${tournament.id}.jpg`;
  }

  private isFeatured(tournament: AoE4WorldTournament): boolean {
    // Torneios com mais participantes ou prize pool são destacados
    return tournament.participants_count > 50 || 
           (tournament.prize_pool && parseInt(tournament.prize_pool) > 1000);
  }
}

export const aoe4WorldAPI = new AoE4WorldAPI();