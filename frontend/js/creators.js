document.addEventListener('DOMContentLoaded', () => {
    loadCreators();
});

let allCreators = [];
let liveCreators = [];
let currentStream = null;

async function loadCreators() {
    const featuredContainer = document.getElementById('featured-stream');
    const liveListContainer = document.getElementById('live-list');
    const gridContainer = document.getElementById('creators-grid');

    try {
        const response = await fetch('/api/creators');
        allCreators = await response.json();
        liveCreators = allCreators.filter(c => c.isLive);
        const videoCreators = allCreators.filter(c => !c.isLive && c.latestVideo);

        // 1. Handle Featured Content
        if (liveCreators.length > 0) {
            // Show Live Stream
            featuredContainer.classList.add('active');
            setFeaturedStream(liveCreators[0]);
        } else if (videoCreators.length > 0) {
            // Show Latest Video (Fallback)
            featuredContainer.classList.add('active');
            setFeaturedVideo(videoCreators[0]);
        } else {
            featuredContainer.style.display = 'none';
        }

        // 2. Handle List (Live or Videos)
        if (liveCreators.length > 1) {
            liveListContainer.style.display = 'flex';
            renderLiveList(liveCreators, 'stream');
        } else if (liveCreators.length === 0 && videoCreators.length > 1) {
            liveListContainer.style.display = 'flex';
            renderLiveList(videoCreators, 'video');
        } else {
            liveListContainer.style.display = 'none';
        }

        // 3. Render Compact Grid (All Creators)
        renderCreatorGrid();

    } catch (error) {
        console.error('Error loading creators:', error);
        if (gridContainer) {
            gridContainer.innerHTML = '<div class="no-activity">Erro ao carregar criadores.</div>';
        }
    }
}

function setFeaturedStream(creator) {
    currentStream = creator;
    const embedContainer = document.getElementById('twitch-embed');
    const channelName = document.getElementById('featured-channel-name');

    // Update Embed
    const parents = ['localhost', 'aoe4.com.br', 'ageivbrasil.up.railway.app', '127.0.0.1'];
    const parentParams = parents.map(p => `parent=${p}`).join('&');

    embedContainer.innerHTML = `
        <iframe
            src="https://player.twitch.tv/?channel=${creator.twitch}&${parentParams}&muted=false"
            height="100%"
            width="100%"
            allowfullscreen>
        </iframe>
    `;

    // Update Info
    channelName.innerHTML = `<span style="color: #e91e63;">● AO VIVO:</span> ${creator.name}`;

    // Update Active State in List
    renderLiveList(liveCreators, 'stream');
}

function setFeaturedVideo(creator) {
    currentStream = creator;
    const embedContainer = document.getElementById('twitch-embed');
    const channelName = document.getElementById('featured-channel-name');

    // Update Embed (YouTube)
    embedContainer.innerHTML = `
        <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${creator.latestVideo.id}?autoplay=0" 
            title="${creator.latestVideo.title}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
        </iframe>
    `;

    // Update Info
    channelName.innerHTML = `<span style="color: #ff0000;"><i class="fab fa-youtube"></i> VÍDEO RECENTE:</span> ${creator.name}`;

    // Update Active State in List
    const videoCreators = allCreators.filter(c => !c.isLive && c.latestVideo);
    renderLiveList(videoCreators, 'video');
}

function renderLiveList(creators, type) {
    const container = document.getElementById('live-list');
    if (!container) return;

    container.innerHTML = creators.map(creator => {
        const isActive = currentStream && currentStream.id === creator.id;
        const thumb = type === 'stream'
            ? (creator.streamInfo?.thumbnail_url?.replace('{width}', '320').replace('{height}', '180') || 'https://placehold.co/320x180?text=Live')
            : creator.latestVideo.thumbnail_url;

        const title = type === 'stream' ? creator.name : (creator.latestVideo.title.substring(0, 40) + '...');
        const onClick = type === 'stream' ? `setFeaturedStreamByTwitch('${creator.twitch}')` : `setFeaturedVideoById(${creator.id})`;

        return `
            <div class="live-item ${isActive ? 'active' : ''}" onclick="${onClick}">
                <div class="live-item-thumb">
                    <img src="${thumb}" alt="${creator.name}">
                </div>
                <div class="live-item-info">
                    <strong>${title}</strong>
                </div>
            </div>
        `;
    }).join('');
}

window.setFeaturedStreamByTwitch = (twitchUsername) => {
    const creator = liveCreators.find(c => c.twitch === twitchUsername);
    if (creator) setFeaturedStream(creator);
};

window.setFeaturedVideoById = (id) => {
    const creator = allCreators.find(c => c.id === id);
    if (creator) setFeaturedVideo(creator);
};

function renderCreatorGrid() {
    const container = document.getElementById('creators-grid');
    if (!container) return;

    if (allCreators.length === 0) {
        container.innerHTML = '<div class="no-activity">Nenhum criador encontrado.</div>';
        return;
    }

    container.innerHTML = allCreators.map(creator => {
        // Use Twitch avatar if available, else fallback to UI Avatars
        const avatarUrl = creator.avatar_url || `https://ui-avatars.com/api/?name=${creator.name}&background=random&color=fff`;

        return `
            <div class="creator-compact-card">
                <div class="compact-avatar">
                    <img src="${avatarUrl}" alt="${creator.name}">
                </div>
                <div class="compact-info">
                    <div class="compact-name">${creator.name}</div>
                    <div class="compact-links">
                        ${creator.twitch ? `<a href="https://twitch.tv/${creator.twitch}" target="_blank" class="compact-link twitch"><i class="fab fa-twitch"></i></a>` : ''}
                        ${creator.youtube ? `<a href="${creator.youtube}" target="_blank" class="compact-link youtube"><i class="fab fa-youtube"></i></a>` : ''}
                    </div>
                </div>
                ${creator.isLive ? '<div class="live-dot" title="Ao Vivo"></div>' : ''}
            </div>
        `;
    }).join('');
}
