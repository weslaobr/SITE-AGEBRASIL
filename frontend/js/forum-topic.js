< !DOCTYPE html >
    <html lang="pt-BR">

        <head>
            <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Tópico - Age of Empires IV Brasil</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                        <link rel="stylesheet" href="css/style.css">
                            <link rel="icon" type="image/png" href="https://i.postimg.cc/3JT4W3hz/favicon.png">

                                <style>
        /* HEADER COM DUAS LINHAS - PADRONIZADO */
                                    .header-top {
                                        display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    flex-wrap: wrap;
                                    gap: 1rem;
                                    padding-bottom: 1rem;
        }

                                    .header-bottom {
                                        display: flex;
                                    justify-content: flex-end;
                                    padding-top: 1rem;
        }

                                    .logo {
                                        display: flex;
                                    align-items: center;
                                    gap: 1rem;
        }

                                    .logo-img {
                                        height: 40px;
                                    width: auto;
        }

                                    .logo h1 {
                                        color: var(--text-color);
                                    font-size: 1.5rem;
                                    margin: 0;
        }

                                    nav ul {
                                        display: flex;
                                    list-style: none;
                                    margin: 0;
                                    padding: 0;
                                    gap: 2rem;
        }

                                    nav a {
                                        color: var(--text-color);
                                    text-decoration: none;
                                    font-weight: 500;
                                    transition: color 0.3s ease;
                                    padding: 0.5rem 0;
        }

                                    nav a:hover,
                                    nav a.active {
                                        color: var(--accent-color);
        }

                                    .user-actions {
                                        display: flex;
                                    align-items: center;
                                    gap: 1rem;
        }

                                    .user-info-container {
                                        display: flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                    background: var(--secondary-color);
                                    padding: 0.5rem 1rem;
                                    border-radius: 20px;
                                    border: 1px solid var(--border-color);
        }

                                    .user-avatar img {
                                        width: 32px;
                                    height: 32px;
                                    border-radius: 50%;
                                    border: 2px solid var(--accent-color);
        }

                                    .user-name {
                                        color: var(--text-color);
                                    font-weight: 600;
                                    font-size: 0.9rem;
        }

                                    .login-btn-header {
                                        background: none;
                                    border: none;
                                    color: var(--text-color);
                                    font-weight: 600;
                                    cursor: pointer;
                                    padding: 0;
                                    display: flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                    font-size: 0.9rem;
                                    transition: color 0.3s ease;
        }

                                    .login-btn-header:hover {
                                        color: var(--accent-color);
        }

                                    .logout-btn {
                                        background: #4a5568;
                                    color: white;
                                    border: none;
                                    padding: 0.7rem 1.2rem;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.3s ease;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                    font-size: 0.9rem;
        }

                                    .logout-btn:hover {
                                        background: #2d3748;
                                    transform: translateY(-1px);
        }

                                    .admin-badge {
                                        background: var(--accent-color);
                                    color: white;
                                    padding: 0.2rem 0.6rem;
                                    border-radius: 12px;
                                    font-size: 0.7rem;
                                    font-weight: 600;
        }

                                    @media (max-width: 768px) {
            .header - top {
                                        flex - direction: column;
                                    align-items: flex-start;
                                    gap: 1rem;
            }

                                    .header-bottom {
                                        justify - content: center;
            }

                                    nav ul {
                                        gap: 1rem;
                                    flex-wrap: wrap;
            }

                                    .user-actions {
                                        width: 100%;
                                    justify-content: center;
            }
        }

                                    /* ESTILOS DO TÓPICO */
                                    .topic-container {
                                        max - width: 900px;
                                    margin: 0 auto;
                                    padding: 2rem 0;
        }

                                    .topic-header {
                                        background: var(--card-bg);
                                    border-radius: 12px;
                                    padding: 2rem;
                                    border: 1px solid var(--border-color);
                                    margin-bottom: 2rem;
        }

                                    .topic-meta {
                                        display: flex;
                                    justify-content: between;
                                    align-items: center;
                                    margin-bottom: 1rem;
                                    flex-wrap: wrap;
                                    gap: 1rem;
        }

                                    .topic-category {
                                        background: var(--accent-color);
                                    color: white;
                                    padding: 0.4rem 1rem;
                                    border-radius: 20px;
                                    font-size: 0.8rem;
                                    font-weight: 600;
        }

                                    .topic-date {
                                        color: #a0aec0;
                                    font-size: 0.9rem;
        }

                                    .topic-title {
                                        font - size: 2rem;
                                    font-weight: 700;
                                    color: var(--text-color);
                                    margin-bottom: 1rem;
                                    line-height: 1.3;
        }

                                    .topic-author {
                                        display: flex;
                                    align-items: center;
                                    gap: 1rem;
                                    padding-top: 1rem;
                                    border-top: 1px solid var(--border-color);
        }

                                    .author-avatar {
                                        width: 50px;
                                    height: 50px;
                                    border-radius: 50%;
                                    background: var(--secondary-color);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: 600;
                                    color: var(--text-color);
                                    overflow: hidden;
        }

                                    .author-avatar img {
                                        width: 100%;
                                    height: 100%;
                                    object-fit: cover;
        }

                                    .author-info {
                                        flex: 1;
        }

                                    .author-name {
                                        font - weight: 600;
                                    color: var(--text-color);
                                    margin-bottom: 0.2rem;
        }

                                    .author-role {
                                        color: #a0aec0;
                                    font-size: 0.8rem;
        }

                                    .topic-content {
                                        background: var(--card-bg);
                                    border-radius: 12px;
                                    padding: 2rem;
                                    border: 1px solid var(--border-color);
                                    margin-bottom: 2rem;
                                    line-height: 1.6;
        }

                                    .topic-content p {
                                        margin - bottom: 1rem;
        }

                                    .topic-actions {
                                        display: flex;
                                    gap: 1rem;
                                    margin-top: 2rem;
                                    padding-top: 1rem;
                                    border-top: 1px solid var(--border-color);
        }

                                    .btn {
                                        padding: 0.7rem 1.5rem;
                                    border: none;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.3s ease;
                                    font-size: 0.9rem;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 0.5rem;
        }

                                    .btn-primary {
                                        background: var(--accent-color);
                                    color: white;
        }

                                    .btn-primary:hover {
                                        background: #c53030;
                                    transform: translateY(-1px);
        }

                                    .btn-secondary {
                                        background: var(--secondary-color);
                                    color: var(--text-color);
                                    border: 1px solid var(--border-color);
        }

                                    .btn-secondary:hover {
                                        background: #4a5568;
                                    transform: translateY(-1px);
        }

                                    /* RESPOSTAS */
                                    .replies-section {
                                        margin - top: 3rem;
        }

                                    .replies-header {
                                        display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 1.5rem;
        }

                                    .replies-header h2 {
                                        color: var(--text-color);
                                    margin: 0;
        }

                                    .replies-count {
                                        color: #a0aec0;
                                    font-size: 0.9rem;
        }

                                    .reply-form {
                                        background: var(--card-bg);
                                    border-radius: 12px;
                                    padding: 2rem;
                                    border: 1px solid var(--border-color);
                                    margin-bottom: 2rem;
        }

                                    .form-group {
                                        margin - bottom: 1.5rem;
        }

                                    .form-group label {
                                        display: block;
                                    margin-bottom: 0.5rem;
                                    color: var(--text-color);
                                    font-weight: 600;
                                    font-size: 0.9rem;
        }

                                    .form-group textarea {
                                        width: 100%;
                                    padding: 1rem;
                                    background: var(--secondary-color);
                                    border: 1px solid var(--border-color);
                                    border-radius: 8px;
                                    color: var(--text-color);
                                    font-size: 1rem;
                                    transition: border-color 0.3s ease;
                                    box-sizing: border-box;
                                    min-height: 120px;
                                    resize: vertical;
                                    font-family: inherit;
        }

                                    .form-group textarea:focus {
                                        outline: none;
                                    border-color: var(--accent-color);
                                    box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.1);
        }

                                    .form-actions {
                                        display: flex;
                                    gap: 1rem;
                                    justify-content: flex-end;
        }

                                    .replies-list {
                                        display: flex;
                                    flex-direction: column;
                                    gap: 1.5rem;
        }

                                    .reply-item {
                                        background: var(--card-bg);
                                    border-radius: 12px;
                                    padding: 1.5rem;
                                    border: 1px solid var(--border-color);
                                    transition: transform 0.3s ease;
        }

                                    .reply-item:hover {
                                        transform: translateY(-2px);
        }

                                    .reply-header {
                                        display: flex;
                                    justify-content: space-between;
                                    align-items: flex-start;
                                    margin-bottom: 1rem;
        }

                                    .reply-author {
                                        display: flex;
                                    align-items: center;
                                    gap: 1rem;
        }

                                    .reply-avatar {
                                        width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    background: var(--secondary-color);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: 600;
                                    color: var(--text-color);
                                    overflow: hidden;
        }

                                    .reply-avatar img {
                                        width: 100%;
                                    height: 100%;
                                    object-fit: cover;
        }

                                    .reply-author-info {
                                        flex: 1;
        }

                                    .reply-author-name {
                                        font - weight: 600;
                                    color: var(--text-color);
                                    margin-bottom: 0.2rem;
        }

                                    .reply-date {
                                        color: #a0aec0;
                                    font-size: 0.8rem;
        }

                                    .reply-content {
                                        line - height: 1.6;
                                    color: var(--text-color);
        }

                                    .reply-actions {
                                        display: flex;
                                    gap: 1rem;
                                    margin-top: 1rem;
                                    padding-top: 1rem;
                                    border-top: 1px solid var(--border-color);
        }

                                    .reply-action {
                                        background: none;
                                    border: none;
                                    color: #a0aec0;
                                    cursor: pointer;
                                    font-size: 0.8rem;
                                    display: flex;
                                    align-items: center;
                                    gap: 0.3rem;
                                    transition: color 0.3s ease;
        }

                                    .reply-action:hover {
                                        color: var(--accent-color);
        }

                                    /* BREADCRUMB */
                                    .breadcrumb {
                                        margin - bottom: 2rem;
                                    padding: 1rem 0;
        }

                                    .breadcrumb a {
                                        color: var(--accent-color);
                                    text-decoration: none;
        }

                                    .breadcrumb a:hover {
                                        text - decoration: underline;
        }

                                    .breadcrumb span {
                                        color: #a0aec0;
        }

                                    /* MENSAGEM SEM AUTENTICAÇÃO */
                                    .no-auth-message {
                                        background: var(--card-bg);
                                    border: 1px solid var(--border-color);
                                    border-radius: 12px;
                                    padding: 3rem;
                                    text-align: center;
                                    margin: 2rem 0;
        }

                                    .no-auth-message i {
                                        font - size: 4rem;
                                    color: var(--accent-color);
                                    margin-bottom: 1.5rem;
        }

                                    .no-auth-message h3 {
                                        color: var(--text-color);
                                    margin-bottom: 1rem;
                                    font-size: 1.5rem;
        }

                                    .no-auth-message p {
                                        color: #a0aec0;
                                    margin-bottom: 2rem;
                                    font-size: 1.1rem;
        }

                                    /* RESPONSIVIDADE */
                                    @media (max-width: 768px) {
            .topic - title {
                                        font - size: 1.5rem;
            }

                                    .topic-meta {
                                        flex - direction: column;
                                    align-items: flex-start;
            }

                                    .reply-header {
                                        flex - direction: column;
                                    gap: 1rem;
            }

                                    .form-actions {
                                        flex - direction: column;
            }
        }
                                </style>
                            </head>

                            <body>
                                <header>
                                    <div class="container">
                                        <!-- Primeira linha: Logo e Navegação -->
                                        <div class="header-top">
                                            <div class="logo">
                                                <img src="https://i.postimg.cc/rFNdr7FV/logo.png" alt="Age of Empires IV Brasil" class="logo-img">
                                                    <h1>Age of Empires IV Brasil</h1>
                                            </div>

                                            <nav>
                                                <ul>
                                                    <li><a href="index.html">Início</a></li>
                                                    <li><a href="forum.html">Fórum</a></li>
                                                    <li><a href="leaderboard.html">Tabela de classificação</a></li>
                                                    <li><a href="torneios.html">Torneios</a></li>
                                                    <li><a href="about.html">Sobre</a></li>
                                                </ul>
                                            </nav>
                                        </div>

                                        <!-- Segunda linha: Botão do Discord -->
                                        <div class="header-bottom">
                                            <div class="user-actions">
                                                <!-- Container do usuário logado -->
                                                <div id="userInfo" data-auth-only class="user-info-container" style="display: none;">
                                                    <div class="user-avatar">
                                                        <!-- Avatar será carregado via JavaScript -->
                                                    </div>
                                                    <div class="user-name">
                                                        <!-- Nome será carregado via JavaScript -->
                                                    </div>
                                                </div>

                                                <!-- Container do botão de login (não logado) -->
                                                <div id="loginContainer" data-no-auth class="user-info-container" style="display: none;">
                                                    <i class="fab fa-discord" style="color: #5865F2;"></i>
                                                    <button id="loginBtn" class="login-btn-header">
                                                        Entrar com Discord
                                                    </button>
                                                </div>

                                                <!-- Botão de logout -->
                                                <button id="logoutBtn" data-auth-only style="display: none;" class="logout-btn">
                                                    <i class="fas fa-sign-out-alt"></i>
                                                    Sair
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </header>

                                <main class="container">
                                    <!-- Breadcrumb -->
                                    <div class="breadcrumb">
                                        <a href="forum.html">Fórum</a>
                                        <span>→</span>
                                        <a href="#" id="categoryLink">Categoria</a>
                                        <span>→</span>
                                        <span id="topicTitleBreadcrumb">Tópico</span>
                                    </div>

                                    <!-- Mensagem para usuários não autenticados -->
                                    <div id="noAuthMessage" data-no-auth class="no-auth-message" style="display: none;">
                                        <i class="fab fa-discord"></i>
                                        <h3>Faça login para visualizar tópicos</h3>
                                        <p>Conecte-se com sua conta Discord para ler e participar das discussões</p>
                                        <button class="login-btn" onclick="window.forumTopicUI.redirectToLogin()">
                                            <i class="fab fa-discord"></i>
                                            Entrar com Discord
                                        </button>
                                    </div>

                                    <!-- Conteúdo do tópico (visível apenas para usuários autenticados) -->
                                    <div id="topicContent" data-auth-only style="display: none;">
                                        <div class="topic-container">
                                            <!-- Cabeçalho do Tópico -->
                                            <div class="topic-header">
                                                <div class="topic-meta">
                                                    <div class="topic-category" id="topicCategory">Estratégias</div>
                                                    <div class="topic-date" id="topicDate">há 2 dias</div>
                                                </div>
                                                <h1 class="topic-title" id="topicTitle">Carregando tópico...</h1>

                                                <div class="topic-author">
                                                    <div class="author-avatar" id="authorAvatar">
                                                        <!-- Avatar será carregado via JavaScript -->
                                                    </div>
                                                    <div class="author-info">
                                                        <div class="author-name" id="authorName">Autor</div>
                                                        <div class="author-role" id="authorRole">Membro</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Conteúdo do Tópico -->
                                            <div class="topic-content" id="topicContentText">
                                                <p>Carregando conteúdo do tópico...</p>
                                            </div>

                                            <!-- Ações do Tópico -->
                                            <div class="topic-actions">
                                                <button class="btn btn-secondary" onclick="window.history.back()">
                                                    <i class="fas fa-arrow-left"></i>
                                                    Voltar ao Fórum
                                                </button>
                                                <button class="btn btn-primary" onclick="scrollToReply()">
                                                    <i class="fas fa-reply"></i>
                                                    Responder
                                                </button>
                                            </div>

                                            <!-- Seção de Respostas -->
                                            <div class="replies-section">
                                                <div class="replies-header">
                                                    <h2>Respostas</h2>
                                                    <div class="replies-count" id="repliesCount">0 respostas</div>
                                                </div>

                                                <!-- Formulário de Resposta -->
                                                <div class="reply-form">
                                                    <div class="form-group">
                                                        <label for="replyContent">Sua Resposta</label>
                                                        <textarea id="replyContent" placeholder="Digite sua resposta aqui..." required
                                                            minlength="5"></textarea>
                                                    </div>
                                                    <div class="form-actions">
                                                        <button type="button" class="btn btn-secondary" onclick="clearReplyForm()">
                                                            <i class="fas fa-times"></i>
                                                            Cancelar
                                                        </button>
                                                        <button type="button" class="btn btn-primary" onclick="submitReply()">
                                                            <i class="fas fa-paper-plane"></i>
                                                            Enviar Resposta
                                                        </button>
                                                    </div>
                                                </div>

                                                <!-- Lista de Respostas -->
                                                <div class="replies-list" id="repliesList">
                                                    <!-- Respostas serão carregadas via JavaScript -->
                                                    <div class="no-replies" style="text-align: center; padding: 3rem; color: #a0aec0;">
                                                        <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                                                        <h3>Nenhuma resposta ainda</h3>
                                                        <p>Seja o primeiro a responder este tópico!</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </main>

                                <footer>
                                    <div class="container">
                                        <div class="footer-content">
                                            <div class="logo">
                                                <img src="https://i.postimg.cc/rFNdr7FV/logo.png" alt="Age of Empires IV Brasil" class="logo-img">
                                                    <h2>Age of Empires IV Brasil</h2>
                                            </div>
                                            <div class="footer-links">
                                                <a href="index.html">Início</a>
                                                <a href="forum.html">Fórum</a>
                                                <a href="leaderboard.html">Tabela de classificação</a>
                                                <a href="torneios.html">Torneios</a>
                                                <a href="about.html">Sobre</a>
                                            </div>
                                            <div class="copyright">
                                                &copy; 2025 - Age of Empires IV Brasil. Dados de aoe4world.com. Este site não possui qualquer
                                                vínculo com a Microsoft ou a Relic Entertainment.
                                            </div>
                                        </div>
                                    </div>
                                </footer>

                                <script src="js/discord-login.js"></script>
                                <script src="js/forum-api.js"></script>
                                <script src="js/forum-topic.js"></script>

                                <script>
        // Funções auxiliares
                                    function scrollToReply() {
                                        document.getElementById('replyContent').scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center'
                                        });
                                    document.getElementById('replyContent').focus();
        }

                                    function clearReplyForm() {
                                        document.getElementById('replyContent').value = '';
        }

                                    function submitReply() {
            if (window.forumTopicUI) {
                                        window.forumTopicUI.createReply();
            }
        }

                                    // Focar no textarea quando a página carregar
                                    document.addEventListener('DOMContentLoaded', function () {
            const urlParams = new URLSearchParams(window.location.search);
                                    if (urlParams.get('focus') === 'reply') {
                                        setTimeout(scrollToReply, 500);
            }
        });
                                </script>

                                <script>
        // GERENCIADOR PADRONIZADO DO HEADER
        document.addEventListener('DOMContentLoaded', () => {
            const userInfo = document.getElementById('userInfo');
                                    const loginContainer = document.getElementById('loginContainer');
                                    const loginBtn = document.getElementById('loginBtn');
                                    const logoutBtn = document.getElementById('logoutBtn');
                                    const noAuthMessage = document.getElementById('noAuthMessage');
                                    const content = document.getElementById('topicContent');

                                    function renderHeader() {
                                        // Tenta obter usuário de várias fontes
                                        let user = null;
                                    let isAdmin = false;

                                    if (window.discordAuth && typeof window.discordAuth.getCurrentUser === 'function') {
                                        user = window.discordAuth.getCurrentUser();
                } else if (window.forumAPI && window.forumAPI.currentUser) {
                                        user = window.forumAPI.currentUser;
                } else {
                    // Fallback: verifica localStorage
                    try {
                        const userData = localStorage.getItem('discord_user');
                                    user = userData ? JSON.parse(userData) : null;
                    } catch (e) {
                                        user = null;
                    }
                }

                                    // Verifica se é admin
                                    if (user && user.username === 'BRO.WESLAO') {
                                        isAdmin = true;
                }

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
                                    ${isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
                                    `;
                    }
                                    if (loginContainer) loginContainer.style.display = 'none';
                                    if (logoutBtn) logoutBtn.style.display = 'flex';
                                    if (noAuthMessage) noAuthMessage.style.display = 'none';
                                    if (content) content.style.display = '';
                } else {
                    // USUÁRIO NÃO LOGADO
                    if (userInfo) userInfo.style.display = 'none';
                                    if (loginContainer) loginContainer.style.display = 'flex';
                                    if (logoutBtn) logoutBtn.style.display = 'none';
                                    if (noAuthMessage) noAuthMessage.style.display = '';
                                    if (content) content.style.display = 'none';
                }
            }

                                    // Event listeners
                                    if (loginBtn) {
                                        loginBtn.addEventListener('click', (e) => {
                                            e.preventDefault();
                                            if (window.discordAuth && typeof window.discordAuth.login === 'function') {
                                                window.discordAuth.login();
                                            } else {
                                                window.location.href = 'forum-auth.html';
                                            }
                                        });
            }

                                    if (logoutBtn) {
                                        logoutBtn.addEventListener('click', (e) => {
                                            e.preventDefault();
                                            if (window.discordAuth && typeof window.discordAuth.logout === 'function') {
                                                window.discordAuth.logout();
                                            } else {
                                                localStorage.removeItem('discord_user');
                                                localStorage.removeItem('discord_access_token');
                                                setTimeout(() => location.reload(), 300);
                                            }
                                        });
            }

                                    // Inicializar
                                    renderHeader();
                                    setTimeout(renderHeader, 500);
                                    setTimeout(renderHeader, 1000);
        });
                                </script>
                            </body>

                        </html>