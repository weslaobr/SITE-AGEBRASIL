// forum-admin.js - Painel de Administração
class ForumAdminUI {
    constructor() {
        this.api = window.forumAPI;
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando ForumAdminUI...');

        // Verificar se é admin
        await this.waitForAuth();

        if (!this.api.isAdmin) {
            this.showError('Acesso negado. Você precisa ser administrador para acessar esta página.');
            setTimeout(() => {
                window.location.href = 'forum.html';
            }, 3000);
            return;
        }

        this.setupEventListeners();
        this.loadDashboard();
    }

    async waitForAuth() {
        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts) {
            if (this.api.currentUser !== undefined) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupEventListeners() {
        // Formulário de criar categoria
        const createCategoryForm = document.getElementById('createCategoryForm');
        if (createCategoryForm) {
            createCategoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createCategory(e.target);
            });
        }

        // Busca de tópicos
        const topicSearch = document.getElementById('topicSearch');
        if (topicSearch) {
            topicSearch.addEventListener('input', () => this.filterTopics());
        }

        // Filtros
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterTopics());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterTopics());
    }

    async loadDashboard() {
        try {
            // Carregar estatísticas
            const stats = await this.api.getStats();
            this.displayStats(stats);

            // Carregar categorias para filtros
            await this.loadCategoriesForFilter();

            // Carregar tópicos populares
            await this.loadPopularTopics();

            // Carregar atividade recente
            await this.loadRecentActivity();

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showNotification('Erro ao carregar dashboard', 'error');
        }
    }

    displayStats(stats) {
        document.getElementById('totalTopics').textContent = stats.totalTopics || 0;
        document.getElementById('totalReplies').textContent = stats.totalReplies || 0;
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('totalCategories').textContent = stats.totalCategories || 0;
    }

    async loadPopularTopics() {
        try {
            const topics = await this.api.getTopics();
            const sorted = topics.sort((a, b) => (b.repliesCount || 0) - (a.repliesCount || 0)).slice(0, 10);

            const tbody = document.getElementById('popularTopicsBody');
            if (sorted.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhum tópico encontrado</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = sorted.map(topic => {
                const category = this.api.categories.find(c => c.id == topic.categoryId);
                return `
                    <tr>
                        <td>
                            <a href="forum-topic.html?id=${topic.id}" style="color: var(--accent-color);">
                                ${topic.title}
                            </a>
                        </td>
                        <td>${category ? category.name : 'N/A'}</td>
                        <td>${topic.repliesCount || 0}</td>
                        <td>${topic.author}</td>
                        <td>${this.formatDate(topic.createdAt)}</td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Erro ao carregar tópicos populares:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const topics = await this.api.getTopics();
            const recent = topics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

            const container = document.getElementById('recentActivity');
            if (recent.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhuma atividade recente</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = recent.map(topic => `
                <div style="padding: 1rem; border-bottom: 1px solid var(--border-color);">
                    <strong>${topic.author}</strong> criou o tópico 
                    <a href="forum-topic.html?id=${topic.id}" style="color: var(--accent-color);">
                        ${topic.title}
                    </a>
                    <br>
                    <small style="color: #a0aec0;">${this.formatDate(topic.createdAt)}</small>
                </div>
            `).join('');

        } catch (error) {
            console.error('Erro ao carregar atividade recente:', error);
        }
    }

    async loadCategoriesForFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;

        categoryFilter.innerHTML = '<option value="">Todas as Categorias</option>' +
            this.api.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }

    async createCategory(form) {
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            slug: formData.get('slug'),
            description: formData.get('description'),
            icon: formData.get('icon'),
            color: formData.get('color'),
            display_order: parseInt(formData.get('display_order'))
        };

        try {
            await this.api.createCategory(data);
            this.showNotification('Categoria criada com sucesso!', 'success');
            form.reset();

            // Recarregar categorias
            await this.api.loadCategories();
            await this.loadCategoriesTab();
            await this.loadDashboard();

        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async loadCategoriesTab() {
        try {
            const tbody = document.getElementById('categoriesBody');
            if (!tbody) return;

            if (this.api.categories.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhuma categoria encontrada</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = this.api.categories.map(cat => `
                <tr>
                    <td>
                        <i class="${cat.icon}" style="color: ${cat.color};"></i>
                    </td>
                    <td>${cat.name}</td>
                    <td>${cat.slug}</td>
                    <td>${cat.topicsCount || 0}</td>
                    <td>${cat.displayOrder || 0}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-admin btn-sm btn-warning" onclick="adminUI.editCategory(${cat.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-admin btn-sm btn-danger" onclick="adminUI.deleteCategory(${cat.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    async loadTopicsTab() {
        try {
            const topics = await this.api.getTopics();
            this.allTopics = topics;
            this.displayTopics(topics);

        } catch (error) {
            console.error('Erro ao carregar tópicos:', error);
            this.showNotification('Erro ao carregar tópicos', 'error');
        }
    }

    displayTopics(topics) {
        const tbody = document.getElementById('topicsBody');
        if (!tbody) return;

        if (topics.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhum tópico encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = topics.map(topic => {
            const category = this.api.categories.find(c => c.id == topic.categoryId);
            const badges = [];
            if (topic.isPinned) badges.push('<span class="badge badge-warning">Fixado</span>');
            if (topic.isLocked) badges.push('<span class="badge badge-danger">Bloqueado</span>');

            return `
                <tr>
                    <td>
                        <a href="forum-topic.html?id=${topic.id}" style="color: var(--accent-color);">
                            ${topic.title}
                        </a>
                    </td>
                    <td>${category ? category.name : 'N/A'}</td>
                    <td>${topic.author}</td>
                    <td>${topic.repliesCount || 0}</td>
                    <td>${badges.join(' ') || '<span class="badge badge-info">Normal</span>'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-admin btn-sm btn-warning" onclick="adminUI.togglePin(${topic.id})" title="${topic.isPinned ? 'Desfixar' : 'Fixar'}">
                                <i class="fas fa-thumbtack"></i>
                            </button>
                            <button class="btn-admin btn-sm btn-warning" onclick="adminUI.toggleLock(${topic.id})" title="${topic.isLocked ? 'Desbloquear' : 'Bloquear'}">
                                <i class="fas fa-${topic.isLocked ? 'unlock' : 'lock'}"></i>
                            </button>
                            <button class="btn-admin btn-sm btn-danger" onclick="adminUI.deleteTopic(${topic.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterTopics() {
        if (!this.allTopics) return;

        const search = document.getElementById('topicSearch').value.toLowerCase();
        const categoryId = document.getElementById('categoryFilter').value;
        const status = document.getElementById('statusFilter').value;

        let filtered = this.allTopics;

        // Filtrar por busca
        if (search) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(search) ||
                t.author.toLowerCase().includes(search)
            );
        }

        // Filtrar por categoria
        if (categoryId) {
            filtered = filtered.filter(t => t.categoryId == categoryId);
        }

        // Filtrar por status
        if (status === 'pinned') {
            filtered = filtered.filter(t => t.isPinned);
        } else if (status === 'locked') {
            filtered = filtered.filter(t => t.isLocked);
        }

        this.displayTopics(filtered);
    }

    async loadUsersTab() {
        try {
            const topics = await this.api.getTopics();

            // Agregar dados por usuário
            const usersMap = new Map();

            topics.forEach(topic => {
                if (!usersMap.has(topic.authorId)) {
                    usersMap.set(topic.authorId, {
                        id: topic.authorId,
                        name: topic.author,
                        avatar: topic.authorAvatar,
                        topicsCount: 0,
                        repliesCount: 0,
                        lastActivity: topic.createdAt
                    });
                }

                const user = usersMap.get(topic.authorId);
                user.topicsCount++;

                if (new Date(topic.createdAt) > new Date(user.lastActivity)) {
                    user.lastActivity = topic.createdAt;
                }
            });

            const users = Array.from(usersMap.values());
            const tbody = document.getElementById('usersBody');

            if (users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhum usuário encontrado</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = users.map(user => {
                const isAdmin = this.api.admins.includes(user.id);
                return `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                ${user.avatar ?
                        `<img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=32" 
                                          style="width: 32px; height: 32px; border-radius: 50%;">` :
                        `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-color); display: flex; align-items: center; justify-content: center;">
                                        ${user.name.charAt(0)}
                                    </div>`
                    }
                                ${user.name}
                                ${isAdmin ? '<span class="badge badge-danger">ADMIN</span>' : ''}
                            </div>
                        </td>
                        <td>${user.topicsCount}</td>
                        <td>${user.repliesCount}</td>
                        <td>${this.formatDate(user.lastActivity)}</td>
                        <td>
                            ${isAdmin ?
                        '<span class="badge badge-danger">Administrador</span>' :
                        '<span class="badge badge-info">Membro</span>'
                    }
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    async togglePin(topicId) {
        try {
            await this.api.togglePinTopic(topicId);
            this.showNotification('Status de fixação alterado!', 'success');
            await this.loadTopicsTab();
        } catch (error) {
            console.error('Erro ao fixar/desfixar:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async toggleLock(topicId) {
        try {
            await this.api.toggleLockTopic(topicId);
            this.showNotification('Status de bloqueio alterado!', 'success');
            await this.loadTopicsTab();
        } catch (error) {
            console.error('Erro ao bloquear/desbloquear:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async deleteTopic(topicId) {
        if (!confirm('Tem certeza que deseja deletar este tópico? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            await this.api.deleteTopic(topicId);
            this.showNotification('Tópico deletado com sucesso!', 'success');
            await this.loadTopicsTab();
            await this.loadDashboard();
        } catch (error) {
            console.error('Erro ao deletar tópico:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Tem certeza que deseja deletar esta categoria? Todos os tópicos serão movidos para "Geral".')) {
            return;
        }

        try {
            // Implementar quando backend tiver endpoint
            this.showNotification('Funcionalidade em desenvolvimento', 'warning');
        } catch (error) {
            console.error('Erro ao deletar categoria:', error);
            this.showNotification(error.message, 'error');
        }
    }

    editCategory(categoryId) {
        this.showNotification('Funcionalidade de edição em desenvolvimento', 'info');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours} h atrás`;
        if (diffDays < 7) return `${diffDays} dias atrás`;

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';

        const icon = type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-triangle' :
                type === 'warning' ? 'exclamation-circle' : 'info-circle';

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' :
                type === 'error' ? '#e53e3e' :
                    type === 'warning' ? '#ed8936' : '#3e8ce5'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showError(message) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <div class="admin-card" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--admin-danger); margin-bottom: 1rem;"></i>
                    <h2>Acesso Negado</h2>
                    <p>${message}</p>
                    <button class="btn-admin" onclick="window.location.href='forum.html'">
                        <i class="fas fa-arrow-left"></i>
                        Voltar ao Fórum
                    </button>
                </div>
            `;
        }
    }
}

// Função global para trocar tabs
function switchTab(tabName) {
    // Atualizar tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Carregar conteúdo da tab
    if (window.adminUI) {
        window.adminUI.currentTab = tabName;

        switch (tabName) {
            case 'categories':
                window.adminUI.loadCategoriesTab();
                break;
            case 'topics':
                window.adminUI.loadTopicsTab();
                break;
            case 'users':
                window.adminUI.loadUsersTab();
                break;
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Painel Admin...');
    window.adminUI = new ForumAdminUI();
});
