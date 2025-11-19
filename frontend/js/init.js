// Sistema de inicialização robusto
console.log('🚀 Inicializando AOE4 Rankings...');

// Verificar dependências críticas
function checkDependencies() {
    const missing = [];

    if (typeof window.apiService === 'undefined') {
        missing.push('apiService');
    }

    if (typeof window.playerModule === 'undefined') {
        missing.push('playerModule');
    }

    if (typeof window.filterModule === 'undefined') {
        missing.push('filterModule');
    }

    if (missing.length > 0) {
        console.error('❌ Dependências faltando:', missing);
        return false;
    }

    console.log('✅ Todas as dependências carregadas');
    return true;
}

// Função para carregar o site
async function initializeSite() {
    console.log('🎮 Inicializando site...');

    if (!checkDependencies()) {
        showError('Erro: Módulos não carregados corretamente. Verifique o console.');
        return;
    }

    try {
        // Carregar filtros primeiro
        await loadFilters();

        // Carregar dados reais da API
        await loadRealPlayers();

        // Setup filters and search
        window.filterModule.setupFilters();

        console.log('✅ Site inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showError('Erro durante a inicialização: ' + error.message);
    }
}

// MODIFICAR: Carregar filtros com TODAS SEASONS, SEM "All Seasons"
async function loadFilters() {
    try {
        console.log('🔄 Carregando filtros...');

        // Carregar temporadas
        const seasons = await window.apiService.getSeasons();
        const seasonFilter = document.getElementById('season-filter');

        if (seasonFilter && seasons.length > 0) {
            // Encontrar season atual (ongoing)
            const currentSeason = seasons.find(s => s.status === 'ongoing') || seasons[0];

            // MOSTRAR TODAS SEASONS, SEM "All Seasons"
            seasonFilter.innerHTML = seasons.map(season =>
                `<option value="${season.id}" ${season.id === currentSeason.id ? 'selected' : ''}>
                    ${season.name}${season.status === 'ongoing' ? ' ⚡' : ''}
                </option>`
            ).join('');
            console.log(`✅ ${seasons.length} temporadas carregadas no filtro (sem "All Seasons")`);
        }

        // Carregar modos de jogo
        const gameModes = await window.apiService.getGameModes();
        const modeFilter = document.getElementById('mode-filter');

        if (modeFilter && gameModes.length > 0) {
            modeFilter.innerHTML = gameModes.map(mode =>
                `<option value="${mode.id}" ${mode.id === 'rm_solo' ? 'selected' : ''}>${mode.name}</option>`
            ).join('');
            console.log(`✅ ${gameModes.length} modos de jogo carregados no filtro`);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar filtros:', error);
        // Usar fallback SEM "All Seasons"
        setupFallbackFilters();
    }
}

// MODIFICAR: Fallback para filtros com TODAS SEASONS, SEM "All Seasons"
function setupFallbackFilters() {
    const seasonFilter = document.getElementById('season-filter');
    const modeFilter = document.getElementById('mode-filter');

    if (seasonFilter) {
        // TODAS SEASONS 1-12, SEM "All Seasons"
        seasonFilter.innerHTML = `
            <option value="12" selected>Temporada 12 ⚡</option>
            <option value="11">Temporada 11</option>
            <option value="10">Temporada 10</option>
            <option value="9">Temporada 9</option>
            <option value="8">Temporada 8</option>
            <option value="7">Temporada 7</option>
            <option value="6">Temporada 6</option>
            <option value="5">Temporada 5</option>
            <option value="4">Temporada 4</option>
            <option value="3">Temporada 3</option>
            <option value="2">Temporada 2</option>
            <option value="1">Temporada 1</option>
        `;
    }

    if (modeFilter) {
        modeFilter.innerHTML = `
            <option value="rm_solo" selected>Classificação solo</option>
            <option value="rm_team">Classificação em equipe</option>
        `;
    }

    console.log('📋 Usando filtros fallback (TODAS seasons, sem "All Seasons")');
}

// MODIFICAR: Atualizar função para carregar players com seasons
async function loadRealPlayers(page = 1, season = 'current', mode = 'rm_solo') {
    const container = document.getElementById('players-container');
    if (!container) {
        console.error('❌ Container de players não encontrado!');
        return;
    }

    // Determinar texto para exibição
    let seasonText = season === 'current' ? 'Temporada atual' : `Temporada ${season}`;
    const modeName = mode === 'rm_team' ? 'Classificação em equipe' : 'Classificação solo';
    const modeIcon = mode === 'rm_team' ? '👥' : '👤';

    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> 
            <div>Carregando ${modeName} ${modeIcon}</div>
            <small>${seasonText} • Página ${page} • Buscando dados do AOE4 World...</small>
        </div>
    `;

    try {
        const data = await window.apiService.getPlayers(page, 25, season, mode);

        if (data && data.players && data.players.length > 0) {
            const sourceInfo = data.using_mock ? ' (dados mock)' : data.using_fallback ? ' (fallback)' : ' (dados reais)';

            console.log(`🎯 ${data.players.length} players carregados ${sourceInfo}`);
            console.log(`📊 ${modeName} - ${seasonText} - Página ${data.pagination.current_page} de ${data.pagination.total_pages}`);

            window.playerModule.renderPlayers(data.players);
            renderPagination(data.pagination, season, mode);

            // Atualizar título com informações
            updateSectionTitle(mode, season, data.pagination.total_players);

            // Atualizar estatísticas
            await updateStats(data.players, data.pagination, mode, season, data.using_mock);
        } else {
            throw new Error('Nenhum player encontrado na API');
        }

    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        showError(error.message, container);
    }
}

// MODIFICAR: Atualizar título da seção com season
function updateSectionTitle(mode, season, totalPlayers) {
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        const modeName = mode === 'rm_team' ? 'Classificação em equipe' : 'Classificação solo';
        const modeIcon = mode === 'rm_team' ? '👥' : '👤';
        const seasonText = season === 'current' ? 'Temporada atual' : `Season ${season}`;

        sectionTitle.innerHTML = `
            Classificações dos jogadores - ${modeName} ${modeIcon} 
            <small style="font-size: 0.6em; color: #a0aec0;">
                (${seasonText} • ${totalPlayers} jogadores)
            </small>
        `;
    }
}

// MODIFICAR: Atualizar função de estatísticas para incluir season
async function updateStats(players, pagination, mode = 'rm_solo', season = 'current', usingMock = false) {
    if (!players || players.length === 0) return;

    const totalPlayers = pagination ? pagination.total_players : players.length;
    const activePlayers = players.filter(p => p.total_games > 0).length;
    const avgElo = Math.round(players.reduce((sum, p) => sum + (p.elo || 0), 0) / players.length);
    const topPlayer = players[0];

    const modeName = mode === 'rm_team' ? 'Classificação em equipe' : 'Classificação solo';
    const seasonText = season === 'current' ? 'Temporada atual' : `Temporada ${season}`;
    const dataSource = usingMock ? 'dados demonstrativos' : 'dados reais';

    console.log(`📊 Estatísticas ${modeName} - ${seasonText} (${dataSource}): ${totalPlayers} players, ${activePlayers} ativos, ELO médio: ${avgElo}`);

    // Buscar estatísticas detalhadas do backend
    try {
        const stats = await window.apiService.getStats();
        if (stats) {
            updateHeroStats(totalPlayers, stats, topPlayer, mode, season, usingMock);
        } else {
            updateHeroStats(totalPlayers, null, topPlayer, mode, season, usingMock);
        }
    } catch (error) {
        console.log('Não foi possível buscar estatísticas detalhadas:', error);
        updateHeroStats(totalPlayers, null, topPlayer, mode, season, usingMock);
    }
}

// MODIFICAR: Atualizar hero section para mostrar season
function updateHeroStats(totalPlayers, detailedStats, topPlayer, mode = 'rm_solo', season = 'current', usingMock = false) {
    const hero = document.querySelector('.hero p');
    if (!hero) return;

    const modeName = mode === 'rm_team' ? 'Team Ranked' : 'Solo Ranked';
    const modeIcon = mode === 'rm_team' ? '👥' : '👤';
    const seasonText = season === 'current' ? 'Current Season' : `Season ${season}`;
    let statsHTML = `Acompanhe as estatísticas, classificações e histórico de partidas dos jogadores em Age of Empires IV.`;

    if (detailedStats) {
        statsHTML += `<br>
            <div style="margin-top: 10px; display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; font-size: 0.9rem;">
                <strong>${modeIcon} ${modeName}</strong>
                <strong>📅 ${seasonText}</strong>
                <strong>🎯 ${totalPlayers} Players</strong>
                <strong>🏆 ${detailedStats.total_clans} Clans</strong>
                <strong>⭐ ELO Avg: ${detailedStats.average_elo}</strong>
                ${detailedStats.top_player ? `<strong>👑 ${detailedStats.top_player.name}: ${detailedStats.top_player.points}pts</strong>` : ''}
            </div>
        `;
    } else {
        statsHTML += `<br>
            <div style="margin-top: 10px;">
                <strong>${modeIcon} ${modeName}</strong> • 
                <strong>📅 ${seasonText}</strong> • 
                <strong>${totalPlayers} players registrados</strong>
                ${topPlayer ? ` • <strong>Top Player: ${topPlayer.name} (${topPlayer.points}pts)</strong>` : ''}
            </div>
        `;
    }

    hero.innerHTML = statsHTML;
}

// MODIFICAR: Atualizar paginação para incluir estatísticas
function renderPagination(pagination, season = 'current', mode = 'rm_solo') {
    const existingPagination = document.getElementById('pagination-controls');
    if (existingPagination) {
        existingPagination.remove();
    }

    const container = document.querySelector('.container');
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'pagination-controls';
    paginationDiv.className = 'pagination';

    const { current_page, total_pages, has_prev, has_next, total_players } = pagination;

    // Contar jogadores com e sem pontos na página atual
    const playersContainer = document.getElementById('players-container');
    const playersWithPoints = playersContainer ? playersContainer.querySelectorAll('.player-row:not(.unranked)').length : 0;
    const playersWithoutPoints = playersContainer ? playersContainer.querySelectorAll('.player-row.unranked').length : 0;

    let html = `
        <div class="pagination-info">
            <div>Página ${current_page} de ${total_pages}</div>
            <div>${total_players} jogadores no total</div>
            <div style="font-size: 0.8rem; color: #a0aec0; margin-top: 5px;">
                🎯 ${playersWithPoints} ranqueados • ⏸️ ${playersWithoutPoints} não ranqueados
            </div>
        </div>
        <div class="pagination-buttons">
    `;

    // ... (resto do código de paginação mantido)

    // Botão anterior
    if (has_prev) {
        html += `<button class="pagination-btn" onclick="loadRealPlayers(${current_page - 1}, '${season}', '${mode}')">
                    <i class="fas fa-chevron-left"></i> Anterior
                 </button>`;
    } else {
        html += `<button class="pagination-btn disabled" disabled>
                    <i class="fas fa-chevron-left"></i> Anterior
                 </button>`;
    }

    // Números das páginas (máximo 5 páginas visíveis)
    const startPage = Math.max(1, current_page - 2);
    const endPage = Math.min(total_pages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
        if (i === current_page) {
            html += `<button class="pagination-btn active">${i}</button>`;
        } else {
            html += `<button class="pagination-btn" onclick="loadRealPlayers(${i}, '${season}', '${mode}')">${i}</button>`;
        }
    }

    // Botão próximo
    if (has_next) {
        html += `<button class="pagination-btn" onclick="loadRealPlayers(${current_page + 1}, '${season}', '${mode}')">
                    Próximo <i class="fas fa-chevron-right"></i>
                 </button>`;
    } else {
        html += `<button class="pagination-btn disabled" disabled>
                    Próximo <i class="fas fa-chevron-right"></i>
                 </button>`;
    }

    html += `</div>`;
    paginationDiv.innerHTML = html;

    // Inserir após a tabela
    const leaderboard = document.querySelector('.leaderboard');
    leaderboard.parentNode.insertBefore(paginationDiv, leaderboard.nextSibling);
}

// Função para mostrar erro
function showError(message, container = null) {
    const target = container || document.getElementById('players-container');
    if (!target) return;

    target.innerHTML = `
        <div class="loading">
            <i class="fas fa-exclamation-triangle" style="color: #e53e3e;"></i>
            <p>Erro ao carregar dados</p>
            <small>${message}</small>
            <button onclick="loadRealPlayers()" style="margin-top: 10px; padding: 8px 16px; background: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                Tentar Novamente
            </button>
            <div style="margin-top: 10px; font-size: 0.8rem;">
                <strong>Debug:</strong> Verifique se o backend está rodando corretamente
            </div>
        </div>
    `;
}

// Aguardar o DOM carregar e então inicializar
document.addEventListener('DOMContentLoaded', function () {
    console.log('📄 DOM carregado, verificando dependências...');

    // Pequeno delay para garantir que todos os scripts carregaram
    setTimeout(() => {
        initializeSite();
    }, 100);
});

// Exportar funções para uso global
window.loadRealPlayers = loadRealPlayers;
window.showError = showError;
window.initializeSite = initializeSite;

console.log('✅ init.js carregado');
