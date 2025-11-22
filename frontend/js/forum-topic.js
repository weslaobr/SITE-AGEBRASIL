// forum-topic.js - VERSÃO POSTGRESQL 
class ForumTopicUI {
    constructor() {
        this.api = window.forumAPI;
        this.currentTopicId = null;
        this.currentTopic = null;
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando ForumTopicUI...');
        console.log('👤 Status Admin:', this.api.isAdmin ? '✅ ADMIN' : '❌ USUÁRIO');

        this.currentTopicId = this.getTopicIdFromURL();
        console.log('📌 Tópico ID:', this.currentTopicId);

        if (!this.currentTopicId) {
            this.showError('Tópico não encontrado');
            return;
        }

        this.setupEventListeners();
        await this.waitForAuthAndCategories();
        this.checkAuthState();

        if (this.api.currentUser) {
            this.loadTopic();
        } else {
            this.showLoginRequired();
        }
    }

    getTopicIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async waitForAuthAndCategories() {
        console.log('⏳ Aguardando carregamento...');
        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts) {
            if (this.api.currentUser !== undefined && this.api.categories.length > 0) {
                console.log('✅ Usuário e categorias carregados');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        console.warn('⚠️ Timeout ao aguardar carregamento');
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

    async loadTopic() {
        console.log('📖 Carregando tópico:', this.currentTopicId);

        try {
            this.currentTopic = await this.api.getTopic(this.currentTopicId);

            if (!this.currentTopic) {
                this.showError('Tópico não encontrado');
                return;
            }

            this.displayTopic(this.currentTopic);
            this.loadReplies();

        } catch (error) {
            console.error('Erro ao carregar tópico:', error);
            this.showError('Erro ao carregar tópico');
        }
    }

    displayTopic(topic) {
        // Atualizar breadcrumb
        document.getElementById('topicTitleBreadcrumb').textContent = topic.title;

        // Atualizar categoria
        const category = this.api.categories.find(cat => cat.id == topic.categoryId);
        if (category) {
            document.getElementById('topicCategory').textContent = category.name;
            document.getElementById('categoryLink').textContent = category.name;
            document.getElementById('categoryLink').href = `forum-category.html?category=${category.slug}`;
        }

        // Atualizar título
        const topicTitleElement = document.getElementById('topicTitle');
        let titleHTML = topic.title;

        if (topic.isPinned) {
            titleHTML = '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 10px;"></i>' + titleHTML;
        }

        if (topic.isLocked) {
            titleHTML += ' <i class="fas fa-lock" style="color: #a0aec0; margin-left: 10px;"></i>';
        }

        topicTitleElement.innerHTML = titleHTML;

        // Atualizar data
        document.getElementById('topicDate').textContent = this.formatDate(topic.createdAt);

        // Atualizar autor
        const authorNameElement = document.getElementById('authorName');
        authorNameElement.textContent = topic.author;

        // Adicionar badge de admin se o autor for admin
        if (this.api.admins.includes(topic.authorId)) {
            authorNameElement.innerHTML += '<span class="admin-badge">ADMIN</span>';
        }

        // Atualizar avatar do autor
        const authorAvatar = document.getElementById('authorAvatar');
        if (topic.authorAvatar) {
            authorAvatar.innerHTML = `
                <img src="https://cdn.discordapp.com/avatars/${topic.authorId}/${topic.authorAvatar}.webp?size=80" 
                     alt="${topic.author}"
                     onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">
            `;
        } else {
            authorAvatar.innerHTML = `<span>${topic.author.charAt(0)}</span>`;
        }

        // Atualizar conteúdo
        document.getElementById('topicContentText').innerHTML = this.formatContent(topic.content);

        // Adicionar botões de moderação se for admin
        this.addModerationButtons(topic);
    }

    addModerationButtons(topic) {
        const topicActions = document.querySelector('.topic-actions');

        if (!topicActions) return;

        // Limpar botões de moderação existentes
        const existingModButtons = topicActions.querySelectorAll('.mod-btn');
        existingModButtons.forEach(btn => btn.remove());

        // Se for admin, adicionar botões de moderação
        if (this.api.isAdmin) {
            const modButtons = document.createElement('div');
            modButtons.className = 'moderation-actions';
            modButtons.style.cssText = `
                display: flex;
                gap: 0.5rem;
                margin-left: auto;
                flex-wrap: wrap;
            `;

            modButtons.innerHTML = `
                <button class="btn btn-warning mod-btn" onclick="forumTopicUI.togglePinTopic(${topic.id})" title="${topic.isPinned ? 'Desfixar' : 'Fixar'} Tópico">
                    <i class="fas fa-thumbtack"></i>
                    ${topic.isPinned ? 'Desfixar' : 'Fixar'}
                </button>
                <button class="btn btn-warning mod-btn" onclick="forumTopicUI.toggleLockTopic(${topic.id})" title="${topic.isLocked ? 'Desbloquear' : 'Bloquear'} Tópico">
                    <i class="fas ${topic.isLocked ? 'fa-unlock' : 'fa-lock'}"></i>
                    ${topic.isLocked ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button class="btn btn-danger mod-btn" onclick="forumTopicUI.deleteTopic(${topic.id})" title="Deletar Tópico">
                    <i class="fas fa-trash"></i>
                    Deletar
                </button>
            `;

            topicActions.appendChild(modButtons);
            this.addModerationStyles();
        }
    }

    addModerationStyles() {
        if (!document.querySelector('#moderation-styles')) {
            const styles = document.createElement('style');
            styles.id = 'moderation-styles';
            styles.textContent = `
                .btn-warning {
                    background: #ed8936 !important;
                    color: white !important;
                    border: none !important;
                }
                .btn-warning:hover {
                    background: #dd6b20 !important;
                    transform: translateY(-1px);
                }
                .btn-danger {
                    background: #e53e3e !important;
                    color: white !important;
                    border: none !important;
                }
                .btn-danger:hover {
                    background: #c53030 !important;
                    transform: translateY(-1px);
                }
                .moderation-actions {
                    border-left: 2px solid #4a5568;
                    padding-left: 1rem;
                    margin-left: 1rem;
                }
                .admin-badge {
                    background: #e53e3e;
                    color: white;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    margin-left: 0.5rem;
                }
                .reply-mod-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                .mod-action {
                    color: #e53e3e !important;
                    font-size: 0.9rem !important;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.3rem;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }
                .mod-action:hover {
                    color: #c53030 !important;
                    background: rgba(229, 62, 62, 0.1);
                    transform: scale(1.1);
                }
                @media (max-width: 768px) {
                    .moderation-actions {
                        border-left: none;
                        padding-left: 0;
                        margin-left: 0;
                        border-top: 1px solid #4a5568;
                        padding-top: 1rem;
                        margin-top: 1rem;
                        width: 100%;
                        justify-content: center;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    async loadReplies() {
        try {
            const replies = await this.api.getReplies(this.currentTopicId);
            const repliesList = document.getElementById('repliesList');
            const repliesCount = document.getElementById('repliesCount');
            const replyForm = document.querySelector('.reply-form');

            // Mostrar/ocultar formulário de resposta baseado no status de bloqueio
            if (replyForm && this.currentTopic) {
                replyForm.style.display = this.currentTopic.isLocked ? 'none' : 'block';

                if (this.currentTopic.isLocked) {
                    const existingMessage = document.querySelector('.locked-message');
                    if (!existingMessage) {
                        const lockedMessage = document.createElement('div');
                        lockedMessage.className = 'locked-message';
                        lockedMessage.style.cssText = `
                            background: var(--card-bg);
                            border: 1px solid var(--border-color);
                            border-radius: 8px;
                            padding: 1rem;
                            text-align: center;
                            color: #a0aec0;
                            margin-bottom: 1rem;
                        `;
                        lockedMessage.innerHTML = `
                            <i class="fas fa-lock" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                            <p>Este tópico está bloqueado. Não é possível responder.</p>
                        `;
                        replyForm.parentNode.insertBefore(lockedMessage, replyForm);
                    }
                }
            }

            // Atualizar contador
            repliesCount.textContent = `${replies.length} ${replies.length === 1 ? 'resposta' : 'respostas'}`;

            if (replies.length === 0) {
                repliesList.innerHTML = `
                    <div class="no-replies" style="text-align: center; padding: 3rem; color: #a0aec0;">
                        <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3>Nenhuma resposta ainda</h3>
                        <p>Seja o primeiro a responder este tópico!</p>
                    </div>
                `;
                return;
            }

            const repliesHTML = replies.map(reply => `
                <div class="reply-item" id="reply-${reply.id}">
                    <div class="reply-avatar">
                        ${reply.authorAvatar ?
                    `<img src="https://cdn.discordapp.com/avatars/${reply.authorId}/${reply.authorAvatar}.webp?size=45" 
                                  onerror="this.src='https://cdn.discordapp.com/embed/avatars/${reply.authorId % 5}.png'">` :
                    `<span>${reply.author.charAt(0)}</span>`
                }
                    </div>
                    <div class="reply-content-wrapper">
                        <div class="reply-header">
                            <span class="reply-author">
                                ${reply.author}
                                ${this.api.admins.includes(reply.authorId) ? '<span class="admin-badge">ADMIN</span>' : ''}
                            </span>
                            <span class="reply-date">${this.formatDate(reply.createdAt)}</span>
                            
                            <div class="reply-actions">
                                <button onclick="forumTopicUI.likeReply(${reply.id})" title="Curtir">
                                    <i class="far fa-heart"></i>
                                </button>
                                <button onclick="forumTopicUI.quoteReply(${reply.id})" title="Citar">
                                    <i class="fas fa-quote-right"></i>
                                </button>
                                ${this.api.isAdmin || (this.api.currentUser && this.api.currentUser.id === reply.authorId) ? `
                                    <div class="reply-mod-actions">
                                        <button class="mod-action" onclick="forumTopicUI.deleteReply(${reply.id})" title="Deletar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="reply-body">
                            ${this.formatContent(reply.content)}
                        </div>
                    </div>
                </div>
            `).join('');

            repliesList.innerHTML = repliesHTML;

        } catch (error) {
            console.error('Erro ao carregar respostas:', error);
            this.showNotification('Erro ao carregar respostas', 'error');
        }
    }

    async createReply() {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para responder.', 'error');
            return;
        }

        if (this.currentTopic && this.currentTopic.isLocked) {
            this.showNotification('Este tópico está bloqueado. Não é possível responder.', 'error');
            return;
        }

        const content = document.getElementById('replyContent').value.trim();

        if (!content) {
            this.showNotification('Digite uma resposta.', 'error');
            return;
        }

        if (content.length < 5) {
            this.showNotification('A resposta deve ter pelo menos 5 caracteres.', 'warning');
            return;
        }

        try {
            console.log('📤 Enviando resposta...');
            await this.api.createReply(this.currentTopicId, content);

            document.getElementById('replyContent').value = '';
            this.showNotification('Resposta enviada com sucesso!', 'success');

            // Recarregar respostas
            await this.loadReplies();

            // Scroll para o topo das respostas
            setTimeout(() => {
                const repliesSection = document.querySelector('.replies-section');
                if (repliesSection) {
                    repliesSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);

        } catch (error) {
            console.error('Erro ao criar resposta:', error);
            this.showNotification(error.message, 'error');
        }
    }

    likeReply(replyId) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para curtir respostas.', 'error');
            return;
        }
        this.showNotification('Funcionalidade de curtir em desenvolvimento!', 'info');
    }

    quoteReply(replyId) {
        if (!this.api.currentUser) {
            this.showNotification('Faça login para citar respostas.', 'error');
            return;
        }

        this.api.getReplies(this.currentTopicId).then(replies => {
            const reply = replies.find(r => r.id == replyId);
            if (reply) {
                const quoteText = `> ${reply.content}\n\n`;
                const textarea = document.getElementById('replyContent');
                textarea.value = quoteText + textarea.value;
                textarea.focus();
                this.showNotification('Resposta citada!', 'success');
            }
        });
    }

    formatContent(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
        const topicContent = document.getElementById('topicContent');
        if (topicContent) {
            topicContent.innerHTML = `
                <div class="no-auth-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro</h3>
                    <p>${message}</p>
                    <button class="login-btn" onclick="window.location.href = 'forum.html'">
                        <i class="fas fa-arrow-left"></i>
                        Voltar ao Fórum
                    </button>
                </div>
            `;
        }
    }

    showLoginRequired() {
        const topicContent = document.getElementById('topicContent');
        if (topicContent) {
            topicContent.innerHTML = `
                <div class="no-auth-message" style="text-align: center; padding: 3rem; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color);">
                    <i class="fas fa-lock" style="font-size: 3rem; color: var(--accent-color); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 1rem;">Login Necessário</h3>
                    <p style="color: #a0aec0; margin-bottom: 1.5rem;">Você precisa estar logado com o Discord para visualizar este tópico.</p>
                    <button onclick="window.discordAuth.login()" class="btn btn-primary" style="background: var(--accent-color); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <i class="fab fa-discord"></i> Entrar com Discord
                    </button>
                </div>
            `;
        }
    }

    // ✅ MÉTODOS DE ADMINISTRAÇÃO
    async togglePinTopic(topicId) {
        if (!confirm('Tem certeza que deseja alterar o status de fixação deste tópico?')) return;

        try {
            const result = await this.api.togglePinTopic(topicId);
            if (result) {
                alert('Status de fixação atualizado com sucesso!');
                location.reload();
            }
        } catch (error) {
            console.error('Erro ao fixar tópico:', error);
            alert('Erro ao fixar tópico: ' + error.message);
        }
    }

    async toggleLockTopic(topicId) {
        if (!confirm('Tem certeza que deseja alterar o status de bloqueio deste tópico?')) return;

        try {
            const result = await this.api.toggleLockTopic(topicId);
            if (result) {
                alert('Status de bloqueio atualizado com sucesso!');
                location.reload();
            }
        } catch (error) {
            console.error('Erro ao bloquear tópico:', error);
            alert('Erro ao bloquear tópico: ' + error.message);
        }
    }

    async deleteTopic(topicId) {
        if (!confirm('Tem certeza que deseja DELETAR este tópico? Esta ação não pode ser desfeita.')) return;

        try {
            const result = await this.api.deleteTopic(topicId);
            if (result) {
                alert('Tópico deletado com sucesso!');
                window.location.href = 'forum-category.html?category=' + this.currentTopic.categorySlug;
            }
        } catch (error) {
            console.error('Erro ao deletar tópico:', error);
            alert('Erro ao deletar tópico: ' + error.message);
        }
    }

    async deleteReply(replyId) {
        if (!confirm('Tem certeza que deseja deletar esta resposta?')) return;

        try {
            await this.api.deleteReply(replyId);
            alert('Resposta deletada com sucesso!');
            this.loadReplies(); // Recarrega as respostas
        } catch (error) {
            console.error('Erro ao deletar resposta:', error);
            alert('Erro ao deletar resposta: ' + error.message);
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumTopicUI...');
    window.forumTopicUI = new ForumTopicUI();
});