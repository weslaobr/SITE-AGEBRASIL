// forum-api.js - VERSÃO CORRIGIDA
class ForumAPI {
    constructor() {
        this.baseURL = "https://ageivbrasil.up.railway.app";

        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.categoriesLoaded = false;

        this.admins = [
            "407624932101455873" // WESLEY
        ];

        console.log("🚀 ForumAPI inicializado");
        this.loadCurrentUser();
        this.loadCategories();
    }

    /* ====================== AUTH ====================== */

    async loadCurrentUser() {
        try {
            // Aguardar um pouco para garantir que o DiscordAuth esteja carregado
            await new Promise(resolve => setTimeout(resolve, 100));

            if (window.discordAuth && window.discordAuth.isLoggedIn()) {
                this.currentUser = window.discordAuth.getCurrentUser();
                this.isAdmin = this.admins.includes(String(this.currentUser.id));

                console.log("👤 Usuário carregado:", {
                    id: this.currentUser.id,
                    nome: this.currentUser.global_name || this.currentUser.username,
                    admin: this.isAdmin
                });
            } else {
                console.log("👤 Nenhum usuário logado");
                this.currentUser = null;
                this.isAdmin = false;
            }
        } catch (error) {
            console.error("❌ Erro ao carregar usuário:", error);
            this.currentUser = null;
            this.isAdmin = false;
        }
    }

    /* ====================== CATEGORIES ====================== */

    // NO forum-api.js - ADICIONAR MÉTODO PARA BUSCAR CATEGORIA POR SLUG
    async getCategoryBySlug(slug) {
        try {
            console.log(`📂 Buscando categoria por slug: ${slug}`);
            const response = await fetch(`${this.baseURL}/api/forum/categories`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const categories = await response.json();
            const category = categories.find(cat => cat.slug === slug);

            if (!category) {
                console.error(`❌ Categoria não encontrada com slug: ${slug}`);
                return null;
            }

            console.log('✅ Categoria encontrada:', category);
            return category;

        } catch (error) {
            console.error('❌ Erro ao buscar categoria:', error);
            return null;
        }
    }

    // ✅ CORREÇÃO: Atualizar método loadCategory no forum-category.js
    async loadCategory() {
        console.log('📂 Carregando categoria:', this.currentCategorySlug);

        try {
            // ✅ CORREÇÃO: Buscar categoria REAL do banco
            this.currentCategory = await this.api.getCategoryBySlug(this.currentCategorySlug);

            if (!this.currentCategory) {
                console.error('❌ Categoria não encontrada com slug:', this.currentCategorySlug);

                // Tentar fallback nas categorias já carregadas
                this.currentCategory = this.api.categories.find(
                    cat => cat.slug === this.currentCategorySlug
                );

                if (!this.currentCategory) {
                    this.showError(`Categoria "${this.currentCategorySlug}" não encontrada`);
                    return;
                }
            }

            console.log('✅ Categoria REAL encontrada:', this.currentCategory.name);
            await this.displayCategory();
            await this.loadTopics();

        } catch (error) {
            console.error('❌ Erro ao carregar categoria:', error);
            this.showError('Erro ao carregar categoria: ' + error.message);
        }
    }

    async loadCategories() {
        try {
            console.log("📂 Buscando categorias do servidor...");
            const response = await fetch(`${this.baseURL}/api/forum/categories`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const categoriesData = await response.json();
            console.log("📦 Dados brutos das categorias:", categoriesData);

            // Verificar a estrutura dos dados retornados
            if (Array.isArray(categoriesData)) {
                this.categories = categoriesData.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description,
                    icon: cat.icon || "fas fa-folder",
                    color: cat.color || "#e53e3e",
                    topic_count: cat.topic_count || cat.topicCount || 0,
                    reply_count: cat.reply_count || cat.replyCount || 0,
                    created_at: cat.created_at
                }));

                this.categoriesLoaded = true;
                console.log("✅ Categorias formatadas:", this.categories.length);
            } else {
                console.warn("⚠️ Estrutura inesperada de categorias:", categoriesData);
                this.categories = [];
            }

        } catch (error) {
            console.error("❌ Erro ao carregar categorias:", error);
            this.categories = [];

            // Criar categorias padrão como fallback
            this.createFallbackCategories();
        }
    }

    createFallbackCategories() {
        console.log("🛠️ Criando categorias de fallback...");
        this.categories = [
            {
                id: 1,
                name: "Estratégias",
                slug: "estrategias",
                description: "Discuta estratégias e táticas do Age of Empires IV",
                icon: "fas fa-chess",
                color: "#3e8ce5",
                topic_count: 0,
                reply_count: 0
            },
            {
                id: 2,
                name: "Civilizações",
                slug: "civilizacoes",
                description: "Discussões sobre as diferentes civilizações",
                icon: "fas fa-landmark",
                color: "#48bb78",
                topic_count: 0,
                reply_count: 0
            },
            {
                id: 3,
                name: "Dúvidas",
                slug: "duvidas",
                description: "Tire suas dúvidas sobre o jogo",
                icon: "fas fa-question-circle",
                color: "#ed8936",
                topic_count: 0,
                reply_count: 0
            }
        ];
        this.categoriesLoaded = true;
    }

    async ensureCategoriesLoaded() {
        if (!this.categoriesLoaded) {
            console.log("⏳ Categorias não carregadas, aguardando...");
            await this.loadCategories();
        }

        // Se ainda não carregou, usar fallback
        if (!this.categoriesLoaded && this.categories.length === 0) {
            this.createFallbackCategories();
        }

        return this.categories;
    }

    // NO forum-api.js - ADICIONAR MÉTODO PARA DADOS EM LOTE
    async getCategoriesWithStats() {
        try {
            console.log('📊 Buscando categorias com estatísticas em lote...');

            const response = await fetch(`${this.baseURL}/api/forum/categories`);
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

            const categories = await response.json();

            // Buscar estatísticas para todas as categorias de uma vez
            const categoriesWithStats = await Promise.all(
                categories.map(async (category) => {
                    try {
                        const topicsResponse = await fetch(
                            `${this.baseURL}/api/forum/categories/${category.slug}/topics`
                        );

                        if (!topicsResponse.ok) {
                            return { ...category, realTopicCount: 0, realReplyCount: 0, realMemberCount: 0 };
                        }

                        const topics = await topicsResponse.json();

                        // Calcular estatísticas
                        let totalReplies = 0;
                        let uniqueMembers = new Set();

                        for (const topic of topics) {
                            totalReplies += topic.reply_count || 0;
                            if (topic.author_discord_id) uniqueMembers.add(topic.author_discord_id);
                        }

                        return {
                            ...category,
                            realTopicCount: topics.length,
                            realReplyCount: totalReplies,
                            realMemberCount: uniqueMembers.size
                        };

                    } catch (error) {
                        console.error(`Erro na categoria ${category.name}:`, error);
                        return { ...category, realTopicCount: 0, realReplyCount: 0, realMemberCount: 0 };
                    }
                })
            );

            return categoriesWithStats;

        } catch (error) {
            console.error('❌ Erro ao buscar categorias com stats:', error);
            return [];
        }
    }

    /* ====================== STATS ====================== */

    async getStats() {
        try {
            console.log("📊 Buscando estatísticas do servidor...");
            const response = await fetch(`${this.baseURL}/api/forum/stats`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const stats = await response.json();
            console.log("📊 Stats recebidos:", stats);

            // ✅ CORREÇÃO: Sincronizar com dados reais
            const topics = await this.getTopics();
            const allReplies = await Promise.all(
                topics.map(topic => this.getReplies(topic.id))
            );
            const totalReplies = allReplies.flat().length;

            return {
                totalTopics: topics.length,
                totalReplies: totalReplies,
                totalMembers: stats.totalMembers || stats.total_members || topics.length > 0 ? 1 : 0,
                onlineNow: stats.onlineNow || stats.online_now || 1
            };

        } catch (error) {
            console.error("❌ Erro ao buscar stats:", error);

            // ✅ CORREÇÃO: Stats baseados em dados locais
            const topics = await this.getTopics();
            const allReplies = await Promise.all(
                topics.map(topic => this.getReplies(topic.id))
            );
            const totalReplies = allReplies.flat().length;

            return {
                totalTopics: topics.length,
                totalReplies: totalReplies,
                totalMembers: topics.length > 0 ? 1 : 0,
                onlineNow: 1
            };
        }
    }

    /* ====================== TOPICS ====================== */

    // NO forum-api.js - CORRIGIR getTopics
    async getTopics(categorySlug = null, limit = null) {
        try {
            console.log(`📝 Buscando tópicos para categoria: ${categorySlug || 'todas'}`);

            let url = `${this.baseURL}/api/forum/topics`;
            if (categorySlug) {
                url = `${this.baseURL}/api/forum/categories/${categorySlug}/topics`;
            }

            console.log('🔗 URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log("📭 Nenhum tópico encontrado");
                    return [];
                }
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const topics = await response.json();
            console.log(`📦 Tópicos recebidos: ${topics.length}`);

            // ✅ CORREÇÃO: Log detalhado para debug
            if (topics.length > 0) {
                console.log('📋 Primeiro tópico:', {
                    id: topics[0].id,
                    title: topics[0].title,
                    author: topics[0].author_name || topics[0].author,
                    authorId: topics[0].author_discord_id,
                    replyCount: topics[0].reply_count
                });
            }

            return topics.map(topic => this.formatTopic(topic));

        } catch (error) {
            console.error("❌ Erro ao buscar tópicos:", error);
            return [];
        }
    }

    async getTopic(id) {
        try {
            console.log(`📖 Buscando tópico ID: ${id}`);
            const response = await fetch(`${this.baseURL}/api/forum/topics/${id}`);

            if (!response.ok) {
                throw new Error(`Tópico não encontrado: ${response.status}`);
            }

            const topic = await response.json();
            console.log("✅ Tópico encontrado:", topic.title);
            return this.formatTopic(topic);

        } catch (error) {
            console.error("❌ Erro ao buscar tópico:", error);
            throw error;
        }
    }

    async createTopic(data) {
        if (!this.currentUser) {
            throw new Error("Faça login para criar tópicos");
        }

        console.log("📝 Criando novo tópico:", data);

        const payload = {
            category_id: Number(data.categoryId),
            title: data.title.trim(),
            content: data.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        const response = await fetch(`${this.baseURL}/api/forum/topics`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erro na resposta:", errorText);
            throw new Error(errorText || "Erro ao criar tópico");
        }

        const newTopic = await response.json();
        console.log("✅ Tópico criado com sucesso:", newTopic.id);
        return this.formatTopic(newTopic);
    }

    /* ====================== REPLIES ====================== */

    async getReplies(topicId) {
        try {
            console.log(`💬 Buscando respostas para tópico: ${topicId}`);
            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}/replies`);

            if (!response.ok) {
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const replies = await response.json();
            console.log(`📦 Respostas recebidas: ${replies.length}`);

            return replies.map(reply => ({
                id: reply.id,
                topicId: reply.topic_id,
                content: reply.content,
                author: reply.author_name,
                authorId: reply.author_discord_id,
                authorAvatar: reply.author_avatar,
                createdAt: reply.created_at,
                updatedAt: reply.updated_at,
                isEdited: reply.is_edited || false
            }));

        } catch (error) {
            console.error("❌ Erro ao buscar respostas:", error);
            return [];
        }
    }

    async createReply(data) {
        if (!this.currentUser) {
            throw new Error("Faça login para enviar respostas");
        }

        console.log("💬 Criando nova resposta:", data);

        const payload = {
            topic_id: Number(data.topicId),
            content: data.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        const response = await fetch(`${this.baseURL}/api/forum/replies`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Erro ao enviar resposta");
        }

        const reply = await response.json();
        console.log("✅ Resposta criada com sucesso:", reply.id);

        return {
            id: reply.id,
            topicId: reply.topic_id,
            content: reply.content,
            author: reply.author_name,
            authorId: reply.author_discord_id,
            authorAvatar: reply.author_avatar,
            createdAt: reply.created_at
        };
    }

    /* ====================== FORMAT TOPIC ====================== */

    // NO forum-api.js - CORRIGIR O MÉTODO formatTopic()
    formatTopic(t) {
        return {
            id: t.id,
            categoryId: t.category_id,
            categorySlug: t.category_slug,
            categoryName: t.category_name,

            title: t.title,
            content: t.content,

            // ✅ CORREÇÃO: Mapear corretamente os campos do backend
            author: t.author_name || t.author, // Usar author_name do backend
            authorId: t.author_discord_id || t.authorId,
            authorAvatar: t.author_avatar,

            views: t.views || 0,
            isPinned: t.is_pinned || t.isPinned || false,
            isLocked: t.is_locked || t.isLocked || false,

            createdAt: t.created_at || t.createdAt,
            updatedAt: t.updated_at || t.updatedAt,
            lastReplyAt: t.last_reply_at || t.lastReplyAt,

            // ✅ CORREÇÃO: Incluir replyCount se disponível
            replyCount: t.reply_count || 0
        };
    }

    // ✅ CORREÇÃO: Adicionar métodos de moderação que faltavam
    async togglePinTopic(topicId) {
        try {
            const currentTopic = await this.getTopic(topicId);
            const newPinnedState = !currentTopic.isPinned;

            console.log(`📌 ${newPinnedState ? 'Fixando' : 'Desfixando'} tópico ${topicId}`);

            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_pinned: newPinnedState
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const updatedTopic = await response.json();
            console.log('✅ Tópico atualizado:', updatedTopic);
            return this.formatTopic(updatedTopic);

        } catch (error) {
            console.error('❌ Erro ao fixar/desfixar tópico:', error);
            throw error;
        }
    }

    async toggleLockTopic(topicId) {
        try {
            const currentTopic = await this.getTopic(topicId);
            const newLockedState = !currentTopic.isLocked;

            console.log(`🔒 ${newLockedState ? 'Bloqueando' : 'Desbloqueando'} tópico ${topicId}`);

            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_locked: newLockedState
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const updatedTopic = await response.json();
            console.log('✅ Tópico atualizado:', updatedTopic);
            return this.formatTopic(updatedTopic);

        } catch (error) {
            console.error('❌ Erro ao bloquear/desbloquear tópico:', error);
            throw error;
        }
    }

    async deleteTopic(topicId) {
        try {
            console.log(`🗑️ Deletando tópico ${topicId}`);

            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Tópico deletado:', result);
            return result;

        } catch (error) {
            console.error('❌ Erro ao deletar tópico:', error);
            throw error;
        }
    }

    async deleteReply(replyId) {
        try {
            console.log(`🗑️ Deletando resposta ${replyId}`);

            const response = await fetch(`${this.baseURL}/api/forum/replies/${replyId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Resposta deletada:', result);
            return result;

        } catch (error) {
            console.error('❌ Erro ao deletar resposta:', error);
            throw error;
        }
    }

    /* ====================== DEBUG ====================== */

    async debugConnection() {
        console.log("🔍=== DEBUG CONEXÃO ===");
        console.log("📍 Base URL:", this.baseURL);

        try {
            // Testar conexão com categorias
            const categoriesResponse = await fetch(`${this.baseURL}/api/forum/categories`);
            console.log("📂 Status categorias:", categoriesResponse.status);

            // Testar conexão com stats
            const statsResponse = await fetch(`${this.baseURL}/api/forum/stats`);
            console.log("📊 Status stats:", statsResponse.status);

            // Testar conexão com tópicos
            const topicsResponse = await fetch(`${this.baseURL}/api/forum/topics?limit=1`);
            console.log("📝 Status tópicos:", topicsResponse.status);

        } catch (error) {
            console.error("❌ Erro no teste de conexão:", error);
        }

        console.log("👤 Usuário atual:", this.currentUser);
        console.log("📂 Categorias carregadas:", this.categories.length);
        console.log("🔚=== FIM DEBUG ===");
    }
}

/* ====================== INSTÂNCIA GLOBAL ====================== */

console.log("🌐 ForumAPI carregado");
window.forumAPI = new ForumAPI();

// Adicionar função global de debug
window.debugForumAPI = function () {
    if (window.forumAPI) {
        window.forumAPI.debugConnection();
    } else {
        console.error("❌ ForumAPI não disponível");
    }
};