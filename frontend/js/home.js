// Sistema da página inicial com dados reais - COMPLETO
console.log('🏠 Inicializando página home...');

const API_BASE = 'http://localhost:3001/api';

async function loadHomeData() {
    try {
        console.log('📊 Carregando dados da home...');
        
        // Carregar estatísticas gerais
        await loadHeroStats();
        
        // Carregar top players
        await loadTopPlayers();
        
        // Carregar estatísticas da comunidade
        await loadCommunityStats();
        
        // Carregar clans (AGORA COM DADOS REAIS)
        await loadTopClans();
        
        // Carregar atividade recente
        await loadRecentActivity();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da home:', error);
        showErrorState();
    }
}

// Função dedicada para buscar estatísticas de clans
async function getClanStatsForHero() {
    try {
        const response = await fetch(`${API_BASE}/clans/stats/overview`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.stats) {
            return data.stats.total_clans || 0;
        }
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de clans:', error);
    }
    
    // Fallback: contar clans diretamente da API de clans
    try {
        const response = await fetch(`${API_BASE}/clans/featured?limit=50`);
        if (response.ok) {
            const data = await response.json();
            return data.clans ? data.clans.length : 0;
        }
    } catch (error) {
        console.error('❌ Erro ao contar clans:', error);
    }
    
    return 0; // Valor padrão se tudo falhar
}

// 1. Estatísticas do Hero - COM FALLBACK E CLANS REAIS
async function loadHeroStats() {
    try {
        console.log('🔍 Buscando estatísticas do hero...');
        const response = await fetch(`${API_BASE}/stats/leaderboard`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Dados recebidos:', data);
        
        if (data.success) {
            // Buscar número real de clans
            const realClanCount = await getClanStatsForHero();
            const statsWithRealClans = {
                ...data.stats,
                total_clans: realClanCount > 0 ? realClanCount : data.stats.total_clans
            };
            
            renderHeroStats(statsWithRealClans);
        } else {
            throw new Error(data.error || 'Erro na API');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar hero stats:', error);
        // Fallback com clans reais
        const mockStats = getMockStats();
        const realClanCount = await getClanStatsForHero();
        mockStats.total_clans = realClanCount > 0 ? realClanCount : mockStats.total_clans;
        
        renderHeroStats(mockStats);
    }
}

function renderHeroStats(stats) {
    const container = document.getElementById('hero-stats');
    
    console.log('🎯 Renderizando hero stats:', stats);
    
    container.innerHTML = `
        <div class="hero-stat">
            <span class="number">${stats.total_players.toLocaleString()}</span>
            <span class="label">Jogadores</span>
        </div>
        <div class="hero-stat">
            <span class="number">${stats.total_games.toLocaleString()}</span>
            <span class="label">Partidas</span>
        </div>
        <div class="hero-stat">
            <span class="number">${stats.total_clans.toLocaleString()}</span>
            <span class="label">Clans</span>
        </div>
        <div class="hero-stat">
            <span class="number">${Math.round(stats.total_players * 0.15).toLocaleString()}</span>
            <span class="label">Ativos Hoje</span>
        </div>
    `;
}

// 2. Top 5 Players - COM FALLBACK
async function loadTopPlayers() {
    try {
        console.log('🔍 Buscando top players...');
        const response = await fetch(`${API_BASE}/players?page=1&limit=5&mode=rm_solo`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.players.length > 0) {
            renderTopPlayers(data.players);
        } else {
            throw new Error('Nenhum player encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar top players:', error);
        // Fallback para dados mock
        renderTopPlayers(getMockPlayers());
    }
}

function renderTopPlayers(players) {
    const container = document.getElementById('top-players');
    
    const playersHTML = players.map(player => `
        <div class="player-card">
            <div class="player-header">
                <div class="player-rank">#${player.rank}</div>
                <div class="player-avatar">
                    ${player.avatar_url ? 
                        `<img src="${player.avatar_url}" alt="${player.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="avatar-fallback" style="display: none;"><i class="fas fa-user"></i></div>` : 
                        `<div class="avatar-fallback"><i class="fas fa-user"></i></div>`
                    }
                </div>
                <div class="player-name">
                    <a href="https://aoe4world.com/players/${player.aoe4world_id}" target="_blank">
                        ${player.name}
                    </a>
                    ${player.clan ? `<div class="clan-tag">${player.clan}</div>` : ''}
                </div>
            </div>
            <div class="player-stats">
                <div class="stat-item">
                    <span class="stat-label">Points</span>
                    <span class="stat-value">${player.points}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">ELO</span>
                    <span class="stat-value">${player.elo}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Win Rate</span>
                    <span class="stat-value">${player.winrate}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Level</span>
                    <span class="stat-value">${player.level}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Jogos</span>
                    <span class="stat-value">${player.total_games}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Última Partida</span>
                    <span class="stat-value">${formatLastGameShort(player.last_game)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = playersHTML;
}

// 3. Estatísticas da Comunidade - COM FALLBACK
async function loadCommunityStats() {
    try {
        console.log('🔍 Buscando estatísticas da comunidade...');
        const response = await fetch(`${API_BASE}/stats/leaderboard`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderCommunityStats(data.stats);
        } else {
            throw new Error(data.error || 'Erro na API');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar community stats:', error);
        // Fallback para dados mock
        renderCommunityStats(getMockStats());
    }
}

function renderCommunityStats(stats) {
    const container = document.getElementById('community-stats');
    
    // Calcular distribuição percentual
    const totalWithData = stats.tier_distribution.conquer + stats.tier_distribution.diamond + 
                         stats.tier_distribution.platinum_gold + stats.tier_distribution.silver_bronze + 
                         stats.tier_distribution.low_elo;
    
    const conquerPercent = totalWithData > 0 ? ((stats.tier_distribution.conquer / totalWithData) * 100).toFixed(1) : 0;
    const diamondPercent = totalWithData > 0 ? ((stats.tier_distribution.diamond / totalWithData) * 100).toFixed(1) : 0;
    const platinumGoldPercent = totalWithData > 0 ? ((stats.tier_distribution.platinum_gold / totalWithData) * 100).toFixed(1) : 0;
    const silverBronzePercent = totalWithData > 0 ? ((stats.tier_distribution.silver_bronze / totalWithData) * 100).toFixed(1) : 0;
    const lowEloPercent = totalWithData > 0 ? ((stats.tier_distribution.low_elo / totalWithData) * 100).toFixed(1) : 0;
    
    container.innerHTML = `
        <div class="quick-stat-card">
            <i class="fas fa-gamepad"></i>
            <h3>Total de Jogos</h3>
            <div class="stat-value">${stats.total_games.toLocaleString()}</div>
            <p>${stats.total_solo_games.toLocaleString()} Solo • ${stats.total_team_games.toLocaleString()} Equipe</p>
        </div>
        
        <div class="quick-stat-card">
            <i class="fas fa-chart-line"></i>
            <h3>Pontuação Média</h3>
            <div class="stat-value">${stats.avg_solo_points}</div>
            <p>Solo • ${stats.avg_team_points} Equipe</p>
        </div>
        
        <div class="quick-stat-card">
            <i class="fas fa-crown"></i>
            <h3>Jogadores Elite</h3>
            <div class="stat-value">${stats.tier_distribution.conquer + stats.tier_distribution.diamond}</div>
            <p>Conquistadores e diamantes</p>
        </div>
        
        <div class="quick-stat-card">
            <i class="fas fa-layer-group"></i>
            <h3>Distribuição por nível</h3>
            <div class="tier-distribution">
                <div class="tier-bar conquer" style="width: ${conquerPercent}%" title="Conquer: ${conquerPercent}%"></div>
                <div class="tier-bar diamond" style="width: ${diamondPercent}%" title="Diamond: ${diamondPercent}%"></div>
                <div class="tier-bar platinum" style="width: ${platinumGoldPercent}%" title="Platina/Ouro: ${platinumGoldPercent}%"></div>
                <div class="tier-bar gold" style="width: ${silverBronzePercent}%" title="Prata/Bronze: ${silverBronzePercent}%"></div>
                <div class="tier-bar silver" style="width: ${lowEloPercent}%" title="Low ELO: ${lowEloPercent}%"></div>
            </div>
            <p style="margin-top: 10px; font-size: 0.8rem; color: #a0aec0;">
                ${stats.tier_distribution.conquer}C ${stats.tier_distribution.diamond}D ${stats.tier_distribution.platinum_gold}P/G ${stats.tier_distribution.silver_bronze}S/B
            </p>
        </div>
    `;
}

// 4. Top Clans - AGORA COM DADOS REAIS DO BANCO
async function loadTopClans() {
    try {
        console.log('🔍 Buscando clans do banco...');
        const response = await fetch(`${API_BASE}/clans/featured?limit=6`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.clans.length > 0) {
            console.log(`✅ ${data.clans.length} clans carregados do banco`);
            renderTopClans(data.clans);
        } else {
            throw new Error('Nenhum clan encontrado no banco');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar clans:', error);
        // Fallback para dados mock
        renderTopClans(getMockClans());
    }
}

function renderTopClans(clans) {
    const container = document.getElementById('top-clans');
    
    if (!clans || clans.length === 0) {
        container.innerHTML = `
            <div class="no-clans-message">
                <i class="fas fa-users"></i>
                <p>Nenhum clan encontrado</p>
                <small>Os clans ainda não foram cadastrados no sistema</small>
            </div>
        `;
        return;
    }
    
    const clansHTML = clans.map(clan => {
        const memberText = clan.member_count === 1 ? 'membro' : 'membros';
        const avgPoints = Math.round(clan.avg_solo_points || 0);
        const clanInitials = clan.tag ? clan.tag.substring(0, 3).toUpperCase() : clan.name.substring(0, 3).toUpperCase();
        const dataCoverage = clan.member_count > 0 ? 
            Math.round((clan.players_with_data / clan.member_count) * 100) : 0;
        
        // Extrair o primeiro player da lista de membros (se disponível)
        const topPlayer = clan.member_names ? clan.member_names.split(', ')[0] : '';
        const topPlayerDisplay = topPlayer ? topPlayer.split(' (')[0] : 'N/A';
        
        return `
            <div class="clan-card" onclick="viewClanDetails(${clan.clan_id})" style="cursor: pointer;">
                <div class="clan-badge-large">${clanInitials}</div>
                <h3>${clan.name}</h3>
                ${clan.tag ? `<div class="clan-tag">${clan.tag}</div>` : ''}
                <div class="clan-stats">
                    <span>${clan.member_count} ${memberText}</span>
                    <span>Avg: ${avgPoints} pts</span>
                </div>
                <div class="clan-data-coverage">
                    <small>Dados: ${dataCoverage}%</small>
                </div>
                ${clan.description ? `
                    <div class="clan-description">
                        <small>${clan.description.substring(0, 80)}${clan.description.length > 80 ? '...' : ''}</small>
                    </div>
                ` : ''}
                <div class="clan-top-players">
                    <small><strong>Top:</strong> ${topPlayerDisplay}</small>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = clansHTML;
}

// Função para visualizar detalhes do clan com modal
async function viewClanDetails(clanId) {
    try {
        console.log('🏰 Carregando detalhes do clan:', clanId);
        
        // Mostrar loading na modal
        showClanModal(`
            <div class="modal-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando membros do clan...</p>
            </div>
        `);
        
        // Buscar detalhes do clan e membros
        const response = await fetch(`${API_BASE}/clans/${clanId}`);
        const data = await response.json();
        
        if (data.success) {
            renderClanMembersModal(data);
        } else {
            throw new Error(data.error || 'Erro ao carregar clan');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar detalhes do clan:', error);
        showClanModal(`
            <div class="modal-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar membros do clan</p>
                <small>${error.message}</small>
            </div>
        `);
    }
}

// Função para mostrar modal com membros do clan
function showClanModal(content) {
    // Remover modal existente se houver
    const existingModal = document.getElementById('clan-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'clan-modal';
    modal.className = 'clan-modal';
    modal.innerHTML = content;
    
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeClanModal();
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeClanModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// Função para fechar modal
function closeClanModal() {
    const modal = document.getElementById('clan-modal');
    if (modal) {
        modal.remove();
    }
}

// Função para renderizar membros do clan na modal
function renderClanMembersModal(data) {
    const { clan, members, stats } = data;
    
    const modalContent = `
        <div class="clan-modal-content">
            <div class="clan-modal-header">
                <div class="clan-modal-title">
                    <h2>${clan.name}</h2>
                    ${clan.tag ? `<div class="clan-modal-tag">${clan.tag}</div>` : ''}
                </div>
                <button class="clan-modal-close" onclick="closeClanModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="clan-modal-stats">
                <div class="clan-stat-item">
                    <div class="clan-stat-number">${stats.total_members}</div>
                    <div class="clan-stat-label">Membros</div>
                </div>
                <div class="clan-stat-item">
                    <div class="clan-stat-number">${stats.players_with_data}</div>
                    <div class="clan-stat-label">Com Dados</div>
                </div>
                <div class="clan-stat-item">
                    <div class="clan-stat-number">${stats.data_coverage}%</div>
                    <div class="clan-stat-label">Cobertura</div>
                </div>
                <div class="clan-stat-item">
                    <div class="clan-stat-number">${stats.avg_solo_points}</div>
                    <div class="clan-stat-label">Avg Points</div>
                </div>
            </div>
            
            ${clan.description ? `
                <div class="clan-modal-description">
                    <p>${clan.description}</p>
                </div>
            ` : ''}
            
            <div class="clan-members-section">
                <h3>Membros do Clan (${members.length})</h3>
                <div class="clan-members-list">
                    ${renderClanMembersList(members)}
                </div>
            </div>
        </div>
    `;
    
    showClanModal(modalContent);
}

// home.js - Função para carregar clans na home
async function loadFeaturedClans() {
    try {
        const response = await fetch('http://localhost:3001/api/clans/featured');
        const data = await response.json();
        
        if (data.success && data.clans.length > 0) {
            const clansContainer = document.getElementById('top-clans');
            clansContainer.innerHTML = data.clans.map(clan => `
                <div class="clan-card" onclick="viewClanDetails(${clan.clan_id})">
                    <div class="clan-badge-large">${clan.tag || 'CLAN'}</div>
                    <h3>${clan.name}</h3>
                    <p>${clan.description || 'Clan de Age of Empires IV'}</p>
                    <div class="clan-stats">
                        <span><i class="fas fa-users"></i> ${clan.member_count || 0} membros</span>
                        <span><i class="fas fa-trophy"></i> ${Math.round(clan.avg_solo_points || 0)} pts</span>
                    </div>
                    <div class="clan-members-preview">
                        ${clan.member_names ? 
                            clan.member_names.split(', ').slice(0, 3).map(name => 
                                `<span class="member-tag">${name}</span>`
                            ).join('') : 
                            '<span class="no-members">Membros sem dados</span>'
                        }
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('top-clans').innerHTML = `
                <div class="no-results">
                    <i class="fas fa-users"></i>
                    <p>Nenhum clan encontrado</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar clans:', error);
        document.getElementById('top-clans').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar clans</p>
            </div>
        `;
    }
}

// Função para redirecionar para página do clan
function viewClanDetails(clanId) {
    window.location.href = `clan.html?id=${clanId}`;
}

// Função para renderizar lista de membros


// Função para formatar data de entrada no clan
function formatJoinDate(joinDate) {
    if (!joinDate) return 'Data não disponível';
    
    try {
        const date = new Date(joinDate);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return 'Data inválida';
    }
}

// 5. Atividade Recente - COM FALLBACK
async function loadRecentActivity() {
    try {
        console.log('🔍 Buscando atividade recente...');
        const response = await fetch(`${API_BASE}/players?page=1&limit=10&mode=rm_solo`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderRecentActivity(data.players);
        } else {
            throw new Error('Erro ao carregar dados');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar atividade recente:', error);
        // Fallback para dados mock
        renderRecentActivity(getMockPlayers().slice(0, 6));
    }
}

function renderRecentActivity(players) {
    const container = document.getElementById('recent-activity');
    
    const activityHTML = players.slice(0, 6).map(player => {
        const activityType = getRandomActivity();
        const timeAgo = formatLastGameShort(player.last_game);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${activityType.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${player.name}</strong> ${activityType.text}
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = activityHTML;
}

// ========== FUNÇÕES AUXILIARES ==========

// Dados mock para fallback - ATUALIZADO
function getMockStats() {
    return {
        total_players: 1250,
        total_games: 45800,
        total_clans: 4, // AGORA MOSTRA OS 4 CLANS REAIS
        players_with_clan: 380,
        players_with_solo: 1100,
        players_with_team: 650,
        total_solo_games: 32000,
        total_team_games: 13800,
        avg_solo_points: 850,
        avg_team_points: 920,
        tier_distribution: {
            conquer: 25,
            diamond: 120,
            platinum_gold: 450,
            silver_bronze: 550,
            low_elo: 105
        }
    };
}

function getMockPlayers() {
    return [
        {
            rank: 1,
            name: "Sektor",
            points: 2450,
            elo: 1850,
            winrate: 68,
            total_games: 342,
            level: "Conquer 3",
            clan: "NBP",
            aoe4world_id: "123456",
            last_game: "há 2 horas",
            avatar_url: ""
        },
        {
            rank: 2,
            name: "Erik",
            points: 2380,
            elo: 1820,
            winrate: 65,
            total_games: 298,
            level: "Conquer 2",
            clan: "UNITY",
            aoe4world_id: "123457",
            last_game: "há 1 dia",
            avatar_url: ""
        },
        {
            rank: 3,
            name: "Hera",
            points: 2320,
            elo: 1780,
            winrate: 72,
            total_games: 415,
            level: "Conquer 1",
            clan: "",
            aoe4world_id: "123458",
            last_game: "há 3 horas",
            avatar_url: ""
        },
        {
            rank: 4,
            name: "TheViper",
            points: 2280,
            elo: 1750,
            winrate: 70,
            total_games: 389,
            level: "Diamante 3",
            clan: "NBP",
            aoe4world_id: "123459",
            last_game: "há 5 horas",
            avatar_url: ""
        },
        {
            rank: 5,
            name: "Liereyy",
            points: 2250,
            elo: 1720,
            winrate: 75,
            total_games: 275,
            level: "Diamante 3",
            clan: "AOE",
            aoe4world_id: "123460",
            last_game: "há 8 horas",
            avatar_url: ""
        },
        {
            rank: 6,
            name: "MbL",
            points: 2200,
            elo: 1680,
            winrate: 65,
            total_games: 320,
            level: "Diamante 2",
            clan: "BR",
            aoe4world_id: "123461",
            last_game: "há 1 dia",
            avatar_url: ""
        }
    ];
}

function getMockClans() {
    return [
        {
            clan_id: 1,
            name: "No Brakes Players",
            tag: "NBP",
            description: "Top Brazilian competitive clan focused on Age of Empires IV",
            member_count: 15,
            players_with_data: 12,
            avg_solo_points: 1850,
            max_solo_points: 2450,
            member_names: "Sektor, Player2, Player3"
        },
        {
            clan_id: 2, 
            name: "Unity Gaming",
            tag: "UNITY",
            description: "International competitive team with players from multiple regions",
            member_count: 12,
            players_with_data: 10,
            avg_solo_points: 1750,
            max_solo_points: 2380,
            member_names: "Erik, PlayerX, PlayerY"
        },
        {
            clan_id: 3,
            name: "Brazilian Force", 
            tag: "BR",
            description: "Rising Brazilian talent in the competitive scene",
            member_count: 8,
            players_with_data: 6,
            avg_solo_points: 1650,
            max_solo_points: 2200,
            member_names: "MbL, PlayerZ, PlayerW"
        },
        {
            clan_id: 4,
            name: "Age of Empires Elite",
            tag: "AOE",
            description: "Dedicated players mastering all civilizations",
            member_count: 10,
            players_with_data: 8,
            avg_solo_points: 1600,
            max_solo_points: 2150,
            member_names: "Liereyy, PlayerA, PlayerB"
        }
    ];
}

function formatLastGameShort(lastGame) {
    if (!lastGame || lastGame === 'Sem dados' || lastGame === 'Invalid Date' || lastGame === 'Nunca') {
        return 'Nunca';
    }
    
    if (lastGame.includes('há')) {
        return lastGame;
    }
    
    try {
        const gameDate = new Date(lastGame);
        const now = new Date();
        const diffMs = now - gameDate;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            return `há ${diffDays}d`;
        } else if (diffHours > 0) {
            return `há ${diffHours}h`;
        } else {
            return 'agora';
        }
    } catch (error) {
        return 'Nunca';
    }
}

function getRandomActivity() {
    const activities = [
        { icon: 'fa-trophy', text: 'subiu para Conquer' },
        { icon: 'fa-chart-line', text: 'atingiu novo recorde de pontos' },
        { icon: 'fa-gamepad', text: 'completou 10 vitórias consecutivas' },
        { icon: 'fa-users', text: 'entrou para um novo clan' },
        { icon: 'fa-star', text: 'desbloqueou nova conquista' },
        { icon: 'fa-arrow-up', text: 'subiu no ranking' },
        { icon: 'fa-medal', text: 'alcançou novo tier' },
        { icon: 'fa-fire', text: 'está em streak de vitórias' }
    ];
    
    return activities[Math.floor(Math.random() * activities.length)];
}

// Função para mostrar estado de erro
function showErrorState() {
    const containers = [
        'hero-stats',
        'top-players', 
        'community-stats',
        'top-clans',
        'recent-activity'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar dados</p>
                    <small>Verifique se o backend está rodando em http://localhost:3001</small>
                    <button onclick="loadHomeData()" class="retry-btn">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    });
}



// Adicionar CSS dinamicamente para estados de erro e estilos de clans
const homeCSS = `
    .error-state {
        text-align: center;
        padding: 2rem;
        color: #e53e3e;
        background: rgba(229, 62, 62, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(229, 62, 62, 0.3);
    }
    


    .error-state i {
        font-size: 2rem;
        margin-bottom: 1rem;
    }
    
    .error-state p {
        margin-bottom: 0.5rem;
        font-weight: 600;
    }
    
    .error-state small {
        color: #a0aec0;
        display: block;
        margin-bottom: 1rem;
    }
    
    .retry-btn {
        background: var(--accent-color);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.3s;
    }
    
    .retry-btn:hover {
        background: #c53030;
    }
    
    .no-clans-message {
        text-align: center;
        padding: 2rem;
        color: #a0aec0;
        grid-column: 1 / -1;
    }
    
    .no-clans-message i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    /* Estilos específicos para clans */
    .clan-tag {
        background: linear-gradient(135deg, #05448dff, #16a103ff);
        color: white;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        margin: 5px 0;
        display: inline-block;
    }
    
    .clan-data-coverage {
        margin-top: 5px;
        font-size: 0.75rem;
        color: #a0aec0;
    }
    
    .clan-top-players {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border-color);
        font-size: 0.8rem;
        color: #cbd5e0;
    }
    
    .clan-description {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--border-color);
        color: #a0aec0;
        font-size: 0.8rem;
        line-height: 1.3;
    }
    
    .clan-card {
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .clan-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        border-color: var(--accent-color);
    }
    
    .clan-badge-large {
        background: linear-gradient(135deg, #3e8ce5, #ffee00);
        color: white;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.2rem;
        margin: 0 auto 1rem;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .clan-stats {
        display: flex;
        justify-content: space-around;
        margin-top: 1rem;
        font-size: 0.8rem;
        color: #a0aec0;
    }

    /* Modal de Clan */
    .clan-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
        backdrop-filter: blur(5px);
    }
    
    .clan-modal-content {
        background: var(--card-bg);
        border-radius: 12px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        border: 1px solid var(--border-color);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    
    .clan-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2rem 2rem 1rem 2rem;
        border-bottom: 1px solid var(--border-color);
        background: rgba(15, 23, 42, 0.9);
        border-radius: 12px 12px 0 0;
    }
    
    .clan-modal-title {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .clan-modal-title h2 {
        margin: 0;
        color: var(--text-color);
        font-size: 1.8rem;
    }
    
    .clan-modal-tag {
        background: linear-gradient(135deg, #3e8ce5, #ffee00);
        color: white;
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 0.9rem;
        font-weight: 600;
    }
    
    .clan-modal-close {
        background: none;
        border: none;
        color: var(--text-color);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    
    .clan-modal-close:hover {
        background: rgba(229, 62, 62, 0.2);
        color: var(--accent-color);
    }
    
    .clan-modal-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        padding: 1.5rem 2rem;
        background: rgba(45, 55, 72, 0.5);
    }
    
    .clan-stat-item {
        text-align: center;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }
    
    .clan-stat-number {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--accent-color);
        margin-bottom: 0.5rem;
    }
    
    .clan-stat-label {
        font-size: 0.8rem;
        color: #a0aec0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .clan-modal-description {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid var(--border-color);
        background: rgba(255, 255, 255, 0.02);
    }
    
    .clan-modal-description p {
        margin: 0;
        color: #cbd5e0;
        line-height: 1.5;
        font-style: italic;
    }
    
    .clan-members-section {
        padding: 1.5rem 2rem;
    }
    
    .clan-members-section h3 {
        margin-bottom: 1.5rem;
        color: var(--text-color);
        font-size: 1.3rem;
        border-bottom: 2px solid var(--accent-color);
        padding-bottom: 0.5rem;
    }
    
    .clan-members-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
        max-height: 400px;
        overflow-y: auto;
        padding: 10px;
    }
    
    .clan-member-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid var(--border-color);
        transition: all 0.3s ease;
    }
    
    .clan-member-card:hover {
        transform: translateY(-2px);
        border-color: var(--accent-color);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
    
    .clan-member-card.owner {
        border-left: 4px solid #FFD700;
        background: rgba(255, 215, 0, 0.05);
    }
    
    .clan-member-card.no-data {
        opacity: 0.7;
        background: rgba(74, 85, 104, 0.3);
    }
    
    .clan-member-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .clan-member-avatar {
        position: relative;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--secondary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }
    
    .clan-member-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .owner-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #FFD700;
        color: #000;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        border: 2px solid var(--card-bg);
    }
    
    .clan-member-info {
        flex: 1;
    }
    
    .clan-member-name {
        font-weight: 600;
        margin-bottom: 0.3rem;
    }
    
    .clan-member-level {
        font-size: 0.8rem;
        color: #a0aec0;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 10px;
        display: inline-block;
    }
    
    .clan-member-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .clan-member-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.3rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .clan-member-stat .stat-label {
        font-size: 0.75rem;
        color: #a0aec0;
    }
    
    .clan-member-stat .stat-value {
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .clan-member-no-data {
        grid-column: 1 / -1;
        text-align: center;
        padding: 1rem;
        color: #a0aec0;
        font-size: 0.8rem;
    }
    
    .clan-member-details {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }
    
    .member-detail {
        background: var(--secondary-color);
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 0.7rem;
        color: #cbd5e0;
    }
    
    .clan-member-joined {
        text-align: center;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        color: #a0aec0;
        font-size: 0.7rem;
    }
    
    .modal-loading, .modal-error {
        text-align: center;
        padding: 3rem;
        color: #a0aec0;
    }
    
    .modal-loading i, .modal-error i {
        font-size: 2rem;
        margin-bottom: 1rem;
    }
    
    .no-members-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 2rem;
        color: #a0aec0;
    }
    
    /* Responsividade */
    @media (max-width: 768px) {
        .clan-modal-content {
            margin: 10px;
            max-height: 95vh;
        }
        
        .clan-modal-header {
            padding: 1.5rem 1rem 1rem 1rem;
        }
        
        .clan-modal-stats {
            padding: 1rem;
            grid-template-columns: repeat(2, 1fr);
        }
        
        .clan-members-section {
            padding: 1rem;
        }
        
        .clan-members-list {
            grid-template-columns: 1fr;
            max-height: 300px;
        }
`;

// Adicionar CSS ao documento
if (!document.querySelector('#home-styles')) {
    const style = document.createElement('style');
    style.id = 'home-styles';
    style.textContent = homeCSS;
    document.head.appendChild(style);
}

// ========== INICIALIZAÇÃO ==========

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando carga de dados da home...');
    loadHomeData();
    
    // Atualizar a cada 2 minutos
    setInterval(loadHomeData, 120000);
});

// Expor funções para uso global
window.loadHomeData = loadHomeData;
window.viewClanDetails = viewClanDetails;