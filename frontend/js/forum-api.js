// forum-api.js - VERSÃO 100% COMPATÍVEL COM SEU BANCO REAL (2025)
class ForumAPI {
    constructor() {
        // Lógica robusta para definir a URL da API
        if (window.location.hostname === 'localhost' && window.location.port !== '3001') {
            this.baseURL = 'http://localhost:3001';
            console.log('🔧 Modo Desenvolvimento: Forçando API para porta 3001');
        } else {
            this.baseURL = window.location.origin;
        }

        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.admins = ["407624932101455873"]; // BRO.WESLAO

        console.log("ForumAPI carregado →", this.baseURL);
        this.loadCurrentUser();
        this.loadCategories();
    }

    getAuthHeaders() {
        const token = localStorage.getItem('discord_access_token');
        const userData = localStorage.getItem('discord_user');
        const headers = { 'Content-Type': 'application/json' };

        if (token) headers.Authorization = `Bearer ${token}`;
        if (userData) {
            try {
                const user = JSON.parse(userData);
                headers['X-User'] = JSON.stringify(user);
            } catch (e) { }
        }
        return headers;
    }

    async loadCurrentUser() {
        try {
            const data = localStorage.getItem('discord_user');
            if (data) {
                this.currentUser = JSON.parse(data);
                this.isAdmin = this.admins.includes(String(this.currentUser.id));
            }
        } catch (e) {
            this.currentUser = null;
        }
    }

    async loadCategories() {
        try {
            const res = await fetch(`${this.baseURL}/api/forum/categories`, {
                headers: this.getAuthHeaders()
            });
            if (!res.ok) throw new Error();
            this.categories = await res.json();
        } catch (e) {
            console.error("Erro categorias");
            this.categories = [];
        }
    }

    async getTopics(categorySlug = null) {
        let url = `${this.baseURL}/api/forum/topics`;
        if (categorySlug) url += `?category=${categorySlug}`;
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    }

    async getTopic(id) {
        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            headers: this.getAuthHeaders()
        });
        if (!res.ok) throw new Error("Tópico não encontrado");
        return await res.json();
    }

    // ✅ NOVO MÉTODO: getReplies (necessário para forum-category.js)
    async getReplies(topicId) {
        try {
            // Como não há endpoint direto de replies, usamos getTopic que retorna replies
            const topic = await this.getTopic(topicId);
            return topic.replies || [];
        } catch (error) {
            console.error(`Erro ao buscar replies para tópico ${topicId}:`, error);
            return [];
        }
    }

    async createTopic(data) {
        const res = await fetch(`${this.baseURL}/api/forum/topics`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Erro ao criar tópico");
        return await res.json();
    }

    async createReply(topicId, content) {
        const res = await fetch(`${this.baseURL}/api/forum/replies`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ topicId, content })
        });
        if (!res.ok) throw new Error("Erro ao responder");
        return await res.json();
    }

    async getStats() {
        try {
            const res = await fetch(`${this.baseURL}/api/forum/stats`, { headers: this.getAuthHeaders() });
            if (res.ok) return await res.json();
        } catch { }
        return { totalTopics: 0, totalReplies: 0, totalMembers: 0, onlineNow: 1 };
    }
}

window.forumAPI = new ForumAPI();