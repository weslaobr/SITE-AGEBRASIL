// forum-category.js - VERSÃO CORRIGIDA
class ForumCategoryUI {
    constructor() {
        this.api = window.forumAPI;
        this.currentCategorySlug = null;
        this.currentCategory = null;
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando ForumCategoryUI...');

        this.currentCategorySlug = this.getCategorySlugFromURL();

        console.log('📌 Categoria Slug da URL:', this.currentCategorySlug);

        if (!this.currentCategorySlug) {
            this.showError('Categoria não especificada na URL');
            return;
        }

        this.checkAuthState();
        this.setupEventListeners();

        // ✅ CORREÇÃO: Aguardar o usuário e categorias carregarem
        await this.waitForAuthAndCategories();

        if (this.api.currentUser) {
            await this.loadCategory();
        } else {
            console.log('👤 Aguardando autenticação...');
        }
    }

    // NO forum-category.js - ADICIONAR MÉTODO PARA FORÇAR ATUALIZAÇÃO
    async forceRealDataUpdate() {
        console.log('🔄 Forçando atualização com dados reais...');

        try {
            // Recarregar categoria
            await this.loadCategory();

            // Forçar recálculo das estatísticas
            await this.displayCategory();

            console.log('✅ Dados atualizados com sucesso');
            this.showNotification('Dados atualizados com informações reais do banco!', 'success');

        } catch (error) {
            console.error('❌ Erro ao forçar atualização:', error);
            this.showNotification('Erro ao atualizar dados: ' + error.message, 'error');
        }
    }

    // ✅ CORREÇÃO: Chamar força de atualização na inicialização
    async init() {
        console.log('🔧 Inicializando ForumCategoryUI...');

        this.currentCategorySlug = this.getCategorySlugFromURL();
        console.log('📌 Categoria Slug da URL:', this.currentCategorySlug);

        if (!this.currentCategorySlug) {
            this.showError('Categoria não especificada na URL');
            return;
        }

        this.checkAuthState();
        this.setupEventListeners();

        await this.waitForAuthAndCategories();

        if (this.api.currentUser) {
            await this.loadCategory();
            this.addDebugButton();

            // ✅ FORÇAR ATUALIZAÇÃO COM DADOS REAIS
            setTimeout(() => {
                this.forceRealDataUpdate();
            }, 1000);

        } else {
            console.log('👤 Aguardando autenticação...');
        }
    }

    getCategorySlugFromURL() {
        const urlParams = new URLSearchParams(window.location.search);

        let categorySlug = urlParams.get('category');

        console.log('🔗 URL Params:', { category: categorySlug });

        // ✅ CORREÇÃO: Mapear slugs para os nomes corretos
        const slugMapping = {
            'estrategias-dicas': 'estrategias-dicas',
            'discussoes-gerais': 'discussoes-gerais',
            'multiplayer': 'multiplayer',
            'civilizacoes': 'civilizacoes'
        };

        // Se não encontrou, tentar extrair da URL completa
        if (!categorySlug) {
            const path = window.location.pathname;
            const match = path.match(/forum-category\.html\?category=([^&]+)/);
            if (match) {
                categorySlug = match[1];
            }
        }

        console.log('🎯 Slug final:', categorySlug);
        return categorySlug;
    }
    // ✅ NOVO MÉTODO: Aguardar autenticação e categorias
    async waitForAuthAndCategories() {
        console.log('⏳ Aguardando carregamento...');

        let attempts = 0;
        const maxAttempts = 30; // 3 segundos

        while (attempts < maxAttempts) {
            // Verificar se usuário e categorias estão carregados
            if (this.api.currentUser !== undefined && this.api.categories.length > 0) {
                console.log('✅ Usuário e categorias carregados');
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;

            // Recarregar dados se necessário
            if (this.api.currentUser === undefined) {
                await this.api.loadCurrentUser();
            }
            if (this.api.categories.length === 0) {
                await this.api.loadCategories();
            }
        }

        console.warn('⚠️ Timeout ao aguardar carregamento');
    }

    async loadCategory() {
        console.log('📂 Carregando categoria:', this.currentCategorySlug);

        try {
            // ✅ CORREÇÃO: Garantir que categorias estão carregadas
            if (!this.api.categories || this.api.categories.length === 0) {
                console.log('🔄 Carregando categorias...');
                await this.api.loadCategories();

                // Aguardar um pouco mais se necessário
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log('📋 Todas as categorias disponíveis:', this.api.categories);

            // ✅ CORREÇÃO: Buscar categoria por slug (não por nome)
            this.currentCategory = this.api.categories.find(
                cat => cat.slug === this.currentCategorySlug
            );

            console.log('🔍 Resultado da busca:', {
                slugProcurado: this.currentCategorySlug,
                categoriaEncontrada: this.currentCategory
            });

            if (!this.currentCategory) {
                console.error('❌ Categoria não encontrada com slug:', this.currentCategorySlug);

                // ✅ TENTAR FALLBACK: buscar por nome similar
                const fallbackCategory = this.api.categories.find(cat =>
                    cat.slug && cat.slug.includes(this.currentCategorySlug) ||
                    cat.name && cat.name.toLowerCase().includes(this.currentCategorySlug.toLowerCase())
                );

                if (fallbackCategory) {
                    console.log('🔄 Usando fallback category:', fallbackCategory);
                    this.currentCategory = fallbackCategory;
                } else {
                    this.showError(`Categoria "${this.currentCategorySlug}" não encontrada`);
                    return;
                }
            }

            console.log('✅ Categoria encontrada:', this.currentCategory.name);
            await this.displayCategory();
            await this.loadTopics();

        } catch (error) {
            console.error('❌ Erro ao carregar categoria:', error);
            this.showError('Erro ao carregar categoria: ' + error.message);
        }
    }


    // NO forum-category.js - CORRIGIR O MÉTODO DE CRIAÇÃO DE TÓPICOS
    async createNewTopic() {
        console.log('📝 Iniciando criação de novo tópico...');

        if (!this.api.currentUser) {
            this.showNotification('Faça login para criar tópicos.', 'error');
            this.redirectToLogin();
            return;
        }

        const title = document.getElementById('topicTitle').value.trim();
        const content = document.getElementById('topicContent').value.trim();

        console.log('📋 Dados do formulário:', { title, content });

        // Validações
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
                categoryId: this.currentCategory.id, // ✅ Usar ID da categoria atual
                title: title,
                content: content
            };

            console.log('📤 Enviando tópico:', topicData);

            // ✅ CORREÇÃO: Usar método correto da API
            const newTopic = await this.api.createTopic(topicData);

            console.log('✅ Tópico criado com sucesso:', newTopic);

            // Fechar modal
            this.closeNewTopicModal();

            // Recarregar a lista de tópicos
            await this.loadTopics();

            // Mostrar mensagem de sucesso
            this.showNotification('Tópico criado com sucesso!', 'success');

            // Redirecionar para o novo tópico após 2 segundos
            setTimeout(() => {
                window.location.href = `forum-topic.html?id=${newTopic.id}`;
            }, 2000);

        } catch (error) {
            console.error('❌ Erro ao criar tópico:', error);
            this.showNotification('Erro ao criar tópico: ' + error.message, 'error');
        }
    }

    // ✅ CORREÇÃO: Adicionar método para mostrar notificações
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

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

    // ✅ CORREÇÃO: Atualizar o event listener do formulário
    setupEventListeners() {
        const form = document.getElementById('newTopicForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
        }

        // Event listeners para login/logout
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

    // ✅ CORREÇÃO: Métodos auxiliares
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

    closeNewTopicModal() {
        const modal = document.getElementById('newTopicModal');
        const form = document.getElementById('newTopicForm');

        if (modal) modal.style.display = 'none';
        if (form) form.reset();
    }

    async displayCategory() {
        if (!this.currentCategory) return;

        console.log('🎨 Exibindo categoria com dados reais:', this.currentCategory);

        try {
            // ✅ CORREÇÃO: Buscar dados REAIS do banco
            const topics = await this.api.getTopics(this.currentCategorySlug);

            // ✅ CORREÇÃO: Calcular estatísticas REAIS
            let totalReplies = 0;
            let uniqueMembers = new Set();

            for (const topic of topics) {
                const replies = await this.api.getReplies(topic.id);
                totalReplies += replies.length;

                // Adicionar autor do tópico aos membros
                if (topic.authorId) uniqueMembers.add(topic.authorId);

                // Adicionar autores das respostas aos membros
                replies.forEach(reply => {
                    if (reply.authorId) uniqueMembers.add(reply.authorId);
                });
            }

            const realTopicCount = topics.length;
            const realReplyCount = totalReplies;
            const realMemberCount = uniqueMembers.size;

            console.log('📊 Dados reais calculados:', {
                topics: realTopicCount,
                replies: realReplyCount,
                members: realMemberCount
            });

            // Atualizar breadcrumb
            const breadcrumbElement = document.getElementById('categoryNameBreadcrumb');
            if (breadcrumbElement) {
                breadcrumbElement.textContent = this.currentCategory.name;
            }

            // Atualizar título da categoria
            const titleElement = document.getElementById('categoryTitle');
            const descriptionElement = document.getElementById('categoryDescription');
            const iconElement = document.getElementById('categoryIconLarge');

            if (titleElement) titleElement.textContent = this.currentCategory.name;
            if (descriptionElement) descriptionElement.textContent = this.currentCategory.description;

            if (iconElement) {
                iconElement.innerHTML = `<i class="${this.currentCategory.icon || 'fas fa-folder'}"></i>`;
                if (this.currentCategory.color) {
                    iconElement.style.background = `linear-gradient(135deg, ${this.currentCategory.color}, #3e8ce5)`;
                }
            }

            // ✅ CORREÇÃO: Atualizar estatísticas com dados REAIS do banco
            const topicCountElement = document.getElementById('topicCount');
            const replyCountElement = document.getElementById('replyCount');
            const membersElement = document.getElementById('categoryMembers');

            if (topicCountElement) {
                topicCountElement.textContent = realTopicCount;
                console.log('✅ Tópicos atualizados:', realTopicCount);
            }

            if (replyCountElement) {
                replyCountElement.textContent = realReplyCount;
                console.log('✅ Respostas atualizadas:', realReplyCount);
            }

            if (membersElement) {
                membersElement.textContent = realMemberCount;
                console.log('✅ Membros atualizados:', realMemberCount);
            }

            console.log('✅ Categoria exibida com dados REAIS do banco');

        } catch (error) {
            console.error('❌ Erro ao carregar dados reais:', error);
            this.showFallbackStats();
        }
    }

    // ✅ CORREÇÃO: Método fallback com dados mínimos
    showFallbackStats() {
        console.log('🔄 Usando fallback stats');

        const topicCountElement = document.getElementById('topicCount');
        const replyCountElement = document.getElementById('replyCount');
        const membersElement = document.getElementById('categoryMembers');

        if (topicCountElement) topicCountElement.textContent = '0';
        if (replyCountElement) replyCountElement.textContent = '0';
        if (membersElement) membersElement.textContent = '0';
    }

    async loadTopics() {
        console.log('📝 Carregando tópicos para:', this.currentCategorySlug);

        try {
            // ✅ CORREÇÃO: Usar o método correto da API
            let topics = await this.api.getTopics(this.currentCategorySlug);
            const topicsList = document.getElementById('topicsList');

            console.log('📦 Tópicos recebidos:', topics);

            if (!topics || topics.length === 0) {
                console.log('📭 Nenhum tópico encontrado');
                topicsList.innerHTML = `
                <div class="no-topics">
                    <i class="fas fa-comments"></i>
                    <h3>Nenhum tópico encontrado</h3>
                    <p>Seja o primeiro a criar um tópico nesta categoria!</p>
                </div>
            `;
                return;
            }

            console.log('🔄 Processando tópicos...');

            const topicsHTML = await Promise.all(topics.map(async (topic) => {
                const replies = await this.api.getReplies(topic.id);
                const replyCount = replies.length;

                console.log('📋 Processando tópico:', topic.title);

                return `
                <div class="topic-item ${topic.isPinned ? 'pinned' : ''}" onclick="forumCategoryUI.viewTopic(${topic.id})">
                    <div class="topic-avatar">
                        ${topic.authorAvatar ?
                        `<img src="https://cdn.discordapp.com/avatars/${topic.authorId}/${topic.authorAvatar}.webp?size=45"
                                  onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">`
                        :
                        `<span>${(topic.author || '').charAt(0)}</span>`
                    }
                    </div>

                    <div class="topic-content">
                        <div class="topic-title">
                            ${topic.isPinned ? '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 5px;"></i>' : ''}
                            ${topic.isLocked ? '<i class="fas fa-lock" style="color: #a0aec0; margin-right: 5px;"></i>' : ''}
                            ${topic.title}
                        </div>

                        <div class="topic-meta">
                            <span>por ${topic.author}</span>
                            <span>${new Date(topic.updatedAt || topic.createdAt).toLocaleDateString('pt-BR')}</span>

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

            topicsList.innerHTML = topicsHTML.join('');
            console.log('✅ Tópicos carregados na interface');

        } catch (error) {
            console.error('❌ Erro ao carregar tópicos:', error);
            const topicsList = document.getElementById('topicsList');
            topicsList.innerHTML = `
            <div class="no-topics">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar tópicos</h3>
                <p>${error.message}</p>
                <button onclick="forumCategoryUI.debug()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Debug
                </button>
            </div>
        `;
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

            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'Data inválida';
        }
    }

    showError(message) {
        const container = document.getElementById('categoryContent');
        if (!container) return;

        console.error('❌ Mostrando erro:', message);

        container.innerHTML = `
            <div class="no-auth-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro</h3>
                <p>${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                    <button class="login-btn" onclick="window.location.href = 'forum.html'">
                        <i class="fas fa-arrow-left"></i> Voltar ao Fórum
                    </button>
                    <button class="login-btn" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Recarregar
                    </button>
                    <button class="login-btn" onclick="forumCategoryUI.debug()">
                        <i class="fas fa-bug"></i> Debug
                    </button>
                </div>
            </div>
        `;
    }

    // ✅ NOVO MÉTODO: Debug
    debug() {
        console.log('🔍=== DEBUG FORUM CATEGORY ===');
        console.log('📌 Slug da URL:', this.currentCategorySlug);
        console.log('👤 Usuário:', this.api.currentUser);
        console.log('📂 Categorias:', this.api.categories);
        console.log('🎯 Categoria atual:', this.currentCategory);
        console.log('🔚=== FIM DEBUG ===');

        // Testar API diretamente
        if (this.currentCategorySlug) {
            fetch(`https://ageivbrasil.up.railway.app/api/forum/categories/${this.currentCategorySlug}/topics`)
                .then(r => {
                    console.log('📡 Status API:', r.status);
                    return r.json();
                })
                .then(topics => console.log('📝 Tópicos da API:', topics))
                .catch(err => console.error('💥 Erro API:', err));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumCategoryUI...');
    window.forumCategoryUI = new ForumCategoryUI();
});



