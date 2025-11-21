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

    async displayCategory() {
        if (!this.currentCategory) return;

        console.log('🎨 Exibindo categoria:', this.currentCategory);

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

        // Atualizar estatísticas
        const topicCountElement = document.getElementById('topicCount');
        const replyCountElement = document.getElementById('replyCount');
        const membersElement = document.getElementById('categoryMembers');

        if (topicCountElement) topicCountElement.textContent = this.currentCategory.topic_count || 0;
        if (replyCountElement) replyCountElement.textContent = this.currentCategory.reply_count || 0;
        if (membersElement) membersElement.textContent = this.currentCategory.member_count || 0;

        console.log('✅ Categoria exibida na interface');
    }

    async async loadTopics() {
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