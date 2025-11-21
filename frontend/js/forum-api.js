// forum-api.js - VERSÃO FINAL 100% FUNCIONAL COM POSTGRESQL
class ForumAPI {
    constructor() {
        this.baseURL = window.location.origin; // ← ISSO AQUI É OBRIGATÓRIO
        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.categoriesLoaded = false;

        this.admins = ["407624932101455873"]; // BRO.WESLAO

        console.log("ForumAPI inicializado →", this.baseURL);
        this.loadCurrentUser();
        this.loadCategories();
    }

    // ENVIA TOKEN + USUÁRIO EM TODAS AS REQUISIÇÕES
    getAuthHeaders() {
        const token = localStorage.getItem('discord_access_token');
        const userData = localStorage.getItem('discord_user');

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
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
            const userData = localStorage.getItem('discord_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.isAdmin = this.admins.includes(String(this.currentUser.id));
                console.log("Usuário logado:", this.currentUser.global_name || this.currentUser.username);
            }
        } catch (e) {
            this.currentUser = null;
            this.isAdmin = false;
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/categories`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error("Erro " + response.status);

            const data = await response.json();
            this.categories = data;
            this.categoriesLoaded = true;
            console.log("Categorias carregadas do banco:", this.categories);
        } catch (err) {
            console.error("ERRO AO CARREGAR CATEGORIAS - VERIFIQUE SE O ENDPOINT EXISTE!");
            this.categories = []; // evita loop infinito
        }
    }

    async getTopics(categorySlug = null) {
        let url = `${this.baseURL}/api/forum/topics`;
        if (categorySlug) url += `?category=${categorySlug}`;
        const res = await fetch(url, { headers: this.getAuthHeaders() });
        if (!res.ok) throw new Error("Erro topics");
        return await res.json();
    }

    async getTopic(id) {
        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            headers: this.getAuthHeaders()
        });
        if (!res.ok) throw new Error("Tópico não encontrado");
        return await res.json();
    }

    async createTopic(data) {
        const res = await fetch(`${this.baseURL}/api/forum/topics`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Erro ao criar");
        }
        return await res.json();
    }

    async createReply(data) {
        const res = await fetch(`${this.baseURL}/api/forum/replies`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Erro ao responder");
        return await res.json();
    }

    async getStats() {
        try {
            const res = await fetch(`${this.baseURL}/api/forum/stats`, {
                headers: this.getAuthHeaders()
            });
            if (res.ok) return await res.json();
        } catch (e) { }
        return { totalTopics: 0, totalReplies: 0, totalMembers: 0, onlineNow: 1 };
    }
}

window.forumAPI = new ForumAPI();