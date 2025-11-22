// forum-category.js - VERSÃO COMPLETAMENTE 
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

        this.setupEventListeners();
        await this.waitForAuthAndCategories();

        // Carregar categoria independente de autenticação
        await this.loadCategory();
    }


    getCategorySlugFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        let categorySlug = urlParams.get('category');

        if (!categorySlug) {
            const path = window.location.pathname;
            const match = path.match(/forum-category\.html\?category=([^&]+)/);
            if (match) categorySlug = match[1];
        }

        console.log('🎯 Slug final:', categorySlug);
        return categorySlug;
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

    setupEventListeners() {
        const form = document.getElementById('newTopicForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewTopic();
            });
        }
    }

    async loadCategory() {
        console.log('📂 Carregando categoria:', this.currentCategorySlug);

        try {
            // ✅ BUSCAR CATEGORIA REAL
            this.currentCategory = this.api.categories.find(
                cat => cat.slug === this.currentCategorySlug
            );

            if (!this.currentCategory) {
                this.showError(`Categoria "${this.currentCategorySlug}" não encontrada`);
                return;
            }

            console.log('✅ Categoria encontrada:', this.currentCategory.name);
            await this.displayCategoryWithRealData();
            await this.loadTopics();

        } catch (error) {
            console.error('❌ Erro ao carregar categoria:', error);
            this.showError('Erro ao carregar categoria: ' + error.message);
        }
    }

    // ✅ MÉTODO NOVO: Carregar dados REAIS
    async displayCategoryWithRealData() {
        if (!this.currentCategory) return;

        console.log('🎨 Exibindo categoria com dados REAIS...');

        try {
            // Buscar tópicos REAIS desta categoria
            const topics = await this.api.getTopics(this.currentCategorySlug);

            // Calcular estatísticas REAIS
            let totalReplies = 0;
            let uniqueMembers = new Set();

            for (const topic of topics) {
                // Agora usamos repliesCount que vem do backend
                totalReplies += (topic.repliesCount || 0);

                if (topic.authorId) uniqueMembers.add(topic.authorId);
            }

            const realTopicCount = topics.length;
            const realReplyCount = totalReplies;
            const realMemberCount = uniqueMembers.size;

            console.log('📊 Dados REAIS calculados:', {
                topics: realTopicCount,
                replies: realReplyCount,
                members: realMemberCount
            });

            // Atualizar interface
            this.updateCategoryHeader(realTopicCount, realReplyCount, realMemberCount);

        } catch (error) {
            console.error('❌ Erro ao carregar dados reais:', error);
            this.updateCategoryHeader(0, 0, 0);
        }
    }

    updateCategoryHeader(topicCount, replyCount, memberCount) {
        // Atualizar breadcrumb
        const breadcrumbElement = document.getElementById('categoryNameBreadcrumb');
        if (breadcrumbElement) {
            breadcrumbElement.textContent = this.currentCategory.name;
        }

        // Atualizar título
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

        // ✅ ATUALIZAR COM DADOS REAIS
        const topicCountElement = document.getElementById('topicCount');
        const replyCountElement = document.getElementById('replyCount');
        const membersElement = document.getElementById('categoryMembers');

        if (topicCountElement) {
            topicCountElement.textContent = topicCount;
            console.log('✅ Tópicos atualizados:', topicCount);
        }
        if (replyCountElement) {
            replyCountElement.textContent = replyCount;
            console.log('✅ Respostas atualizadas:', replyCount);
        }
        if (membersElement) {
            membersElement.textContent = memberCount;
            console.log('✅ Membros atualizados:', memberCount);
        }
    }

    async loadTopics() {
        console.log('📝 Carregando tópicos para:', this.currentCategorySlug);

        try {
            const topics = await this.api.getTopics(this.currentCategorySlug);
            const topicsList = document.getElementById('topicsList');

            if (!topics || topics.length === 0) {
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
                const replyCount = topic.repliesCount || 0;

                return `
                    <div class="topic-item ${topic.isPinned ? 'pinned' : ''}" 
                         data-id="${topic.id}">
                        <div class="topic-avatar">
                            ${topic.authorAvatar ?
                        `<img src="https://cdn.discordapp.com/avatars/${topic.authorId}/${topic.authorAvatar}.webp?size=45"
                                      onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">` :
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
            });

            topicsList.innerHTML = topicsHTML.join('');

            // Adicionar event listeners para clique
            document.querySelectorAll('.topic-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const id = item.dataset.id;
                    console.log('🔹 Clicou no tópico:', id);
                    window.location.href = `forum-topic.html?id=${id}`;
                });
            });

            console.log('✅ Tópicos carregados na interface');

        } catch (error) {
            console.error('❌ Erro ao carregar tópicos:', error);
            const topicsList = document.getElementById('topicsList');
            topicsList.innerHTML = `
                <div class="no-topics">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar tópicos</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    // ✅ MÉTODO CORRIGIDO: Criar novo tópico
    async createNewTopic() {
        console.log('📝 Criando novo tópico...');

        if (!this.api.currentUser) {
            alert('Faça login para criar tópicos.');
            return;
        }

        const title = document.getElementById('topicTitle').value.trim();
        const content = document.getElementById('topicContent').value.trim();

        console.log('📋 Dados do formulário:', { title, content });

        // Validações
        if (!title || !content) {
            alert('Preencha todos os campos.');
            return;
        }

        if (title.length < 5) {
            alert('O título deve ter pelo menos 5 caracteres.');
            return;
        }

        if (content.length < 10) {
            alert('O conteúdo deve ter pelo menos 10 caracteres.');
            return;
        }

        try {
            const topicData = {
                categoryId: this.currentCategory.id,
                title: title,
                content: content
            };

            console.log('📤 Enviando tópico:', topicData);

            const newTopic = await this.api.createTopic(topicData);
            console.log('✅ Tópico criado com sucesso:', newTopic);

            // Fechar modal
            this.closeNewTopicModal();

            // Recarregar dados
            await this.displayCategoryWithRealData();
            await this.loadTopics();

            alert('Tópico criado com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao criar tópico:', error);
            alert('Erro ao criar tópico: ' + error.message);
        }
    }

    openNewTopicModal() {
        const modal = document.getElementById('newTopicModal');
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => {
                const titleInput = document.getElementById('topicTitle');
                if (titleInput) titleInput.focus();
            }, 100);
        }
    }

    closeNewTopicModal() {
        const modal = document.getElementById('newTopicModal');
        const form = document.getElementById('newTopicForm');
        if (modal) modal.style.display = 'none';
        if (form) form.reset();
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

    showError(message) {
        const container = document.getElementById('categoryContent');
        if (!container) return;

        container.innerHTML = `
            <div class="no-auth-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro</h3>
                <p>${message}</p>
                <button class="login-btn" onclick="window.location.href = 'forum.html'">
                    <i class="fas fa-arrow-left"></i> Voltar ao Fórum
                </button>
            </div>
        `;
    }
}

// ✅ INICIALIZAÇÃO SIMPLIFICADA
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumCategoryUI...');
    window.forumCategoryUI = new ForumCategoryUI();
});