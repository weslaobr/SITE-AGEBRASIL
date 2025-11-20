// js/header-manager.js - GERENCIADOR PADRONIZADO DE HEADER

class HeaderManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    // Obtém a página atual baseada no nome do arquivo
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page;
    }

    // Marca o link ativo no menu
    setActiveNavLink() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Renderiza o header baseado no estado de autenticação
    renderHeader() {
        const userInfo = document.getElementById('userInfo');
        const loginContainer = document.getElementById('loginContainer');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        const user = this.getCurrentUser();

        if (user) {
            // USUÁRIO LOGADO
            if (userInfo) {
                userInfo.style.display = 'flex';
                const avatar = user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
                    : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

                userInfo.innerHTML = `
                    <div class="user-avatar"><img src="${avatar}" alt="${user.username}"></div>
                    <div class="user-name">${user.global_name || user.username}</div>
                `;
            }
            if (loginContainer) loginContainer.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            // USUÁRIO NÃO LOGADO
            if (userInfo) userInfo.style.display = 'none';
            if (loginContainer) loginContainer.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }

        this.setActiveNavLink();
    }

    // Obtém o usuário atual (compatível com discord-login.js e forum-api.js)
    getCurrentUser() {
        if (window.discordAuth && typeof window.discordAuth.getCurrentUser === 'function') {
            return window.discordAuth.getCurrentUser();
        }

        if (window.forumAPI && window.forumAPI.currentUser) {
            return window.forumAPI.currentUser;
        }

        // Fallback: verifica localStorage diretamente
        try {
            const userData = localStorage.getItem('discord_user');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    // Configura os event listeners
    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    // Manipula o login
    handleLogin() {
        if (window.discordAuth && typeof window.discordAuth.login === 'function') {
            window.discordAuth.login();
        } else {
            // Fallback
            window.location.href = 'forum-auth.html';
        }
    }

    // Manipula o logout
    handleLogout() {
        if (window.discordAuth && typeof window.discordAuth.logout === 'function') {
            window.discordAuth.logout();
        } else {
            // Fallback
            localStorage.removeItem('discord_user');
            localStorage.removeItem('discord_access_token');
            localStorage.removeItem('discord_refresh_token');
            setTimeout(() => window.location.reload(), 300);
        }
    }

    // Inicializa o header manager
    init() {
        this.renderHeader();
        this.setupEventListeners();

        // Re-renderiza quando as libs carregarem
        setTimeout(() => this.renderHeader(), 500);
        setTimeout(() => this.renderHeader(), 1000);
        setTimeout(() => this.renderHeader(), 2000);

        // Expõe método global para re-renderizar se necessário
        window.renderHeader = () => this.renderHeader();
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.headerManager = new HeaderManager();
});