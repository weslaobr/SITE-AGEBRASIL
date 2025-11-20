// forum-category.js - SISTEMA COMPLETO DE CATEGORIAS
class ForumCategoryUI {
    constructor() {
        this.api = window.forumAPI;
        this.currentCategorySlug = null;
        this.currentCategory = null;
        this.init();
    }

    init() {
        console.log('🔧 Inicializando ForumCategoryUI...');

        // Obter slug da categoria da URL
        this.currentCategorySlug = this.getCategorySlugFromURL();
        console.log('📌 Categoria Slug:', this.currentCategorySlug);

        if (!this.currentCategorySlug) {
            this.showError('Categoria não especificada');
            return;
        }

        this.checkAuthState();
        this.setupEventListeners();

        if (this.api.currentUser) {
            this.loadCategory();
        }
    }

    getCategorySlugFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('category');
    }

    checkAuthState() {
        const user = this.api.currentUser;
        const authElements = document.querySelectorAll('[data-auth-only]');
        const noAuthElements = document.querySelectorAll('[data-no-auth]');

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
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <div class="user-avatar">
                    <img src="https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png" 
                         alt="${user.username}">
                </div>
                <span class="user-name">${user.global_name || user.username}</span>
                ${this.api.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
            `;
        }
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const newTopicForm = document.getElementById('newTopicForm');

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

        if (newTopicForm) {
            newTopicForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
        }
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
        }
    }

    loadCategory() {
        console.log('📂 Carregando categoria:', this.currentCategorySlug);

        // Encontrar a categoria pelo slug
        this.currentCategory = this.api.categories.find(
            cat => cat.slug === this.currentCategorySlug
        );

        if (!this.currentCategory) {
            this.showError('Categoria não encontrada');
            return;
        }

        console.log('✅ Categoria encontrada:', this.currentCategory.name);
        this.displayCategory();
        this.loadTopics();
    }

    displayCategory() {
        // Atualizar breadcrumb
        document.getElementById('categoryNameBreadcrumb').textContent = this.currentCategory.name;

        // Atualizar ícone
        const categoryIcon = document.getElementById('categoryIconLarge');
        categoryIcon.innerHTML = `<i class="${this.currentCategory.icon}"></i>`;
        categoryIcon.style.background = `linear-gradient(135deg, ${this.currentCategory.color}, #3e8ce5)`;

        // Atualizar título
        document.getElementById('categoryTitle').textContent = this.currentCategory.name;

        // Atualizar descrição
        document.getElementById('categoryDescription').textContent = this.currentCategory.description;

        // Atualizar estatísticas
        document.getElementById('topicCount').textContent = this.currentCategory.topicCount;
        document.getElementById('replyCount').textContent = this.currentCategory.replyCount;

        // Calcular membros únicos nesta categoria
        const categoryMembers = this.calculateCategoryMembers();
        document.getElementById('categoryMembers').textContent = categoryMembers;
    }

    calculateCategoryMembers() {
        const topicsInCategory = this.api.topics.filter(
            topic => topic.categoryId == this.currentCategory.id
        );

        const authors = [...new Set(topicsInCategory.map(topic => topic.authorId))];
        return authors.length;
    }

    loadTopics() {
        const topics = this.api.getTopics().filter(
            topic => topic.categoryId == this.currentCategory.id
        );

        const topicsList = document.getElementById('topicsList');

        if (topics.length === 0) {
            topicsList.innerHTML = `
                <div class="no-topics">
                    <i class="fas fa-comments"></i>
                    <h3>Nenhum tópico encontrado</h3>
                    <p>Seja o primeiro a criar um tópico nesta categoria!</p>
                </div>
            `;
            return;
        }

        const topicsHTML = topics.map(topic => {
            const replyCount = this.api.getReplies(topic.id).length;
            const isPinned = topic.isPinned;
            const isLocked = topic.isLocked;

            return `
                <div class="topic-item ${isPinned ? 'pinned' : ''}" onclick="forumCategoryUI.viewTopic(${topic.id})">
                    <div class="topic-avatar">
                        ${topic.authorAvatar ?
                    `<img src="https://cdn.discordapp.com/avatars/${topic.authorId}/${topic.authorAvatar}.webp?size=45" 
                                  alt="${topic.author}"
                                  onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">` :
                    `<span>${topic.author.charAt(0)}</span>`
                }
                    </div>
                    <div class="topic-content">
                        <div class="topic-title">
                            ${isPinned ? '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 5px;"></i>' : ''}
                            ${isLocked ? '<i class="fas fa-lock" style="color: #a0aec0; margin-right: 5px;"></i>' : ''}
                            ${topic.title}
                        </div>
                        <div class="topic-meta">
                            <span>por ${topic.author}</span>
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
                            <span>${topic.views || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        topicsList.innerHTML = topicsHTML;
    }

    async createNewTopic() {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para criar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }

        const title = document.getElementById('topicTitle').value.trim();
        const content = document.getElementById('topicContent').value.trim();

        if (!title || !content) {
            this.showNotification('Preencha todos os campos.', 'error');
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
                categoryId: this.currentCategory.id,
                title: title,
                content: content
            };

            const newTopic = await this.api.createTopic(topicData);

            // Fechar modal e limpar formulário
            closeNewTopicModal();

            // Mostrar sucesso
            this.showNotification('Tópico criado com sucesso!', 'success');

            // Recarregar a página após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Erro ao criar tópico:', error);
            this.showNotification(error.message, 'error');
        }
    }

    viewTopic(topicId) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para visualizar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }

        // Redirecionar para a página do tópico
        window.location.href = `forum-topic.html?id=${topicId}`;
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

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'notification-error' : type === 'warning' ? 'notification-warning' : ''}`;

        const icon = type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-triangle' : 'info-circle';

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
                type === 'error' ? '#e53e3e' : '#3e8ce5'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            border-left: 4px solid ${type === 'success' ? '#38a169' :
                type === 'error' ? '#c53030' : '#3182ce'};
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
        const categoryContent = document.getElementById('categoryContent');
        if (categoryContent) {
            categoryContent.innerHTML = `
                <div class="no-auth-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro</h3>
                    <p>${message}</p>
                    <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                        <button class="login-btn" onclick="window.location.href = 'forum.html'">
                            <i class="fas fa-arrow-left"></i>
                            Voltar ao Fórum
                        </button>
                        <button class="login-btn" onclick="window.location.reload()">
                            <i class="fas fa-redo"></i>
                            Recarregar
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumCategoryUI...');
    window.forumCategoryUI = new ForumCategoryUI();
});