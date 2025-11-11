interface AoE4WorldTournament {
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

export interface MappedTournament {
  id: number;
  name: string;
  organizer: string;
  game: string;
  format: string;
  prize: string;
  participants: number;
  registered: number;
  winner?: string;
  runner_up?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'upcoming' | 'completed';
  bracket_url?: string;
  registration_url?: string;
  discord_url?: string;
  vod_url?: string;
  thumbnail?: string;
  featured?: boolean;
}

// Mapeamento de organizadores conhecidos
const ORGANIZER_MAP: { [key: string]: string } = {
  'aoe4world': 'AoE4 World',
  'aoe4_com': 'Age of Empires IV',
  'weslao': 'WESLAO',
  'redbull': 'Red Bull',
  'esl': 'ESL',
  'nacl': 'NACL',
  'egctv': 'EGCTV',
  'boomtv': 'Boom TV'
};

// Torneios que queremos destacar
const FEATURED_TOURNAMENTS = [
  'red bull',
  'esl',
  'world championship',
  'masters',
  'grand final',
  'premier'
];

export class TournamentMapper {
  static mapFromAoE4World(tournaments: AoE4WorldTournament[]): MappedTournament[] {
    return tournaments.map(tournament => {
      const organizer = this.mapOrganizer(tournament.organization || tournament.name);
      const isFeatured = this.isFeaturedTournament(tournament.name, organizer);
      
      return {
        id: tournament.id,
        name: this.cleanTournamentName(tournament.name),
        organizer: organizer,
        game: 'Age of Empires IV',
        format: this.mapTournamentFormat(tournament.type),
        prize: this.mapPrizePool(tournament.prize_pool),
        participants: tournament.participants_max || tournament.participants_count || 0,
        registered: tournament.participants_count || 0,
        start_date: tournament.start_at,
        end_date: tournament.end_at,
        status: this.mapStatus(tournament.status),
        bracket_url: tournament.brackets_url,
        registration_url: tournament.website_url || tournament.url,
        discord_url: tournament.discord_url,
        vod_url: tournament.liquipedia_url,
        thumbnail: this.generateThumbnail(tournament),
        featured: isFeatured
      };
    });
  }

  private static mapOrganizer(organizer: string): string {
    if (!organizer) return 'Comunidade AOE4';
    
    const lowerOrganizer = organizer.toLowerCase();
    
    // Procura por correspondências conhecidas
    for (const [key, value] of Object.entries(ORGANIZER_MAP)) {
      if (lowerOrganizer.includes(key)) {
        return value;
      }
    }
    
    // Tenta extrair o organizador do nome do torneio
    if (lowerOrganizer.includes('weslao')) return 'WESLAO';
    if (lowerOrganizer.includes('red bull')) return 'Red Bull';
    if (lowerOrganizer.includes('esl')) return 'ESL';
    if (lowerOrganizer.includes('nacl')) return 'NACL';
    
    // Capitaliza palavras se for um nome simples
    return organizer.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private static cleanTournamentName(name: string): string {
    if (!name) return 'Torneio Sem Nome';
    
    // Remove termos redundantes
    let cleaned = name
      .replace(/\[AOE4\]/gi, '')
      .replace(/Age of Empires IV/gi, '')
      .replace(/AOE4/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitaliza a primeira letra de cada palavra (exceto preposições)
    const smallWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'com'];
    cleaned = cleaned.split(' ')
      .map((word, index) => {
        if (index > 0 && smallWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
    
    return cleaned;
  }

  private static mapTournamentFormat(type: string): string {
    const formatMap: { [key: string]: string } = {
      '1v1': '1v1 Elimination',
      '2v2': '2v2 Teams',
      '3v3': '3v3 Teams',
      '4v4': '4v4 Teams',
      'round_robin': 'Round Robin',
      'swiss': 'Swiss System',
      'double_elimination': 'Eliminação Dupla',
      'single_elimination': 'Eliminação Simples',
      'group_stage': 'Fase de Grupos',
      'qualifier': 'Qualificatória'
    };
    
    return formatMap[type] || type || 'Eliminação Simples';
  }

  private static mapPrizePool(prizePool?: string): string {
    if (!prizePool) return 'A confirmar';
    
    // Tenta converter para formato brasileiro
    const numericMatch = prizePool.match(/\$?(\d+(?:,\d+)?)/);
    if (numericMatch) {
      const amount = parseFloat(numericMatch[1].replace(',', ''));
      if (!isNaN(amount)) {
        return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
    }
    
    return prizePool;
  }

  private static mapStatus(status: string): 'active' | 'upcoming' | 'completed' {
    const statusMap = {
      'ongoing': 'active',
      'upcoming': 'upcoming', 
      'completed': 'completed',
      'registration': 'upcoming'
    };
    
    return statusMap[status as keyof typeof statusMap] || 'upcoming';
  }

  private static generateThumbnail(tournament: AoE4WorldTournament): string {
    // Thumbnails baseadas no organizador
    const organizer = tournament.organization?.toLowerCase() || '';
    
    if (organizer.includes('red bull')) return '/tournaments/redbull.jpg';
    if (organizer.includes('esl')) return '/tournaments/esl.jpg';
    if (organizer.includes('weslao')) return '/tournaments/weslao.jpg';
    if (organizer.includes('nacl')) return '/tournaments/nacl.jpg';
    
    return '/tournaments/default-tournament.jpg';
  }

  private static isFeaturedTournament(name: string, organizer: string): boolean {
    const lowerName = name.toLowerCase();
    const lowerOrganizer = organizer.toLowerCase();
    
    return FEATURED_TOURNAMENTS.some(term => 
      lowerName.includes(term) || lowerOrganizer.includes(term)
    );
  }

  // Ordenar torneios por data (mais recentes primeiro para completed, mais próximos primeiro para upcoming)
  static sortTournaments(tournaments: MappedTournament[], status: 'active' | 'upcoming' | 'completed'): MappedTournament[] {
    const sorted = [...tournaments].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      
      if (status === 'completed') {
        // Mais recentes primeiro
        return dateB - dateA;
      } else {
        // Mais próximos primeiro
        return dateA - dateB;
      }
    });
    
    // Featured primeiro
    return sorted.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }
}