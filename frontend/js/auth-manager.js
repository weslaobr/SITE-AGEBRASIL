// js/auth-manager.js - GERENCIADOR ROBUSTO DE AUTENTICAÇÃO
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    init() {
        console.log('🔐 Inicializando AuthManager...');
        this.loadUserFromStorage();
        this.setupAuthMonitor();
    }

    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('discord_user');
            const token = localStorage.getItem('discord_access_token');

            if (userData && token) {
                this.currentUser = JSON.parse(userData);
                this.checkAdminStatus();
                console.log('👤 Usuário carregado do storage:', this.currentUser.username);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuário do storage:', error);
            this.clearAuth();
        }
    }

    checkAdminStatus() {
        const admins = ["407624932101455873"]; // WESLEY
        this.isAdmin = this.currentUser && admins.includes(String(this.currentUser.id));
    }

    setUser(user, token) {
        try {
            localStorage.setItem('discord_user', JSON.stringify(user));
            localStorage.setItem('discord_access_token', token);
            this.currentUser = user;
            this.checkAdminStatus();
            console.log('✅ Usuário definido:', user.username);
            this.updateUI();
        } catch (error) {
            console.error('❌ Erro ao salvar usuário:', error);
        }
    }

    clearAuth() {
        localStorage.removeItem('discord_user');
        localStorage.removeItem('discord_access_token');
        localStorage.removeItem('discord_refresh_token');
        this.currentUser = null;
        this.isAdmin = false;
        console.log('🚪 Usuário desconectado');
        this.updateUI();
    }

    getAvatarUrl(user = this.currentUser) {
        if (!user) return null;

        if (user.avatar) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`;
        } else {
            const discriminator = user.discriminator || '0';
            return `https://cdn.discordapp.com/embed/avatars/${discriminator % 5}.png`;
        }
    }

    getUserName(user = this.currentUser) {
        if (!user) return null;
        return user.global_name || user.username;
    }

    setupAuthMonitor() {
        // Verificar a cada 30 segundos se o usuário ainda está autenticado
        setInterval(() => {
            this.validateAuth();
        }, 30000);
    }

    validateAuth() {
        const token = localStorage.getItem('discord_access_token');
        if (!token) {
            this.clearAuth();
            return;
        }

        // Verificar se o usuário ainda está no localStorage
        this.loadUserFromStorage();
    }

    updateUI() {
        // Disparar evento customizado para que outros componentes atualizem
        const event = new CustomEvent('authStateChanged', {
            detail: { user: this.currentUser, isAdmin: this.isAdmin }
        });
        document.dispatchEvent(event);
    }
}

// Instância global
window.authManager = new AuthManager();