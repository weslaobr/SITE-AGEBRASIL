// Mock data fallback
const mockPlayers = [
    {
        id: 1,
        name: "Sektor",
        clan: "",
        avatar: "",
        rank: 1,
        level: 45,
        points: 2450,
        elo: 1850,
        winrate: 68,
        games: 342,
        lastGame: "2 hours ago"
    },
    {
        id: 2,
        name: "Erik",
        clan: "",
        avatar: "",
        rank: 2,
        level: 42,
        points: 2380,
        elo: 1820,
        winrate: 65,
        games: 298,
        lastGame: "1 day ago"
    }
];


// Function to render players with real data - ATUALIZADA
function renderPlayers(players) {
    const container = document.getElementById('players-container');
    
    if (!players || players.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-users-slash"></i>
                <p>Nenhum player encontrado</p>
                <small>Verifique se o backend está rodando</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // DEBUG: Verificar estrutura dos dados
    console.log('🔍 DEBUG - Estrutura do primeiro player:', players[0]);
    
    // Contar estatísticas
    const withData = players.filter(p => p.has_data).length;
    const withoutData = players.filter(p => !p.has_data).length;
    
    console.log(`📊 Renderizando: ${withData} com dados, ${withoutData} sem dados`);
    
    players.forEach((player, index) => {
        const row = document.createElement('div');
        
        // ✅ DIFERENCIAR visualmente quem tem e quem não tem dados
        const hasData = player.has_data;
        const isTeamMode = player.game_mode === 'rm_team';
        
        // ✅ CORREÇÃO: Buscar clan tag UMA VEZ e decidir onde mostrar
        const clanTag = player.clan || player.clan_tag || player.clan_name || '';
        console.log(`🔍 Player ${player.name} - Clan tag: "${clanTag}"`);
        
        // ✅ DECISÃO: Mostrar clan badge APENAS se tiver tag, NÃO mostrar clan tag separadamente
 const clanBadge = clanTag ? `
    <div class="clan-badge-minimal" title="Clan: ${clanTag}">
        ${clanTag}
    </div>
` : '';
        
        row.className = `player-row ${player.rank <= 3 && hasData ? 'top-3' : ''} ${!hasData ? 'no-team-data' : ''}`;
        
        // Determine rank display
        let rankDisplay = player.rank;
        if (hasData && rankDisplay === 1) {
            rankDisplay = '<div class="rank-1"><i class="fas fa-crown"></i></div>';
        } else if (hasData && rankDisplay === 2) {
            rankDisplay = '<div class="rank-2"><i class="fas fa-medal"></i></div>';
        } else if (hasData && rankDisplay === 3) {
            rankDisplay = '<div class="rank-3"><i class="fas fa-medal"></i></div>';
        } else {
            rankDisplay = `<div class="rank-number ${!hasData ? 'no-data-rank' : ''}">${rankDisplay}</div>`;
        }
        
        // Player avatar with fallback
        const avatarContent = player.avatar_url ? 
            `<img src="${player.avatar_url}" alt="${player.name}" 
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                  loading="lazy">` : 
            '';
        
        // Winrate color (apenas se tiver dados)
        const winrateClass = hasData ? (player.winrate >= 60 ? 'positive' : player.winrate >= 40 ? '' : 'negative') : 'no-data';
        
        // Last game relative time
        const lastGame = hasData ? formatLastGame(player.last_game) : 'Sem dados';
        
        // Level badge - tratamento especial para quem não tem dados
        const levelClass = hasData ? (player.level ? player.level.toLowerCase().replace(' ', '-') : 'no-data') : 'no-team-data';
        const levelDisplay = hasData ? 
            (player.level ? 
                `<div class="level-badge ${levelClass}">${player.level}</div>` : 
                `<div class="level-badge no-data">Sem dados</div>`) :
            `<div class="level-badge no-team-data" title="Player não joga Team Ranked">SEM TEAM</div>`;
        
        // ✅ BADGE para mostrar status do Team Ranked
        const teamStatusBadge = isTeamMode ? 
            (hasData ? 
                '<div class="data-badge team-badge" title="Tem dados de Team Ranked"><i class="fas fa-users"></i></div>' : 
                '<div class="warning-badge no-team-badge" title="Não tem dados de Team Ranked"><i class="fas fa-user-times"></i></div>') : 
            '';
        
        // ✅ COMPARAÇÃO Solo vs Team (apenas no modo team)
        const comparisonInfo = isTeamMode && player.solo_points > 0 ? 
            `<div class="player-stats">
                <span class="solo-comparison">Solo: ${player.solo_points} pts</span>
            </div>` : '';

        // ✅ CORREÇÃO: Removido o clan tag duplicado do player-stats
        row.innerHTML = `
    <div class="rank">${rankDisplay}</div>
    <div class="player-info">
        <div class="avatar">
            ${avatarContent}
            <div class="avatar-fallback" style="${player.avatar_url ? 'display: none;' : ''}">
                <i class="fas fa-user"></i>
            </div>
        </div>
        <div class="player-details">
            <div class="player-name-container">
                <div class="player-name ${!hasData ? 'no-team-name' : ''}">
                    <a href="https://aoe4world.com/players/${player.aoe4world_id}" target="_blank" class="player-link">
                        ${player.name}
                    </a>
                </div>
                ${clanBadge}
                ${teamStatusBadge}
                ${!hasData && isTeamMode ? '<div class="unranked-badge" title="Player não ranqueado no Team Ranked"><i class="fas fa-minus-circle"></i></div>' : ''}
            </div>
            <div class="player-stats">
                ${player.region ? `<span class="region">${player.region}</span>` : ''}
                ${player.civilization ? `<span class="civ">${player.civilization}</span>` : ''}
                ${!hasData && isTeamMode ? `<span class="no-team-tag">Sem Team Ranked</span>` : ''}
            </div>
            ${comparisonInfo}
        </div>
    </div>
    <div class="level-cell">${levelDisplay}</div>
    <div class="points ${!hasData ? 'no-team-points' : ''}">${hasData ? player.points : '-'}</div>
    <div class="elo ${!hasData ? 'no-team-points' : ''}">${hasData ? player.elo : '-'}</div>
    <div class="winrate">
        <span class="${winrateClass} ${!hasData ? 'no-team-points' : ''}">${hasData ? player.winrate + '%' : '-'}</span>
        ${hasData ? `
        <div class="winrate-bar">
            <div class="winrate-fill" style="width: ${Math.min(player.winrate, 100)}%"></div>
        </div>
        ` : ''}
    </div>
    <div class="games ${!hasData ? 'no-team-points' : ''}">${hasData ? player.total_games : '-'}</div>
    <div class="last-game ${!hasData ? 'no-team-points' : ''}">${lastGame}</div>
`;
        
        // Add click event to view player details
        row.addEventListener('click', () => {
            viewPlayerDetails(player);
        });
        
        container.appendChild(row);
    });
    
    console.log(`✅ ${players.length} players renderizados`);
    console.log(`📝 ${withoutData} jogadores sem Team Ranked`);
}

// ✅ FUNÇÃO CORRIGIDA: Formatar última partida
function formatLastGame(lastGame) {
    // Verificar se é um valor inválido ou nulo
    if (!lastGame || 
        lastGame === 'Sem dados' || 
        lastGame === 'null' ||
        lastGame === 'NULL' ||
        lastGame === '' ||
        lastGame === 'Invalid Date' ||
        lastGame === 'Nunca') {
        return 'Sem dados';
    }
    
    // Se já estiver formatado em português, manter
    if (typeof lastGame === 'string' && 
        (lastGame.includes('há') || lastGame.includes('dias') || 
         lastGame.includes('horas') || lastGame.includes('meses'))) {
        return lastGame;
    }
    
    try {
        // Converter para Date - pode ser string ISO ou timestamp
        const gameDate = new Date(lastGame);
        
        // Verificar se é uma data válida
        if (isNaN(gameDate.getTime())) {
            console.log(`⚠️ Data inválida no frontend: ${lastGame}`);
            return 'Sem dados';
        }
        
        const now = new Date();
        const diffMs = now - gameDate;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Formatar de forma mais inteligente
        if (diffDays > 365) {
            const years = Math.floor(diffDays / 365);
            return `há ${years} ano${years > 1 ? 's' : ''}`;
        } else if (diffDays > 30) {
            const months = Math.floor(diffDays / 30);
            return `há ${months} mes${months > 1 ? 'es' : ''}`;
        } else if (diffDays > 7) {
            return `há ${diffDays} dias`;
        } else if (diffDays > 0) {
            return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
            return `há ${diffMinutes} min`;
        } else {
            return 'Agora mesmo';
        }
        
    } catch (error) {
        console.log(`💥 Erro ao formatar data no frontend: ${lastGame}`, error);
        return 'Sem dados';
    }
}

// View player details
function viewPlayerDetails(player) {
    console.log('Viewing player:', player);
    // Aqui você pode implementar um modal ou redirecionar para página de detalhes
}

// Export functions
window.playerModule = {
    renderPlayers,
    viewPlayerDetails
};