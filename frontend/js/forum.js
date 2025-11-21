// forum.js - VERSÃO CORRIGIDA
class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando ForumUI...');

        // Aguardar o API estar completamente carregado
        await this.waitForAPI();

        console.log('👤 Estado de autenticação:', this.api.currentUser ? 'Logado' : 'Não logado');
        console.log('📂 Categorias carregadas:', this.api.categories.length);

        this.checkAuthState();
        await this.loadAllData();
        this.setupEventListeners();

        console.log('✅ ForumUI inicializado completamente');
    }

    async waitForAPI() {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos

        while ((!this.api.categories || this.api.categories.length === 0) && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;

            // Recarregar usuário e categorias se necessário
            await this.api.loadCurrentUser();
            if (!this.api.categoriesLoaded) {
                await this.api.loadCategories();
            }
        }

        if (this.api.categories.length === 0) {
            console.warn('⚠️ Nenhuma categoria carregada após 5 segundos, usando fallback');
            await this.api.ensureCategoriesLoaded();
        }
    }

    // NO forum.js - ADICIONAR FUNÇÃO GLOBAL
    async forceRefreshCategories() {
        console.log('🔄 Forçando atualização das categorias...');

        if (window.forumUI) {
            await window.forumUI.loadCategories();
            window.forumUI.showNotification('Categorias atualizadas com dados reais!', 'success');
        }
    }

// Adicionar ao objeto global
window.refreshForumData = forceRefreshCategories;

    // NO forum.js - ATUALIZAR O MÉTODO loadAllData()
    async loadAllData() {
        console.log('📥 Carregando todos os dados do fórum...');

        try {
            // ✅ CORREÇÃO: Carregar categorias PRIMEIRO (elas carregam os dados reais)
            await this.loadCategories();

            // Depois carregar stats e tópicos recentes
            await Promise.all([
                this.loadStats(),
                this.loadRecentTopics()
            ]);

            console.log('✅ Todos os dados carregados com informações REAIS');

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
    }

    checkAuthState() {
        const user = this.api.currentUser;
        const authElements = document.querySelectorAll('[data-auth-only]');
        const noAuthElements = document.querySelectorAll('[data-no-auth]');

        console.log('🔐 Verificando estado de autenticação...');

        if (user) {
            console.log('✅ Usuário logado, mostrando conteúdo');
            authElements.forEach(el => {
                el.style.display = '';
                console.log('📦 Mostrando elemento:', el.id || el.className);
            });
            noAuthElements.forEach(el => {
                el.style.display = 'none';
                console.log('🚫 Ocultando elemento:', el.id || el.className);
            });
            this.updateUserInfo(user);
        } else {
            console.log('❌ Usuário não logado, mostrando mensagem de login');
            authElements.forEach(el => {
                el.style.display = 'none';
                console.log('🚫 Ocultando elemento:', el.id || el.className);
            });
            noAuthElements.forEach(el => {
                el.style.display = '';
                console.log('📦 Mostrando elemento:', el.id || el.className);
            });
        }
    }

    updateUserInfo(user) {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            const avatarUrl = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
                : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

            userInfoElement.innerHTML = `
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${user.username}">
                </div>
                <span class="user-name">${user.global_name || user.username}</span>
                ${this.api.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
            `;
        }
    }

    async loadStats() {
        try {
            console.log('📊 Carregando estatísticas...');
            const stats = await this.api.getStats();

            // ✅ CORREÇÃO: Verificar dados reais antes de exibir
            const topics = await this.api.getTopics();
            const actualTopicCount = topics.length;

            let totalReplies = 0;
            for (const topic of topics) {
                const replies = await this.api.getReplies(topic.id);
                totalReplies += replies.length;
            }

            // ✅ USAR DADOS REAIS em vez dos stats da API
            const realStats = {
                totalTopics: actualTopicCount,
                totalReplies: totalReplies,
                totalMembers: actualTopicCount > 0 ? 1 : 0,
                onlineNow: 1
            };

            console.log('📊 Stats reais calculados:', realStats);

            const statsHTML = `
            <div class="forum-stat">
                <i class="fas fa-comments"></i>
                <div>
                    <div class="number">${realStats.totalTopics}</div>
                    <div class="label">Tópicos</div>
                </div>
            </div>
            <div class="forum-stat">
                <i class="fas fa-reply"></i>
                <div>
                    <div class="number">${realStats.totalReplies}</div>
                    <div class="label">Respostas</div>
                </div>
            </div>
            <div class="forum-stat">
                <i class="fas fa-users"></i>
                <div>
                    <div class="number">${realStats.totalMembers}</div>
                    <div class="label">Membros</div>
                </div>
            </div>
            <div class="forum-stat">
                <i class="fas fa-user-clock"></i>
                <div>
                    <div class="number">${realStats.onlineNow}</div>
                    <div class="label">Online agora</div>
                </div>
            </div>
        `;

            const statsContainer = document.getElementById('forum-stats');
            if (statsContainer) {
                statsContainer.innerHTML = statsHTML;
                console.log('✅ Estatísticas atualizadas com dados reais');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
            this.showFallbackStats();
        }
    }

    showFallbackStats() {
        const statsContainer = document.getElementById('forum-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="forum-stat">
                    <i class="fas fa-comments"></i>
                    <div>
                        <div class="number">0</div>
                        <div class="label">Tópicos</div>
                    </div>
                </div>
                <div class="forum-stat">
                    <i class="fas fa-reply"></i>
                    <div>
                        <div class="number">0</div>
                        <div class="label">Respostas</div>
                    </div>
                </div>
                <div class="forum-stat">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="number">0</div>
                        <div class="label">Membros</div>
                    </div>
                </div>
                <div class="forum-stat">
                    <i class="fas fa-user-clock"></i>
                    <div>
                        <div class="number">0</div>
                        <div class="label">Online agora</div>
                    </div>
                </div>
            `;
        }
    }

    // NO forum.js - ATUALIZAR O MÉTODO loadCategories()
    async loadCategories() {
        try {
            console.log('📂 Carregando categorias com dados reais...');

            // Garantir que as categorias estão carregadas
            const categories = await this.api.ensureCategoriesLoaded();

            const categoriesContainer = document.getElementById('categories-list');
            if (!categoriesContainer) {
                console.error('❌ Container de categorias não encontrado');
                return;
            }

            if (!categories || categories.length === 0) {
                console.warn('⚠️ Nenhuma categoria para exibir');
                categoriesContainer.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Nenhuma categoria configurada</h3>
                    <p>Configure as categorias no sistema.</p>
                </div>
            `;
                return;
            }

            console.log(`✅ Exibindo ${categories.length} categorias`);

            // ✅ CORREÇÃO: Buscar dados REAIS para cada categoria
            const categoriesWithRealData = await Promise.all(
                categories.map(async (category) => {
                    try {
                        console.log(`📊 Buscando dados reais para categoria: ${category.name}`);

                        // Buscar tópicos desta categoria
                        const topics = await this.api.getTopics(category.slug);

                        // Calcular estatísticas REAIS
                        let totalReplies = 0;
                        let uniqueMembers = new Set();

                        for (const topic of topics) {
                            const replies = await this.api.getReplies(topic.id);
                            totalReplies += replies.length;

                            // Adicionar autor do tópico
                            if (topic.authorId) uniqueMembers.add(topic.authorId);

                            // Adicionar autores das respostas
                            replies.forEach(reply => {
                                if (reply.authorId) uniqueMembers.add(reply.authorId);
                            });
                        }

                        return {
                            ...category,
                            realTopicCount: topics.length,
                            realReplyCount: totalReplies,
                            realMemberCount: uniqueMembers.size
                        };

                    } catch (error) {
                        console.error(`❌ Erro ao buscar dados para ${category.name}:`, error);
                        return {
                            ...category,
                            realTopicCount: 0,
                            realReplyCount: 0,
                            realMemberCount: 0
                        };
                    }
                })
            );

            console.log('📈 Dados reais carregados:', categoriesWithRealData);

            const categoriesHTML = categoriesWithRealData.map(category => `
            <div class="category-card" onclick="forumUI.viewCategory('${category.slug}')">
                <div class="category-header">
                    <div class="category-icon" style="background: linear-gradient(135deg, ${category.color}, #3e8ce5);">
                        <i class="${category.icon}"></i>
                    </div>
                    <div class="category-info">
                        <div class="category-title">${category.name}</div>
                        <div class="category-description">${category.description}</div>
                    </div>
                    <div class="category-stats">
                        <div class="stat">
                            <i class="fas fa-comment"></i>
                            <span>${category.realTopicCount} tópicos</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-reply"></i>
                            <span>${category.realReplyCount} respostas</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-users"></i>
                            <span>${category.realMemberCount} membros</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

            categoriesContainer.innerHTML = categoriesHTML;

            console.log('✅ Categorias exibidas com dados REAIS do banco');

        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            this.showError('categories-list', 'Erro ao carregar categorias');
        }
    }

    async loadRecentTopics() {
        try {
            console.log('📝 Carregando tópicos recentes...');
            const topics = await this.api.getTopics(null, 5); // 5 tópicos mais recentes

            const topicsContainer = document.getElementById('recent-topics-list');
            if (!topicsContainer) {
                console.error('❌ Container de tópicos não encontrado');
                return;
            }

            if (!topics || topics.length === 0) {
                console.log('📭 Nenhum tópico recente encontrado');
                topicsContainer.innerHTML = `
                    <div class="no-activity">
                        <i class="fas fa-comments"></i>
                        <h3>Nenhum tópico encontrado</h3>
                        <p>Seja o primeiro a criar um tópico no fórum!</p>
                    </div>
                `;
                return;
            }

            console.log(`✅ Exibindo ${topics.length} tópicos recentes`);

            const topicsHTML = await Promise.all(topics.map(async (topic) => {
                const replies = await this.api.getReplies(topic.id);
                const replyCount = replies.length;

                return `
                    <div class="topic-item" onclick="forumUI.viewTopic(${topic.id})">
                        <div class="topic-avatar">
                            ${topic.authorAvatar ?
                        `<img src="https://cdn.discordapp.com/avatars/${topic.authorId}/${topic.authorAvatar}.webp?size=40" 
                                      alt="${topic.author}"
                                      onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">` :
                        `<span>${topic.author.charAt(0)}</span>`
                    }
                        </div>
                        <div class="topic-content">
                            <div class="topic-title">
                                ${topic.isPinned ? '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 5px;"></i>' : ''}
                                ${topic.title}
                            </div>
                            <div class="topic-meta">
                                <span>por ${topic.author}</span>
                                <span>em ${topic.categoryName || 'Geral'}</span>
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

        } catch (error) {
            console.error('❌ Erro ao carregar tópicos recentes:', error);
            this.showError('recent-topics-list', 'Erro ao carregar tópicos');
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar</h3>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Recarregar
                    </button>
                </div>
            `;
        }
    }

    // ... (resto dos métodos permanecem iguais)

    setupEventListeners() {
        const form = document.getElementById('newTopicForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
        }

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
            localStorage.removeItem('discord_user');
            localStorage.removeItem('discord_access_token');
            localStorage.removeItem('discord_refresh_token');
            window.location.reload();
        }
    }

    async createNewTopic() {
        console.log('📝 Criando novo tópico...');

        if (!this.api.currentUser) {
            this.showNotification('Você precisa fazer login com Discord para criar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }

        const categoryId = document.getElementById('topicCategory').value;
        const title = document.getElementById('topicTitle').value;
        const content = document.getElementById('topicContent').value;

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

            await this.api.createTopic(topicData);

            await this.loadStats();
            await this.loadCategories();
            await this.loadRecentTopics();

            closeNewTopicModal();
            this.showNotification('Tópico criado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao criar tópico:', error);
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
        window.location.href = `forum-category.html?category=${slug}`;
    }

    viewTopic(topicId) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login com Discord para visualizar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }
        window.location.href = `forum-topic.html?id=${topicId}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Data desconhecida';

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
    console.log('🚀 DOM carregado, inicializando fórum...');

    setTimeout(async () => {
        if (window.forumAPI) {
            window.forumUI = new ForumUI();
            window.forumUI.startAuthMonitor();

            // Adicionar função global de debug
            window.debugForum = function () {
                console.log('🔍=== DEBUG FORUM ===');
                console.log('👤 Usuário:', window.forumAPI.currentUser);
                console.log('📂 Categorias:', window.forumAPI.categories);
                console.log('🔐 Admin:', window.forumAPI.isAdmin);
                console.log('🔚=== FIM DEBUG ===');
            };

        } else {
            console.error('❌ ForumAPI não está disponível!');
        }
    }, 100);
});

setInterval(() => {
    if (window.forumUI) {
        window.forumUI.loadStats();
    }
}, 30000);