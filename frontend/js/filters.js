// Filter and search functionality
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
    
    // Search functionality
    const searchButton = document.querySelector('.search-box button');
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    // Allow pressing Enter to search
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // MODIFICADO: Mostrar modo atual no console
    const currentMode = document.getElementById('mode-filter')?.value || 'rm_solo';
    const currentSeason = document.getElementById('season-filter')?.value || 'current';
    console.log(`🔧 Filtros configurados - Season: ${currentSeason}, Modo: ${currentMode}`);
}

// MODIFICAR: Filter update function com feedback visual
function updateFilters() {
    const modeFilter = document.getElementById('mode-filter');
    const seasonFilter = document.getElementById('season-filter');
    
    const currentMode = modeFilter?.value || 'rm_solo';
    const currentSeason = seasonFilter?.value || 'current';
    
    const modeName = currentMode === 'rm_team' ? 'Team Ranked' : 'Solo Ranked';
    const seasonText = currentSeason === 'current' ? 'Current Season' : `Season ${currentSeason}`;
    
    console.log(`🔄 Alterando filtros: ${seasonText}, ${modeName}`);
    
    // Adicionar feedback visual
    const container = document.getElementById('players-container');
    if (container) {
        container.innerHTML = `<div class="loading"><i class="fas fa-sync fa-spin"></i> Carregando ${seasonText} - ${modeName}...</div>`;
    }
    
    // Reset para página 1 quando mudar filtros
    if (typeof loadRealPlayers !== 'undefined') {
        // Pequeno delay para mostrar o feedback
        setTimeout(() => {
            loadRealPlayers(1, currentSeason, currentMode);
        }, 300);
    }
}

// Search function
function performSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm) {
        // Filter current players
        const playerRows = document.querySelectorAll('.player-row');
        let visibleCount = 0;
        
        playerRows.forEach(row => {
            const playerName = row.querySelector('.player-name').textContent.toLowerCase();
            if (playerName.includes(searchTerm)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show message if no results
        const container = document.getElementById('players-container');
        const noResults = container.querySelector('.no-results');
        
        if (visibleCount === 0) {
            if (!noResults) {
                const noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'loading no-results';
                noResultsMsg.innerHTML = `<i class="fas fa-search"></i> Nenhum player encontrado para "${searchTerm}"`;
                container.appendChild(noResultsMsg);
            }
        } else if (noResults) {
            noResults.remove();
        }
    } else {
        // Show all players if search is empty
        const playerRows = document.querySelectorAll('.player-row');
        playerRows.forEach(row => {
            row.style.display = '';
        });
        
        const noResults = document.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
    }
}

// Função para setup de filtros avançados (se necessário no futuro)
function setupAdvancedFilters() {
    console.log('⚙️ Configurando filtros avançados...');
    // Esta função pode ser expandida para filtros mais complexos no futuro
}

// Export functions
window.filterModule = {
    setupFilters,
    setupAdvancedFilters,
    updateFilters,
    performSearch
};