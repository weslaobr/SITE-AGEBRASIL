// frontend/js/torneios.js

class TorneiosManager {
    constructor() {
        this.api = new LiquipediaAPI();
        this.tournaments = [];
        this.filteredTournaments = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        console.log('Iniciando carregamento de torneios...');
        await this.loadTournaments();
        this.setupEventListeners();
        this.setupAutoRefresh();
    }

    async loadTournaments() {
        this.updateAPIStatus('loading', 'Carregando torneios...');
        
        try {
            console.log('Buscando dados da API...');
            this.tournaments = await this.api.getTournaments();
            console.log('Torneios carregados:', this.tournaments.length);
            
            if (this.tournaments.length === 0) {
                throw new Error('Nenhum torneio encontrado');
            }
            
            this.applyFilter(this.currentFilter);
            this.updateCounters();
            this.updateTimeline();
            this.displayTournaments();
            
            this.updateAPIStatus('success', `${this.tournaments.length} torneios carregados!`);
            
        } catch (error) {
            console.error('Erro crítico:', error);
            this.updateAPIStatus('error', 'Erro ao carregar. Usando dados locais.');
            
            // Forçar dados locais
            this.tournaments = this.getFallbackTournaments();
            this.applyFilter(this.currentFilter);
            this.updateCounters();
            this.updateTimeline();
            this.displayTournaments();
        }
    }

    getFallbackTournaments() {
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
            }
        ];
    }

    applyFilter(filter) {
        this.currentFilter = filter;
        
        switch(filter) {
            case 'all':
                this.filteredTournaments = [...this.tournaments];
                break;
            case 'ongoing':
                this.filteredTournaments = this.tournaments.filter(t => t.status === 'ongoing');
                break;
            case 'upcoming':
                this.filteredTournaments = this.tournaments.filter(t => t.status === 'upcoming');
                break;
            case 'completed':
                this.filteredTournaments = this.tournaments.filter(t => t.status === 'completed');
                break;
            case 'featured':
                this.filteredTournaments = this.tournaments.filter(t => t.featured);
                break;
            default:
                this.filteredTournaments = [...this.tournaments];
        }
        
        console.log(`Filtro "${filter}" aplicado: ${this.filteredTournaments.length} torneios`);
    }

    updateCounters() {
        const total = this.tournaments.length;
        const ongoing = this.tournaments.filter(t => t.status === 'ongoing').length;
        const upcoming = this.tournaments.filter(t => t.status === 'upcoming').length;
        
        document.getElementById('totalCount').textContent = total;
        document.getElementById('ongoingCount').textContent = ongoing;
        document.getElementById('upcomingCount').textContent = upcoming;
    }

    updateTimeline() {
        const timeline = document.getElementById('timeline');
        const upcomingEvents = this.tournaments
            .filter(t => t.status === 'upcoming' || t.status === 'ongoing')
            .slice(0, 5);
        
        if (upcomingEvents.length === 0) {
            timeline.innerHTML = `
                <h4 style="margin-top:0;">Timeline • Próximos eventos</h4>
                <p>Nenhum evento próximo no momento</p>
            `;
            return;
        }
        
        let timelineHTML = '<h4 style="margin-top:0;">Timeline • Próximos eventos</h4>';
        
        upcomingEvents.forEach(event => {
            const statusBadge = event.status === 'ongoing' ? 
                '<span style="color: #48bb78; font-size: 0.8em;">▶ AO VIVO</span>' : 
                '<span style="color: #ed8936; font-size: 0.8em;">⏳ EM BREVE</span>';
            
            timelineHTML += `
                <div class="item">
                    <div>
                        <strong>${this.escapeHtml(event.name)}</strong>
                        ${statusBadge}
                        <div style="font-size: 0.9em; color: #a0aec0;">${this.escapeHtml(event.date)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold; color: #f6e05e;">${this.escapeHtml(event.prize)}</div>
                        <div style="font-size: 0.9em;">${this.escapeHtml(event.location)}</div>
                    </div>
                </div>
            `;
        });
        
        timeline.innerHTML = timelineHTML;
    }

    displayTournaments() {
        const container = document.getElementById('tournaments-container');
        
        if (!container) {
            console.error('Container de torneios não encontrado!');
            return;
        }
        
        if (this.filteredTournaments.length === 0) {
            container.innerHTML = `
                <div class="tournaments-grid">
                    <div class="no-tournaments">
                        <i class="fas fa-trophy" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h3>Nenhum torneio encontrado</h3>
                        <p>Tente alterar os filtros ou atualizar os dados.</p>
                        <button onclick="torneiosManager.loadTournaments()" class="action-btn" style="margin-top: 1rem;">
                            <i class="fas fa-sync-alt"></i> Tentar Novamente
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '<div class="tournaments-grid">';
        
        this.filteredTournaments.forEach(tournament => {
            html += this.createTournamentCard(tournament);
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Adicionar event listeners para os cards
        this.addCardEventListeners();
        
        console.log(`Exibindo ${this.filteredTournaments.length} torneios`);
    }

    createTournamentCard(tournament) {
        const statusClass = this.getStatusClass(tournament.status);
        const statusIcon = this.getStatusIcon(tournament.status);
        const featuredBadge = tournament.featured ? '<div class="featured-badge"><i class="fas fa-star"></i> Destaque</div>' : '';
        
        return `
            <div class="tournament-card ${statusClass}" data-tournament='${JSON.stringify(tournament).replace(/'/g, "&#39;")}'>
                ${featuredBadge}
                <div class="tournament-header">
                    <h3>${this.escapeHtml(tournament.name)}</h3>
                    <div class="tournament-prize">${this.escapeHtml(tournament.prize)}</div>
                </div>
                <div class="tournament-status ${statusClass}">
                    <i class="${statusIcon}"></i> ${this.getStatusText(tournament.status)}
                </div>
                <div class="tournament-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${this.escapeHtml(tournament.date)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${this.escapeHtml(tournament.location)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>${this.escapeHtml(tournament.participants)} participantes</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-trophy"></i>
                        <span>${this.escapeHtml(tournament.winner)}</span>
                    </div>
                </div>
                <button class="view-details-btn">
                    <i class="fas fa-eye"></i> Ver Detalhes
                </button>
            </div>
        `;
    }

    getStatusClass(status) {
        switch(status) {
            case 'ongoing': return 'status-ongoing';
            case 'upcoming': return 'status-upcoming';
            case 'completed': return 'status-completed';
            default: return 'status-unknown';
        }
    }

    getStatusIcon(status) {
        switch(status) {
            case 'ongoing': return 'fas fa-play-circle';
            case 'upcoming': return 'fas fa-clock';
            case 'completed': return 'fas fa-check-circle';
            default: return 'fas fa-question-circle';
        }
    }

    getStatusText(status) {
        switch(status) {
            case 'ongoing': return 'Em Andamento';
            case 'upcoming': return 'Em Breve';
            case 'completed': return 'Finalizado';
            default: return 'Desconhecido';
        }
    }

    addCardEventListeners() {
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.tournament-card');
                const tournamentData = JSON.parse(card.getAttribute('data-tournament').replace(/&#39;/g, "'"));
                this.showTournamentDetails(tournamentData);
            });
        });
    }

    showTournamentDetails(tournament) {
        const modal = document.getElementById('tournament-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        modalTitle.textContent = tournament.name;
        
        modalBody.innerHTML = `
            <div class="modal-tournament-details">
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-calendar"></i> Período:</div>
                    <div class="detail-value">${this.escapeHtml(tournament.date)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-map-marker-alt"></i> Local:</div>
                    <div class="detail-value">${this.escapeHtml(tournament.location)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-dollar-sign"></i> Premiação:</div>
                    <div class="detail-value prize-value">${this.escapeHtml(tournament.prize)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-users"></i> Participantes:</div>
                    <div class="detail-value">${this.escapeHtml(tournament.participants)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-trophy"></i> Vencedor:</div>
                    <div class="detail-value winner-value">${this.escapeHtml(tournament.winner)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-info-circle"></i> Status:</div>
                    <div class="detail-value status-badge ${this.getStatusClass(tournament.status)}">
                        <i class="${this.getStatusIcon(tournament.status)}"></i> 
                        ${this.getStatusText(tournament.status)}
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    setupEventListeners() {
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.getAttribute('data-filter');
                this.applyFilter(filter);
                this.displayTournaments();
            });
        });
        
        // Busca
        const searchInput = document.getElementById('tournament-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                if (searchTerm.length === 0) {
                    this.applyFilter(this.currentFilter);
                } else {
                    this.filteredTournaments = this.tournaments.filter(t => 
                        t.name.toLowerCase().includes(searchTerm) ||
                        t.location.toLowerCase().includes(searchTerm) ||
                        t.winner.toLowerCase().includes(searchTerm)
                    );
                }
                this.displayTournaments();
            });
        }
        
        // Atualizar
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadTournaments();
            });
        }
        
        // Fechar modal
        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                document.getElementById('tournament-modal').style.display = 'none';
            });
        }
        
        // Fechar modal clicando fora
        const modal = document.getElementById('tournament-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'tournament-modal') {
                    e.target.style.display = 'none';
                }
            });
        }
    }

    setupAutoRefresh() {
        // Atualizar a cada 5 minutos
        setInterval(() => {
            console.log('Atualização automática...');
            this.loadTournaments();
        }, 300000);
    }

    updateAPIStatus(status, message) {
        const statusElement = document.getElementById('api-status');
        if (!statusElement) return;
        
        statusElement.className = `api-status ${status}`;
        
        let icon = '';
        switch(status) {
            case 'loading':
                icon = '<i class="fas fa-sync-alt fa-spin"></i> ';
                break;
            case 'success':
                icon = '<i class="fas fa-check-circle"></i> ';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-triangle"></i> ';
                break;
        }
        
        statusElement.innerHTML = `${icon}${message}`;
    }

    escapeHtml(unsafe) {
        if (!unsafe) return 'N/A';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicializar quando o DOM estiver pronto
let torneiosManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando TorneiosManager...');
    torneiosManager = new TorneiosManager();
});