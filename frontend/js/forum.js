// forum.js - VERSÃO CORRIGIDA PARA POSTGRESQL
class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando ForumUI para PostgreSQL...');

        try {
            // Aguardar carregamento inicial
            await this.api.loadCurrentUser();

            console.log('👤 Estado de autenticação:', this.api.currentUser ? 'Logado' : 'Não logado');
            console.log('📂 Categorias disponíveis:', this.api.categories.length);

            this.checkAuthState();
            await this.loadStats();
            await this.loadCategories();
            await this.loadRecentTopics();
            this.setupEventListeners();
            this.loadCategoryOptions();
            this.setupAuthListener();

            console.log('✅ ForumUI inicializado com sucesso');

        } catch (error) {
            console.error('❌ Erro na inicialização do ForumUI:', error);
        }
    }

    setupAuthListener() {
        document.addEventListener('authStateChanged', (event) => {
            console.log('🔄 Auth state changed no ForumUI');
            this.checkAuthState();
            if (event.detail.user) {
                this.loadRecentTopics();
                this.loadStats();
            }
        });
    }

    checkAuthState() {
        const user = this.api.currentUser;
        const authElements = document.querySelectorAll('[data-auth-only]');
        const noAuthElements = document.querySelectorAll('[data-no-auth]');

        console.log('🔐 Verificando estado de autenticação:', user ? 'Logado' : 'Não logado');

        if (user) {
            authElements.forEach(el => {
                el.style.display = '';
                console.log('✅ Elemento auth-only mostrado:', el.id);
            });
            noAuthElements.forEach(el => {
                el.style.display = 'none';
                console.log('❌ Elemento no-auth ocultado:', el.id);
            });
            this.updateUserInfo(user);
        } else {
            authElements.forEach(el => {
                el.style.display = 'none';
                console.log('❌ Elemento auth-only ocultado:', el.id);
            });
            noAuthElements.forEach(el => {
                el.style.display = '';
                console.log('✅ Elemento no-auth mostrado:', el.id);
            });
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
            console.log('👤 Informações do usuário atualizadas');
        }
    }

    async loadStats() {
        try {
            console.log('📊 Carregando estatísticas...');
            const stats = await this.api.getStats();

            const statsContainer = document.getElementById('forum-stats');
            if (!statsContainer) {
                console.error('❌ Container de stats não encontrado');
                return;
            }

            const statsHTML = `
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

            statsContainer.innerHTML = statsHTML;
            console.log('✅ Estatísticas carregadas:', stats);

        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    async loadCategories() {
        try {
            console.log('📂 Carregando categorias...');

            // Forçar recarregamento das categorias
            await this.api.loadCategories();

            const categoriesContainer = document.getElementById('categories-list');
            if (!categoriesContainer) {
                console.error('❌ Container de categorias não encontrado');
                return;
            }

            if (!this.api.categories || this.api.categories.length === 0) {
                console.warn('⚠️ Nenhuma categoria encontrada!');
                categoriesContainer.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Nenhuma categoria configurada</h3>
                        <p>Configure as categorias no sistema.</p>
                    </div>
                `;
                return;
            }

            const categoriesHTML = this.api.categories.map(category => `
                <div class="category-card" onclick="forumUI.viewCategory('${category.slug}')">
                    <div class="category-header">
                        <div class="category-icon" style="background: linear-gradient(135deg, ${category.color || '#e53e3e'}, #3e8ce5);">
                            <i class="${category.icon || 'fas fa-folder'}"></i>
                        </div>
                        <div class="category-info">
                            <div class="category-title">${category.name}</div>
                            <div class="category-description">${category.description || 'Descrição não disponível'}</div>
                        </div>
                        <div class="category-stats">
                            <div class="stat">
                                <i class="fas fa-comment"></i>
                                <span>${category.topic_count || 0} tópicos</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-reply"></i>
                                <span>${category.reply_count || 0} respostas</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            categoriesContainer.innerHTML = categoriesHTML;
            console.log('✅ Categorias carregadas:', this.api.categories.length);

        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
        }
    }

    async loadRecentTopics() {
        try {
            console.log('📝 Carregando tópicos recentes...');
            const topics = await this.api.getTopics();
            const limitedTopics = topics.slice(0, 5);

            const topicsContainer = document.getElementById('recent-topics-list');
            if (!topicsContainer) {
                console.error('❌ Container de tópicos não encontrado');
                return;
            }

            if (limitedTopics.length === 0) {
                console.log('ℹ️ Nenhum tópico encontrado');
                topicsContainer.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-comments"></i>
                        <h3>Nenhum tópico encontrado</h3>
                        <p>Seja o primeiro a criar um tópico no fórum!</p>
                    </div>
                `;
                return;
            }

            console.log(`📋 ${limitedTopics.length} tópicos para exibir`);

            const topicsHTML = await Promise.all(limitedTopics.map(async (topic) => {
                const category = this.api.categories.find(cat => cat.id == topic.categoryId);
                const replies = await this.api.getReplies(topic.id);
                const replyCount = replies.length;

                const avatarUrl = this.api.getAvatarUrl(topic.authorId, topic.authorAvatar);

                return `
                    <div class="topic-item" onclick="forumUI.viewTopic(${topic.id})">
                        <div class="topic-avatar">
                            <img src="${avatarUrl}" 
                                  alt="${topic.author}"
                                  onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">
                        </div>
                        <div class="topic-content">
                            <div class="topic-title">
                                ${topic.isPinned ? '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 5px;"></i>' : ''}
                                ${topic.title}
                            </div>
                            <div class="topic-meta">
                                <span>por ${topic.author}</span>
                                <span>em ${category?.name || 'Geral'}</span>
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

            topicsContainer.innerHTML = topicsHTML.join('');
            console.log('✅ Tópicos recentes carregados');

        } catch (error) {
            console.error('❌ Erro ao carregar tópicos recentes:', error);
            const topicsContainer = document.getElementById('recent-topics-list');
            if (topicsContainer) {
                topicsContainer.innerHTML = `
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
            console.log('📋 Carregando opções de categoria...');

            const select = document.getElementById('topicCategory');
            if (!select) {
                console.error('❌ Elemento select não encontrado! ID: topicCategory');
                return;
            }

            select.innerHTML = '<option value="">Selecione uma categoria</option>';

            if (!this.api.categories || this.api.categories.length === 0) {
                console.warn('⚠️ Nenhuma categoria disponível para carregar no select');
                return;
            }

            this.api.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });

            console.log('✅ Opções de categoria carregadas:', this.api.categories.length);

        } catch (error) {
            console.error('❌ Erro ao carregar opções de categoria:', error);
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Data desconhecida';

        try {
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

            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    setupEventListeners() {
        console.log('🔗 Configurando event listeners...');

        const form = document.getElementById('newTopicForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
            console.log('✅ Listener do formulário configurado');
        }

        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.redirectToLogin();
            });
            console.log('✅ Listener do login configurado');
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
            console.log('✅ Listener do logout configurado');
        }

        this.setupAuthGuards();
    }

    setupAuthGuards() {
        const protectedLinks = document.querySelectorAll('a[href*="forum-topic"], a[href*="forum-category"]');
        protectedLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (!this.api.currentUser) {
                    e.preventDefault();
                    this.showNotification('Faça login com Discord para acessar esta página.', 'error');
                    this.redirectToLogin();
                }
            });
        });
    }

    redirectToLogin() {
        localStorage.setItem('returnUrl', window.location.href);
        if (window.discordAuth) {
            window.discordAuth.login();
        } else {
            window.location.href = 'forum-auth.html';
        }
    }

    logout() {
        if (window.discordAuth) {
            window.discordAuth.logout();
        } else {
            window.authManager.clearAuth();
        }
    }

    async createNewTopic() {
        console.log('📝 Iniciando criação de novo tópico...');

        if (!this.api.currentUser) {
            this.showNotification('Você precisa fazer login com Discord para criar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }

        const categoryId = document.getElementById('topicCategory').value;
        const title = document.getElementById('topicTitle').value;
        const content = document.getElementById('topicContent').value;

        console.log('📋 Dados do formulário:', { categoryId, title, content });

        if (!categoryId || !title || !content) {
            this.showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }

        if (title.length < 5) {
            this.showNotification('O título deve ter pelo menos 5 caracteres.', 'error');
            return;
        }

        if (content.length < 10) {
            this.showNotification('O conteúdo deve ter pelo menos 10 caracteres.', 'error');
            return;
        }

        try {
            const topicData = {
                categoryId: parseInt(categoryId),
                title: title.trim(),
                content: content.trim()
            };

            console.log('📤 Enviando dados para criação:', topicData);

            await this.api.createTopic(topicData);

            await this.loadStats();
            await this.loadCategories();
            await this.loadRecentTopics();

            closeNewTopicModal();
            this.showNotification('Tópico criado com sucesso!', 'success');

        } catch (error) {
            console.error('❌ Erro ao criar tópico:', error);
            this.showNotification(error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'notification-error' : type === 'warning' ? 'notification-warning' : ''}`;

        const icon = type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-triangle' :
                type === 'warning' ? 'exclamation-circle' : 'info-circle';

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
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

    viewCategory(slug) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login com Discord para visualizar categorias.', 'error');
            this.redirectToLogin();
            return;
        }
        console.log('🔗 Navegando para categoria:', slug);
        window.location.href = `forum-category.html?category=${slug}`;
    }

    viewTopic(topicId) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login com Discord para visualizar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }
        console.log('🔗 Navegando para tópico:', topicId);
        window.location.href = `forum-topic.html?id=${topicId}`;
    }

    startAuthMonitor() {
        setInterval(() => {
            this.api.loadCurrentUser();
            this.checkAuthState();
        }, 30000);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumUI PostgreSQL...');

    setTimeout(() => {
        if (window.forumAPI) {
            window.forumUI = new ForumUI();
            window.forumUI.startAuthMonitor();
        } else {
            console.error('❌ ForumAPI não está disponível!');
        }
    }, 100);
});

// Atualizar estatísticas periodicamente
setInterval(() => {
    if (window.forumUI) {
        window.forumUI.loadStats();
    }
}, 60000); // A cada 1 minuto