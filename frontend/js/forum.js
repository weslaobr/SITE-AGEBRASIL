// forum.js - VERSÃO CORRIGIDA - CARREGAMENTO SIMPLIFICADO
class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;

        console.log('🔧 Inicializando ForumUI...');

        try {
            // Aguardar carregamento do API
            await this.waitForAPI();

            console.log('👤 Estado de autenticação:', this.api.currentUser ? 'Logado' : 'Não logado');

            this.checkAuthState();
            await this.loadAllData();
            this.setupEventListeners();

            this.initialized = true;
            console.log('✅ ForumUI inicializado com sucesso');

        } catch (error) {
            console.error('❌ Erro na inicialização do ForumUI:', error);
        }
    }

    async waitForAPI() {
        let attempts = 0;
        const maxAttempts = 10;

        while (!this.api || !this.api.categories) {
            if (attempts >= maxAttempts) {
                throw new Error('API não carregada após ' + maxAttempts + ' tentativas');
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            console.log(`⏳ Aguardando API... (${attempts}/${maxAttempts})`);
        }
    }

    async loadAllData() {
        console.log('📥 Carregando todos os dados...');

        try {
            await this.loadStats();
            await this.loadCategories();
            await this.loadRecentTopics();
            this.loadCategoryOptions();

            console.log('✅ Todos os dados carregados');
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
    }

    checkAuthState() {
        const user = this.api.currentUser;
        const authElements = document.querySelectorAll('[data-auth-only]');
        const noAuthElements = document.querySelectorAll('[data-no-auth]');

        console.log('🔐 Verificando autenticação:', user ? 'Logado' : 'Não logado');

        if (user) {
            authElements.forEach(el => el.style.display = '');
            noAuthElements.forEach(el => el.style.display = 'none');
            this.updateUserInfo(user);
        } else {
            authElements.forEach(el => el.style.display = 'none');
            noAuthElements.forEach(el => el.style.display = '');
        }
    }

    updateUserInfo(user) {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && user) {
            const avatarUrl = this.api.getAvatarUrl(user.id, user.avatar);
            userInfoElement.innerHTML = `
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${user.username}">
                </div>
                <span class="user-name">${user.global_name || user.username}</span>
            `;
        }
    }

    async loadStats() {
        try {
            console.log('📊 Carregando estatísticas...');
            const stats = await this.api.getStats();

            const container = document.getElementById('forum-stats');
            if (!container) {
                console.error('❌ Container de stats não encontrado');
                return;
            }

            container.innerHTML = `
                <div class="forum-stat">
                    <i class="fas fa-comments"></i>
                    <div>
                        <div class="number">${stats.totalTopics || 0}</div>
                        <div class="label">Tópicos</div>
                    </div>
                </div>
                <div class="forum-stat">
                    <i class="fas fa-reply"></i>
                    <div>
                        <div class="number">${stats.totalReplies || 0}</div>
                        <div class="label">Respostas</div>
                    </div>
                </div>
                <div class="forum-stat">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="number">${stats.totalMembers || 0}</div>
                        <div class="label">Membros</div>
                    </div>
                </div>
                <div class="forum-stat">
                    <i class="fas fa-user-clock"></i>
                    <div>
                        <div class="number">${stats.onlineNow || 0}</div>
                        <div class="label">Online agora</div>
                    </div>
                </div>
            `;

            console.log('✅ Estatísticas carregadas');

        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    async loadCategories() {
        try {
            console.log('📂 Carregando categorias...');

            const container = document.getElementById('categories-list');
            if (!container) {
                console.error('❌ Container de categorias não encontrado');
                return;
            }

            if (!this.api.categories || this.api.categories.length === 0) {
                console.warn('⚠️ Nenhuma categoria encontrada');
                container.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-folder-open"></i>
                        <h3>Nenhuma categoria disponível</h3>
                        <p>As categorias serão carregadas em breve...</p>
                    </div>
                `;
                return;
            }

            const html = this.api.categories.map(cat => `
                <div class="category-card" onclick="forumUI.viewCategory('${cat.slug}')">
                    <div class="category-header">
                        <div class="category-icon" style="background: linear-gradient(135deg, ${cat.color || '#e53e3e'}, #3e8ce5);">
                            <i class="${cat.icon || 'fas fa-folder'}"></i>
                        </div>
                        <div class="category-info">
                            <div class="category-title">${cat.name}</div>
                            <div class="category-description">${cat.description || 'Descrição da categoria'}</div>
                        </div>
                        <div class="category-stats">
                            <div class="stat">
                                <i class="fas fa-comment"></i>
                                <span>${cat.topic_count || 0} tópicos</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-reply"></i>
                                <span>${cat.reply_count || 0} respostas</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
            console.log(`✅ ${this.api.categories.length} categorias carregadas`);

        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
        }
    }

    async loadRecentTopics() {
        try {
            console.log('📝 Carregando tópicos recentes...');
            const topics = await this.api.getTopics();
            const recentTopics = topics.slice(0, 5);

            const container = document.getElementById('recent-topics-list');
            if (!container) {
                console.error('❌ Container de tópicos não encontrado');
                return;
            }

            if (recentTopics.length === 0) {
                console.log('ℹ️ Nenhum tópico encontrado');
                container.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-comments"></i>
                        <h3>Nenhum tópico encontrado</h3>
                        <p>Seja o primeiro a criar um tópico no fórum!</p>
                    </div>
                `;
                return;
            }

            console.log(`📋 Carregando ${recentTopics.length} tópicos`);

            const html = await Promise.all(recentTopics.map(async (topic) => {
                const replies = await this.api.getReplies(topic.id);
                const replyCount = replies.length;
                const avatarUrl = this.api.getAvatarUrl(topic.authorId, topic.authorAvatar);

                return `
                    <div class="topic-item" onclick="forumUI.viewTopic(${topic.id})">
                        <div class="topic-avatar">
                            <img src="${avatarUrl}" alt="${topic.author}">
                        </div>
                        <div class="topic-content">
                            <div class="topic-title">
                                ${topic.isPinned ? '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 5px;"></i>' : ''}
                                ${topic.title}
                            </div>
                            <div class="topic-meta">
                                <span>por ${topic.author}</span>
                                <span>${this.formatDate(topic.updatedAt || topic.createdAt)}</span>
                            </div>
                        </div>
                        <div class="topic-stats">
                            <div class="stat">
                                <i class="fas fa-reply"></i>
                                <span>${replyCount}</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-eye"></i>
                                <span>${topic.views || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            }));

            container.innerHTML = html.join('');
            console.log('✅ Tópicos recentes carregados');

        } catch (error) {
            console.error('❌ Erro ao carregar tópicos recentes:', error);
            const container = document.getElementById('recent-topics-list');
            if (container) {
                container.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erro ao carregar tópicos</h3>
                        <p>Tente recarregar a página</p>
                    </div>
                `;
            }
        }
    }

    loadCategoryOptions() {
        try {
            const select = document.getElementById('topicCategory');
            if (!select) return;

            select.innerHTML = '<option value="">Selecione uma categoria</option>';

            if (!this.api.categories || this.api.categories.length === 0) {
                console.warn('⚠️ Nenhuma categoria para o select');
                return;
            }

            this.api.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });

            console.log(`✅ ${this.api.categories.length} opções carregadas no select`);

        } catch (error) {
            console.error('❌ Erro ao carregar opções:', error);
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Data desconhecida';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Agora mesmo';
            if (minutes < 60) return `${minutes} min atrás`;
            if (hours < 24) return `${hours} h atrás`;
            if (days < 7) return `${days} dias atrás`;

            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    setupEventListeners() {
        // Formulário de novo tópico
        const form = document.getElementById('newTopicForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
        }

        // Botões de login/logout
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.redirectToLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        console.log('✅ Event listeners configurados');
    }

    redirectToLogin() {
        localStorage.setItem('returnUrl', window.location.href);
        window.location.href = 'forum-auth.html';
    }

    logout() {
        if (window.authManager) {
            window.authManager.clearAuth();
        }
        window.location.reload();
    }

    async createNewTopic() {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para criar tópicos', 'error');
            this.redirectToLogin();
            return;
        }

        const categoryId = document.getElementById('topicCategory').value;
        const title = document.getElementById('topicTitle').value;
        const content = document.getElementById('topicContent').value;

        if (!categoryId || !title || !content) {
            this.showNotification('Preencha todos os campos', 'error');
            return;
        }

        try {
            await this.api.createTopic({ categoryId, title, content });

            this.showNotification('Tópico criado com sucesso!', 'success');
            closeNewTopicModal();

            // Recarregar dados
            await this.loadAllData();

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Implementação da notificação (manter a mesma)
        console.log(`📢 ${type}: ${message}`);
    }

    viewCategory(slug) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para acessar categorias', 'error');
            return;
        }
        window.location.href = `forum-category.html?category=${slug}`;
    }

    viewTopic(id) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para acessar tópicos', 'error');
            return;
        }
        window.location.href = `forum-topic.html?id=${id}`;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, iniciando ForumUI...');

    // Aguardar um pouco para garantir que tudo está carregado
    setTimeout(() => {
        window.forumUI = new ForumUI();
    }, 100);
});