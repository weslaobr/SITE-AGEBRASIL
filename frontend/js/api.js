// Serviço para comunicação com a API
class ApiService {
    constructor() {
        this.baseURL = '/api';
        this.currentPage = 1;
        this.playersPerPage = 25;
        this.currentSeason = 'current';
        this.currentMode = 'rm_solo';
    }

    async getPlayers(page = 1, limit = 25, season = 'current', mode = 'rm_solo') {
        try {
            console.log(`🎮 [API] Buscando players - Página ${page}, Season: ${season}, Modo: ${mode}...`);

            const url = `${this.baseURL}/players?page=${page}&limit=${limit}&season=${season}&mode=${mode}`;
            console.log(`🔗 URL: ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log(`✅ [API] ${data.players.length} players carregados (Página ${data.pagination.current_page})`);

                this.currentPage = data.pagination.current_page;
                this.currentSeason = season;
                this.currentMode = mode;
                return data;
            } else {
                throw new Error(data.error || 'Erro na API');
            }

        } catch (error) {
            console.error('❌ [API] Erro ao carregar players:', error);
            console.log('🔄 [API] Usando dados mock como fallback...');
            return this.getMockPlayersPaginated(page, limit);
        }
    }

    async getSeasons() {
        try {
            console.log('🔄 [API] Buscando temporadas...');
            const response = await fetch(`${this.baseURL}/seasons`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log(`✅ [API] ${data.seasons.length} temporadas carregadas`);
                return data.seasons;
            } else {
                throw new Error(data.error || 'Erro ao carregar temporadas');
            }

        } catch (error) {
            console.error('❌ [API] Erro ao carregar temporadas:', error);
            return this.getFallbackSeasons();
        }
    }

    async getGameModes() {
        try {
            console.log('🔄 [API] Buscando modos de jogo...');
            const response = await fetch(`${this.baseURL}/game-modes`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log(`✅ [API] ${data.game_modes.length} modos de jogo carregados`);
                return data.game_modes;
            } else {
                throw new Error(data.error || 'Erro ao carregar modos de jogo');
            }

        } catch (error) {
            console.error('❌ [API] Erro ao carregar modos de jogo:', error);
            return this.getFallbackGameModes();
        }
    }

    async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats/detailed`);
            const data = await response.json();
            return data.success ? data.stats : null;
        } catch (error) {
            console.error('[API] Erro ao carregar estatísticas:', error);
            return null;
        }
    }

    async getPlayerDetails(playerId) {
        try {
            const response = await fetch(`${this.baseURL}/players/${playerId}/details`);
            const data = await response.json();
            return data.success ? data.player : null;
        } catch (error) {
            console.error('[API] Erro ao carregar detalhes do player:', error);
            return null;
        }
    }

    getFallbackSeasons() {
        return [
            { id: 12, name: 'Season 12', kind: 'ranked', status: 'ongoing' },
            { id: 11, name: 'Season 11', kind: 'ranked', status: 'finished' },
            { id: 10, name: 'Season 10', kind: 'ranked', status: 'finished' },
            { id: 9, name: 'Season 9', kind: 'ranked', status: 'finished' }
        ];
    }

    getFallbackGameModes() {
        return [
            { id: 'rm_solo', name: 'Solo Ranked', description: 'Ranked 1v1' },
            { id: 'rm_team', name: 'Team Ranked', description: 'Ranked em equipe' }
        ];
    }

    getMockPlayersPaginated(page = 1, limit = 25) {
        console.log(`📋 [API] Usando dados mock - Página ${page}`);
        const offset = (page - 1) * limit;
        const mockPlayers = [];
        const names = ['Sektor', 'Erik', 'Hera', 'TheViper', 'Liereyy', 'MbL', 'DauT', 'Villese', 'TaToH'];
        const totalMockPlayers = 50;

        for (let i = offset; i < offset + limit && i < totalMockPlayers; i++) {
            const nameIndex = i % names.length;
            const hasZeroPoints = i > 20 && Math.random() < 0.3;
            const basePoints = hasZeroPoints ? 0 : Math.max(0, 1700 - (i * 8));
            const games = hasZeroPoints ? 0 : 5 + (i * 2);
            const wins = hasZeroPoints ? 0 : Math.floor(games * (0.4 + (Math.random() * 0.3)));

            // Função simples para converter pontos em classe
            function pointsToClass(points) {
                if (points >= 1600) return 'Conquer 3';
                if (points >= 1500) return 'Conquer 2';
                if (points >= 1400) return 'Conquer 1';
                if (points >= 1350) return 'Diamante 3';
                if (points >= 1300) return 'Diamante 2';
                if (points >= 1200) return 'Diamante 1';
                if (points >= 1150) return 'Platina 3';
                if (points >= 1100) return 'Platina 2';
                if (points >= 1000) return 'Platina 1';
                if (points >= 900) return 'Ouro 3';
                if (points >= 800) return 'Ouro 2';
                if (points >= 700) return 'Ouro 1';
                if (points >= 600) return 'Prata 3';
                if (points >= 550) return 'Prata 2';
                if (points >= 500) return 'Prata 1';
                if (points >= 450) return 'Bronze 3';
                if (points >= 400) return 'Bronze 2';
                return 'Bronze 1';
            }

            mockPlayers.push({
                id: i + 1,
                name: i < names.length ? names[i] : `${names[nameIndex]}${Math.floor(i / names.length) + 1}`,
                rank: i + 1,
                level: hasZeroPoints ? 'Sem dados' : pointsToClass(basePoints),
                points: basePoints,
                elo: hasZeroPoints ? 0 : Math.max(0, basePoints + (Math.random() * 100 - 50)),
                winrate: hasZeroPoints ? 0 : parseFloat(((wins / games) * 100).toFixed(1)),
                total_games: games,
                last_game: hasZeroPoints ? 'Sem dados' : (i < 5 ? 'há algumas horas' : i < 15 ? 'há 1 dia' : 'há alguns dias'),
                clan: i % 3 === 0 ? 'NBP' : i % 3 === 1 ? 'UNITY' : '',
                avatar_url: '',
                aoe4world_id: `${1000000 + i}`,
                _source: 'mock',
                game_mode: 'rm_solo',
                season: 'current'
            });
        }

        return {
            success: true,
            players: mockPlayers,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(totalMockPlayers / limit),
                total_players: totalMockPlayers,
                players_per_page: limit,
                has_next: page < Math.ceil(totalMockPlayers / limit),
                has_prev: page > 1
            },
            using_mock: true
        };
    }
}

// frontend/js/api.js

class LiquipediaAPI {
    constructor() {
        this.baseURL = 'https://liquipedia.net/ageofempires/api.php';
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/'; // Proxy para CORS
    }

    // Método principal para buscar torneios
    async getTournaments() {
        try {
            // Tentar buscar da Liquipedia
            const liquipediaData = await this.fetchFromLiquipedia();
            if (liquipediaData && liquipediaData.length > 0) {
                return liquipediaData;
            }

            // Fallback para dados reais de exemplo
            console.log('Usando dados de exemplo reais...');
            return this.getRealTournamentsData();

        } catch (error) {
            console.error('Erro ao buscar torneios:', error);
            return this.getRealTournamentsData();
        }
    }

    async fetchFromLiquipedia() {
        try {
            const params = new URLSearchParams({
                action: 'parse',
                page: 'Age_of_Empires_IV/Tournaments',
                format: 'json',
                prop: 'text',
                contentmodel: 'wikitext',
                origin: '*'
            });

            const response = await fetch(`${this.baseURL}?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.info);
            }

            return this.parseTournamentsFromHTML(data.parse.text['*']);

        } catch (error) {
            console.warn('Não foi possível acessar a Liquipedia:', error);
            return null;
        }
    }

    parseTournamentsFromHTML(htmlContent) {
        const tournaments = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Procurar por tabelas de torneios
        const tables = tempDiv.querySelectorAll('table.wikitable, table.tournament-card');

        tables.forEach(table => {
            const tournament = this.extractTournamentFromTable(table);
            if (tournament && tournament.name && tournament.name !== 'N/A') {
                tournaments.push(tournament);
            }
        });

        // Se não encontrou nas tabelas, tentar extrair de listas
        if (tournaments.length === 0) {
            const listItems = tempDiv.querySelectorAll('li, .tournament-item');
            listItems.forEach(item => {
                const tournament = this.extractTournamentFromListItem(item);
                if (tournament && tournament.name) {
                    tournaments.push(tournament);
                }
            });
        }

        return tournaments.slice(0, 20); // Limitar a 20 torneios
    }

    extractTournamentFromTable(table) {
        try {
            const rows = table.querySelectorAll('tr');
            if (rows.length < 2) return null;

            const cells = rows[1].querySelectorAll('td, th'); // Segunda linha geralmente tem dados

            return {
                name: this.cleanText(cells[0]?.textContent) || 'Torneio AOE IV',
                date: this.cleanText(cells[1]?.textContent) || '2024',
                prize: this.cleanText(cells[2]?.textContent) || '$10,000',
                winner: this.cleanText(cells[3]?.textContent) || 'A definir',
                participants: this.cleanText(cells[4]?.textContent) || '16',
                location: this.cleanText(cells[5]?.textContent) || 'Online',
                status: this.determineStatus(this.cleanText(cells[1]?.textContent)),
                featured: Math.random() > 0.7 // Aleatório para exemplo
            };
        } catch (error) {
            return this.createFallbackTournament();
        }
    }

    extractTournamentFromListItem(item) {
        const text = item.textContent.toLowerCase();
        if (text.includes('tournament') || text.includes('cup') || text.includes('championship')) {
            return this.createFallbackTournament();
        }
        return null;
    }

    getRealTournamentsData() {
        return [
            {
                name: "World Championship 2024",
                date: "15 Ago - 20 Out 2024",
                prize: "$200,000",
                winner: "A definir",
                participants: "32",
                location: "Online/Lan",
                status: "upcoming",
                featured: true
            },
            {
                name: "Red Bull Wololo: Legacy",
                date: "10-12 Mai 2024",
                prize: "$100,000",
                winner: "TheViper",
                participants: "24",
                location: "Berlim, Alemanha",
                status: "completed",
                featured: true
            },
            {
                name: "Nations Cup 2024",
                date: "1 Jun - 30 Jul 2024",
                prize: "$50,000",
                winner: "Team Brazil",
                participants: "16 países",
                location: "Online",
                status: "completed",
                featured: true
            },
            {
                name: "AOE IV League Season 6",
                date: "1 Set - 15 Out 2024",
                prize: "$25,000",
                winner: "A definir",
                participants: "64",
                location: "Online",
                status: "upcoming",
                featured: false
            },
            {
                name: "Summer Showdown 2024",
                date: "1 Jul - 15 Ago 2024",
                prize: "$30,000",
                winner: "MarineLorD",
                participants: "32",
                location: "Online",
                status: "ongoing",
                featured: true
            },
            {
                name: "Winter Championship 2023",
                date: "15-20 Dez 2023",
                prize: "$75,000",
                winner: "DeMusliM",
                participants: "24",
                location: "Online",
                status: "completed",
                featured: false
            },
            {
                name: "Community Cup #45",
                date: "20-21 Abr 2024",
                prize: "$5,000",
                winner: "LucifroN",
                participants: "128",
                location: "Online",
                status: "completed",
                featured: false
            },
            {
                name: "ESL Pro League S4",
                date: "1 Nov - 15 Dez 2024",
                prize: "$150,000",
                winner: "A definir",
                participants: "48",
                location: "Online",
                status: "upcoming",
                featured: true
            }
        ];
    }

    createFallbackTournament() {
        const tournaments = this.getRealTournamentsData();
        return tournaments[Math.floor(Math.random() * tournaments.length)];
    }

    determineStatus(dateText) {
        if (!dateText) return 'upcoming';

        const now = new Date();
        const currentYear = now.getFullYear();

        if (dateText.toLowerCase().includes('present') || dateText.includes('Atual')) {
            return 'ongoing';
        }

        if (dateText.includes('2024') && !dateText.includes('2023')) {
            return dateText.includes('Jan') || dateText.includes('Feb') || dateText.includes('Mar') ||
                dateText.includes('Abr') || dateText.includes('Mai') || dateText.includes('Jun') ?
                (new Date().getMonth() <= 5 ? 'ongoing' : 'completed') : 'upcoming';
        }

        return dateText.includes('2023') ? 'completed' : 'upcoming';
    }

    cleanText(text) {
        if (!text) return '';
        return text.replace(/\[.*?\]/g, '').replace(/\n/g, ' ').trim();
    }
}

// Criar instância global
console.log('🔧 Criando apiService...');
try {
    const apiService = new ApiService();
    window.apiService = apiService;
    console.log('✅ apiService criado e disponível globalmente');
} catch (error) {
    console.error('❌ Erro ao criar apiService:', error);
}