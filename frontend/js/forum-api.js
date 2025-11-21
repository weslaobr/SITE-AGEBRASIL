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

    /* ====================== STATS ====================== */

    async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/stats`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const stats = await response.json();
            console.log("📊 Stats recebidos:", stats);

            return {
                totalTopics: stats.totalTopics || stats.total_topics || 0,
                totalReplies: stats.totalReplies || stats.total_replies || 0,
                totalMembers: stats.totalMembers || stats.total_members || 0,
                onlineNow: stats.onlineNow || stats.online_now || 0
            };

        } catch (error) {
            console.error("❌ Erro ao buscar stats:", error);

            // Stats de fallback
            return {
                totalTopics: 0,
                totalReplies: 0,
                totalMembers: 0,
                onlineNow: 0
            };
        }
    }

    /* ====================== TOPICS ====================== */

    async getTopics(categorySlug = null, limit = null) {
        try {
            console.log(`📝 Buscando tópicos para categoria: ${categorySlug || 'todas'}`);

            let url = `${this.baseURL}/api/forum/topics`;
            if (categorySlug) {
                url = `${this.baseURL}/api/forum/categories/${categorySlug}/topics`;
            }

            if (limit) {
                url += `?limit=${limit}`;
            }

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

    formatTopic(t) {
        return {
            id: t.id,
            categoryId: t.category_id,
            categorySlug: t.category_slug,
            categoryName: t.category_name,

            title: t.title,
            content: t.content,

            author: t.author_name,
            authorId: t.author_discord_id,
            authorAvatar: t.author_avatar,

            views: t.views || 0,
            isPinned: t.is_pinned || false,
            isLocked: t.is_locked || false,

            createdAt: t.created_at,
            updatedAt: t.updated_at,
            lastReplyAt: t.last_reply_at
        };
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