// forum.js - VERSÃO COMPLETA E FUNCIONAL
class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.init();
    }

    init() {
        console.log('🔧 Inicializando ForumUI...');
        console.log('👤 Estado de autenticação:', this.api.currentUser ? 'Logado' : 'Não logado');

        this.checkAuthState();
        this.loadStats();
        this.loadCategories();
        this.loadRecentTopics();
        this.setupEventListeners();
        this.loadCategoryOptions();

        console.log('✅ ForumUI inicializado');
    }

    checkAuthState() {
        const user = this.api.currentUser;
        const authElements = document.querySelectorAll('[data-auth-only]');
        const noAuthElements = document.querySelectorAll('[data-no-auth]');

        console.log('🔍 Verificando estado de autenticação...');

        if (user) {
            // Usuário logado - mostrar elementos para usuários autenticados
            authElements.forEach(el => el.style.display = '');
            noAuthElements.forEach(el => el.style.display = 'none');

            // Atualizar informações do usuário
            this.updateUserInfo(user);

            console.log('✅ Usuário autenticado:', user.username);
        } else {
            // Usuário não logado
            authElements.forEach(el => el.style.display = 'none');
            noAuthElements.forEach(el => el.style.display = '');

            console.log('❌ Usuário não autenticado');
        }
    }

    updateUserInfo(user) {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <div class="user-avatar">
                    <img src="https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png" 
                         alt="${user.username}">
                </div>
                <span class="user-name">${user.global_name || user.username}</span>
            `;
        }
    }

    loadStats() {
        const stats = this.api.getStats();
        const statsHTML = `
            <div class="forum-stat">
                <i class="fas fa-comments"></i>
                <div>
                    <div class="number">${stats.totalTopics}</div>
                    <div class="label">Tópicos</div>
                </div>
            </div>
            <div class="forum-stat">
                <i class="fas fa-reply"></i>
                <div>
                    <div class="number">${stats.totalReplies}</div>
                    <div class="label">Respostas</div>
                </div>
            </div>
            <div class="forum-stat">
                <i class="fas fa-users"></i>
                <div>
                    <div class="number">${stats.totalMembers}</div>
                    <div class="label">Membros</div>
                </div>
            </div>
            <div class="forum-stat">
                <i class="fas fa-user-clock"></i>
                <div>
                    <div class="number">${stats.onlineNow}</div>
                    <div class="label">Online agora</div>
                </div>
            </div>
        `;
        document.getElementById('forum-stats').innerHTML = statsHTML;
    }

    // NO forum.js - ATUALIZE O MÉTODO loadCategories:
    loadCategories() {
        console.log('🔄 Carregando categorias na interface...', this.api.categories);

        if (!this.api.categories || this.api.categories.length === 0) {
            console.warn('⚠️ Nenhuma categoria encontrada!');
            document.getElementById('categories-list').innerHTML = `
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
                        <span>${category.topicCount} tópicos</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-reply"></i>
                        <span>${category.replyCount} respostas</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

        document.getElementById('categories-list').innerHTML = categoriesHTML;
        console.log('✅ Categorias carregadas na interface');
    }

    loadRecentTopics() {
        const topics = this.api.getTopics().slice(0, 5);

        if (topics.length === 0) {
            document.getElementById('recent-topics-list').innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-comments"></i>
                    <h3>Nenhum tópico encontrado</h3>
                    <p>Seja o primeiro a criar um tópico no fórum!</p>
                </div>
            `;
            return;
        }

        const topicsHTML = topics.map(topic => {
            const category = this.api.categories.find(cat => cat.id == topic.categoryId);
            const replyCount = this.api.getReplies(topic.id).length;

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
                            <span>em ${category?.name || 'Geral'}</span>
                            <span>${this.formatDate(topic.updatedAt)}</span>
                        </div>
                    </div>
                    <div class="topic-stats">
                        <div class="stat">
                            <i class="fas fa-reply"></i>
                            <span>${replyCount}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-eye"></i>
                            <span>${topic.views}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('recent-topics-list').innerHTML = topicsHTML;
    }

    loadCategoryOptions() {
        console.log('🔄 Carregando opções de categoria no select...');

        const select = document.getElementById('topicCategory');

        if (!select) {
            console.error('❌ Elemento select não encontrado! ID: topicCategory');
            return;
        }

        // Limpar opções existentes
        select.innerHTML = '<option value="">Selecione uma categoria</option>';

        // Verificar se há categorias
        if (!this.api.categories || this.api.categories.length === 0) {
            console.warn('⚠️ Nenhuma categoria disponível para carregar no select');
            return;
        }

        // Adicionar categorias
        this.api.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });

        console.log('✅ Opções de categoria carregadas no select');
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

        return date.toLocaleDateString('pt-BR');
    }

    setupEventListeners() {
        const form = document.getElementById('newTopicForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
        }

        // Botão de login
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎯 Botão de login clicado');
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
        // Proteger links que requerem autenticação
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
        console.log('🔐 Redirecionando para login...');

        // Salvar a página atual para retornar após login
        localStorage.setItem('returnUrl', window.location.href);
        console.log('📌 URL salva para retorno:', window.location.href);

        // Usar o DiscordAuth para login
        if (window.discordAuth) {
            window.discordAuth.login();
        } else {
            console.error('❌ DiscordAuth não disponível');
            window.location.href = 'forum-auth.html';
        }
    }

    logout() {
        if (window.discordAuth) {
            window.discordAuth.logout();
        } else {
            // Fallback
            localStorage.removeItem('discord_user');
            localStorage.removeItem('discord_access_token');
            localStorage.removeItem('discord_refresh_token');
            window.location.reload();
        }
    }

    async createNewTopic() {
        console.log('📝 Criando novo tópico...');

        // Verificar autenticação
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

            const newTopic = await this.api.createTopic(topicData);

            // Atualizar interface
            this.loadStats();
            this.loadCategories();
            this.loadRecentTopics();

            // Fechar modal e limpar formulário
            closeNewTopicModal();

            // Mostrar mensagem de sucesso
            this.showNotification('Tópico criado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao criar tópico:', error);
            this.showNotification(error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remover notificações existentes
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

        // Auto-remover após 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // NO forum.js - ATUALIZE ESTE MÉTODO:
    viewCategory(slug) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login com Discord para visualizar categorias.', 'error');
            this.redirectToLogin();
            return;
        }

        // ✅ AGORA REDIRECIONA PARA A PÁGINA REAL DA CATEGORIA
        window.location.href = `forum-category.html?category=${slug}`;
    }

    // NO forum.js - ATUALIZE ESTE MÉTODO:
    viewTopic(topicId) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login com Discord para visualizar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }

        // ✅ AGORA REDIRECIONA PARA A PÁGINA REAL DO TÓPICO
        window.location.href = `forum-topic.html?id=${topicId}`;
    }

    // Método para verificar periodicamente o estado de autenticação
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

    // Aguardar um pouco para garantir que todas as dependências estejam carregadas
    setTimeout(() => {
        if (window.forumAPI) {
            window.forumUI = new ForumUI();
            window.forumUI.startAuthMonitor();
        } else {
            console.error('❌ ForumAPI não está disponível!');
        }
    }, 100);
});

// Simular usuários online
setInterval(() => {
    if (window.forumUI) {
        window.forumUI.loadStats();
    }
}, 30000);