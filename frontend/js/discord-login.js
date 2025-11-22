// discord-login.js - VERSÃO CORRIGIDA 
class DiscordAuth {
    constructor() {
        // 🔧 CONFIGURAÇÃO
        this.clientId = '1440856041867968542'; // Seu Client ID
        // clientSecret REMOVIDO - A troca de token agora é feita no backend
        this.redirectUri = `${window.location.origin}/forum-auth.html`;
        this.scopes = ['identify', 'email', 'guilds'];

        console.log('🔐 DiscordAuth inicializado');
        this.validateConfig();
    }

    validateConfig() {
        if (!this.clientId || this.clientId.length < 18) {
            console.error('❌ Client ID inválido ou muito curto');
        }
    }

    // 🔗 GERAR URL DE LOGIN
    getLoginUrl() {
        const state = this.generateState();
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: this.scopes.join(' '),
            state: state,
            prompt: 'consent'
        });

        return `https://discord.com/api/oauth2/authorize?${params}`;
    }

    // 🔑 GERAR STATE PARA SEGURANÇA
    generateState() {
        const state = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15) +
            Date.now().toString(36);

        localStorage.setItem('oauth_state', state);
        return state;
    }

    // 🔍 VERIFICAR STATE
    verifyState(state) {
        const savedState = localStorage.getItem('oauth_state');
        localStorage.removeItem('oauth_state');
        return state === savedState;
    }

    // 🚀 FAZER LOGIN
    login() {
        const returnUrl = window.location.href;
        localStorage.setItem('returnUrl', returnUrl);
        window.location.href = this.getLoginUrl();
    }

    // 🚪 FAZER LOGOUT
    logout() {
        localStorage.removeItem('discord_user');
        localStorage.removeItem('discord_access_token');
        localStorage.removeItem('discord_refresh_token');
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('returnUrl');
        window.location.href = 'forum.html';
    }

    // 🔐 VERIFICAR SE USUÁRIO ESTÁ LOGADO
    isLoggedIn() {
        return !!localStorage.getItem('discord_user');
    }

    // 👤 OBTER USUÁRIO ATUAL
    getCurrentUser() {
        const userData = localStorage.getItem('discord_user');
        try {
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    }

    //  SALVAR DADOS
    saveUserData(userData, tokenData) {
        localStorage.setItem('discord_user', JSON.stringify(userData));
        if (tokenData && tokenData.access_token) {
            localStorage.setItem('discord_access_token', tokenData.access_token);
        }
        if (tokenData && tokenData.refresh_token) {
            localStorage.setItem('discord_refresh_token', tokenData.refresh_token);
        }
    }

    // 🔄 TROCAR CODE POR TOKEN (VIA BACKEND)
    async exchangeCodeForToken(code) {
        console.log('🔄 Trocando code por token via backend...');

        const response = await fetch('/api/auth/discord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Falha na autenticação');
        }

        return await response.json();
    }

    // 🔄 PROCESSAR CALLBACK
    async processCallback(code, state) {
        try {
            if (!this.verifyState(state)) {
                throw new Error('State inválido');
            }

            // Troca o code pelo token e dados do usuário no backend
            const data = await this.exchangeCodeForToken(code);

            // O backend retorna { token: {...}, user: {...} }
            this.saveUserData(data.user, data.token);

            console.log('✅ Autenticação concluída:', data.user.username);
            return true;

        } catch (error) {
            console.error('❌ Erro na autenticação:', error);
            throw error;
        }
    }
}

// 🌐 INSTÂNCIA GLOBAL
if (!window.discordAuth) {
    window.discordAuth = new DiscordAuth();
}