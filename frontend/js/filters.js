// filters.js - VERSÃO COM BUSCA GLOBAL
function setupFilters() {
    // Add event listeners for filters
    const seasonFilter = document.getElementById('season-filter');
    const modeFilter = document.getElementById('mode-filter');
    const sortFilter = document.getElementById('sort-filter');

    if (seasonFilter) {
        seasonFilter.addEventListener('change', updateFilters);
    }
    if (modeFilter) {
        modeFilter.addEventListener('change', updateFilters);
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', updateFilters);
    }

    // Search functionality - MODIFICADO PARA BUSCA GLOBAL
    const searchButton = document.querySelector('.search-box button');
    if (searchButton) {
        searchButton.addEventListener('click', performGlobalSearch);
    }

    // Allow pressing Enter to search - MODIFICADO
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performGlobalSearch();
            }
        });

        // Busca em tempo real (opcional)
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length >= 3) {
                performGlobalSearch();
            } else if (searchTerm.length === 0) {
                clearGlobalSearch();
            }
        });
    }

    console.log('🔧 Filtros configurados com busca global');
}

// NOVA FUNÇÃO: Busca global em todos os jogadores
async function performGlobalSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim();

    if (!searchTerm || searchTerm.length < 2) {
        clearGlobalSearch();
        return;
    }

    console.log(`🔍 Buscando globalmente por: "${searchTerm}"`);

    // Obter filtros atuais
    const seasonFilter = document.getElementById('season-filter');
    const modeFilter = document.getElementById('mode-filter');

    const season = seasonFilter?.value || '12';
    const mode = modeFilter?.value || 'rm_solo';

    // Mostrar loading
    const container = document.getElementById('players-container');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-search fa-spin"></i> 
                <div>Buscando "${searchTerm}" em todos os jogadores...</div>
                <small>Verificando todas as páginas</small>
            </div>
        `;
    }

    try {
        // Buscar na API global
        const response = await fetch(`/api/players/search?q=${encodeURIComponent(searchTerm)}&season=${season}&mode=${mode}`);

        if (!response.ok) {
            throw new Error(`Erro na busca: ${response.status}`);
        }

        const searchResults = await response.json();
        displayGlobalSearchResults(searchResults, searchTerm, season, mode);

    } catch (error) {
        console.error('❌ Erro na busca global:', error);
        showSearchError(searchTerm);
    }
}

// NOVA FUNÇÃO: Exibir resultados da busca global (VERSÃO CORRIGIDA COM HYPERLINKS)
function displayGlobalSearchResults(players, searchTerm, season, mode) {
    const container = document.getElementById('players-container');
    if (!container) return;

    // Esconder paginação durante a busca
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.style.display = 'none';
    }

    if (players.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Nenhum jogador encontrado</h3>
                <p>Não encontramos resultados para "<strong>${searchTerm}</strong>"</p>
                <p><small>Tente buscar por nome, tag do clan ou ID do aoe4world</small></p>
                <button onclick="clearGlobalSearch()" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Voltar para a leaderboard
                </button>
            </div>
        `;
        return;
    }

    const modeName = mode === 'rm_team' ? 'Team Ranked' : 'Solo Ranked';
    const seasonText = season === 'current' ? 'Season Atual' : `Season ${season}`;

    let html = `
        <div class="search-results-header">
            <div class="search-header-content">
                <h3>
                    <i class="fas fa-search"></i> 
                    Resultados da busca: "${searchTerm}"
                </h3>
                <div class="search-meta">
                    <span class="badge badge-season">${seasonText}</span>
                    <span class="badge badge-mode">${modeName}</span>
                    <span class="badge badge-count">${players.length} jogador(es) encontrado(s)</span>
                </div>
                <button onclick="clearGlobalSearch()" class="btn btn-back">
                    <i class="fas fa-arrow-left"></i> Voltar para leaderboard
                </button>
            </div>
        </div>
        <div class="players-grid search-results">
    `;

    players.forEach((player, index) => {
        const rank = index + 1;
        const elo = player.elo || 0;
        const wins = player.wins || 0;
        const totalMatches = player.total_matches || 0;
        const losses = totalMatches - wins;
        const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

        // CORREÇÃO: Adicionar hyperlink no nome do jogador
        const playerNameWithLink = `<a href="/player.html?id=${player.user_id}" class="player-link">${highlightSearchTerm(player.name, searchTerm)}</a>`;

        html += `
            <div class="player-row search-result" data-player-id="${player.user_id}">
                <div class="player-rank">#${rank}</div>
                
                <div class="player-avatar">
                    ${player.avatar_url ?
                `<img src="${player.avatar_url}" alt="${player.name}" onerror="this.style.display='none'">` :
                `<div class="avatar-placeholder">${player.name?.charAt(0)?.toUpperCase() || '?'}</div>`
            }
                </div>
                
                <div class="player-info">
                    <div class="player-name">
                        ${playerNameWithLink}
                        ${player.clan_tag ? `<span class="clan-tag">[${highlightSearchTerm(player.clan_tag, searchTerm)}]</span>` : ''}
                    </div>
                    <div class="player-details">
                        <span class="level-badge ${getLevelClass(player.level)}">${player.level || 'Bronze 1'}</span>
                        ${player.region ? `<span class="region-flag">${player.region}</span>` : ''}
                        ${player.civilization ? `<span class="civ-badge">${player.civilization}</span>` : ''}
                    </div>
                </div>
                
                <div class="player-stats">
                    <div class="stat">
                        <span class="stat-value">${elo}</span>
                        <span class="stat-label">ELO</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${winRate}%</span>
                        <span class="stat-label">Win Rate</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${totalMatches}</span>
                        <span class="stat-label">Jogos</span>
                    </div>
                </div>
                
                <div class="player-actions">
                    <button class="btn-view-profile" onclick="viewPlayerProfile(${player.user_id})">
                        <i class="fas fa-user"></i> Ver Perfil
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// NOVA FUNÇÃO: Destacar termo da busca
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text || '';

    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);

    if (index >= 0) {
        return text.substring(0, index) +
            '<mark class="search-highlight">' + text.substring(index, index + searchTerm.length) + '</mark>' +
            text.substring(index + searchTerm.length);
    }

    return text;
}

// NOVA FUNÇÃO: Limpar busca global e voltar para paginação normal
function clearGlobalSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.value = '';
    }

    // Mostrar paginação novamente
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.style.display = 'flex';
    }

    // Recarregar a leaderboard normal
    const currentMode = document.getElementById('mode-filter')?.value || 'rm_solo';
    const currentSeason = document.getElementById('season-filter')?.value || '12';

    if (typeof loadRealPlayers !== 'undefined') {
        console.log('🔄 Voltando para leaderboard normal');
        loadRealPlayers(1, currentSeason, currentMode);
    }
}

// NOVA FUNÇÃO: Mostrar erro na busca
function showSearchError(searchTerm) {
    const container = document.getElementById('players-container');
    if (container) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro na busca</h3>
                <p>Ocorreu um erro ao buscar por "<strong>${searchTerm}</strong>"</p>
                <div class="error-actions">
                    <button onclick="performGlobalSearch()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Tentar novamente
                    </button>
                    <button onclick="clearGlobalSearch()" class="btn btn-secondary">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                </div>
            </div>
        `;
    }
}

// FUNÇÃO AUXILIAR: Obter classe CSS do nível
function getLevelClass(level) {
    if (!level) return 'level-bronze';

    const levelLower = level.toLowerCase();
    if (levelLower.includes('conquer')) return 'level-conqueror';
    if (levelLower.includes('diamante')) return 'level-diamond';
    if (levelLower.includes('platina')) return 'level-platinum';
    if (levelLower.includes('ouro')) return 'level-gold';
    if (levelLower.includes('prata')) return 'level-silver';
    return 'level-bronze';
}

// FUNÇÃO AUXILIAR: Ver perfil do jogador
function viewPlayerProfile(userId) {
    window.location.href = `/player.html?id=${userId}`;
}

// Filter update function
function updateFilters() {
    const modeFilter = document.getElementById('mode-filter');
    const seasonFilter = document.getElementById('season-filter');

    const currentMode = modeFilter?.value || 'rm_solo';
    const currentSeason = seasonFilter?.value || '12';

    const modeName = currentMode === 'rm_team' ? 'Team Ranked' : 'Solo Ranked';
    const seasonText = currentSeason === 'current' ? 'Current Season' : `Season ${currentSeason}`;

    console.log(`🔄 Alterando filtros: ${seasonText}, ${modeName}`);

    // Limpar busca quando mudar filtros
    clearGlobalSearch();

    // Adicionar feedback visual
    const container = document.getElementById('players-container');
    if (container) {
        container.innerHTML = `<div class="loading"><i class="fas fa-sync fa-spin"></i> Carregando ${seasonText} - ${modeName}...</div>`;
    }

    // Reset para página 1 quando mudar filtros
    if (typeof loadRealPlayers !== 'undefined') {
        setTimeout(() => {
            loadRealPlayers(1, currentSeason, currentMode);
        }, 300);
    }
}

// Export functions
window.filterModule = {
    setupFilters,
    updateFilters,
    performGlobalSearch,
    clearGlobalSearch,
    displayGlobalSearchResults
};