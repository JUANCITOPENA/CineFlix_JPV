// =================================================================
// CINEFLIX - SCRIPT PRINCIPAL v3.3 (script.js) - Corrección Final de Datos Incompletos
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    // LÓGICA DEL PRELOADER
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.onload = () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
            }, 3000);
        };
    }

    // --- 1. CONFIGURACIÓN Y ESTADO INICIAL ---
    const API_BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/';
    const SCREENS = { plans: document.getElementById('plan-selection-screen'), payment: document.getElementById('payment-screen'), profiles: document.getElementById('profile-selection-screen'), main: document.getElementById('main-app-screen'), };
    const PAGES = { 'home': document.getElementById('home-page'), 'catalog': document.getElementById('catalog-page'), 'my-list': document.getElementById('my-list-page'), 'settings': document.getElementById('settings-page'), 'help': document.getElementById('help-page') };
    const detailModal = new bootstrap.Modal(document.getElementById('detail-modal'));
    let searchTimeout;
    let appState = { subscription: { plan: null, price: null, active: false }, profiles: [ { id: 1, name: 'Anakin', avatar: 'https://i.pravatar.cc/150?u=anakin' }, { id: 2, name: 'Leia', avatar: 'https://i.pravatar.cc/150?u=leia' }, { id: 3, name: 'Niños', avatar: 'https://i.pravatar.cc/150?u=kids' }, ], activeProfile: null, myList: [], likes: [], filters: { genre: '', year: '', type: 'movie', page: 1 } };

    // --- 2. MANEJO DEL ESTADO (localStorage) ---
    const loadState = () => { try { const savedState = localStorage.getItem('cineflixState'); if (savedState) appState = JSON.parse(savedState); } catch (e) { console.error("Error al cargar estado:", e); } };
    const saveState = () => { try { localStorage.setItem('cineflixState', JSON.stringify(appState)); } catch (e) { console.error("Error al guardar estado:", e); } };

    // --- 3. NAVEGACIÓN Y ROUTING ---
    const showScreen = (screenName) => { Object.values(SCREENS).forEach(s => s.classList.add('d-none')); SCREENS[screenName]?.classList.remove('d-none'); };
    const showPage = (pageName) => { Object.values(PAGES).forEach(p => p.classList.add('d-none')); PAGES[pageName]?.classList.remove('d-none'); document.querySelectorAll('.navbar-nav .nav-link, .dropdown-item').forEach(l => { l.classList.remove('active'); if (l.dataset.page === pageName) l.classList.add('active'); }); };

    // --- 4. LÓGICA DE LA API (TMDB) ---
    async function fetchTMDB(endpoint, params = {}) { const url = new URL(`${API_BASE_URL}/${endpoint}`); url.searchParams.append('api_key', API_KEY); url.searchParams.append('language', 'es-ES'); Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v)); try { const r = await fetch(url); if (!r.ok) throw new Error(`Error: ${r.status}`); return await r.json(); } catch (e) { console.error(`Error en fetchTMDB '${endpoint}':`, e); return null; } }

    // --- 5. RENDERIZADO DE COMPONENTES ---
    async function renderCarousels() { const container = document.getElementById('category-sections'); container.innerHTML = ''; const categories = [ { title: 'Tendencias de la Semana', endpoint: 'trending/all/week' }, { title: 'Populares en Cineflix', endpoint: 'movie/popular' }, { title: 'Series de TV Aclamadas', endpoint: 'tv/top_rated' }, { title: 'Próximos Estrenos', endpoint: 'movie/upcoming' }, ]; categories.forEach(category => { const rowId = `category-${category.endpoint.replace(/[\/]/g, '-')}`; container.innerHTML += ` <div class="category-row" id="${rowId}"><h3 class="category-title">${category.title}</h3><div class="carousel-wrapper"><button class="carousel-control prev" aria-label="Anterior"><i class="bi bi-chevron-left"></i></button><div class="movie-carousel">${createSkeletonCards(10)}</div><button class="carousel-control next" aria-label="Siguiente"><i class="bi bi-chevron-right"></i></button></div></div>`; }); for (const category of categories) { const [page1, page2] = await Promise.all([ fetchTMDB(category.endpoint, { page: 1 }), fetchTMDB(category.endpoint, { page: 2 }) ]); const allResults = [...(page1?.results || []), ...(page2?.results || [])]; const rowId = `category-${category.endpoint.replace(/[\/]/g, '-')}`; const carouselContainer = document.querySelector(`#${rowId} .movie-carousel`); if (carouselContainer && allResults.length > 0) { carouselContainer.innerHTML = allResults.map(createMovieCard).join(''); } } }
    function renderPlanSelection() { const planCards = document.querySelectorAll('.plan-card'); const chooseBtn = document.getElementById('choose-plan-btn'); planCards.forEach(card => { card.addEventListener('click', () => { planCards.forEach(c => c.classList.remove('selected')); card.classList.add('selected'); appState.subscription.plan = card.dataset.plan; appState.subscription.price = card.dataset.price; chooseBtn.disabled = false; }); }); chooseBtn.addEventListener('click', () => { if (appState.subscription.plan) { saveState(); showScreen('payment'); } }); }
    function renderPayment() { document.getElementById('payment-form').addEventListener('submit', (e) => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Procesando...`; setTimeout(() => { appState.subscription.active = true; saveState(); renderProfileSelection(); showScreen('profiles'); }, 1500); }); }
    function renderProfileSelection() { const container = document.getElementById('profiles-container'); container.innerHTML = ''; appState.profiles.forEach(profile => { const profileEl = document.createElement('div'); profileEl.className = 'profile-card'; profileEl.innerHTML = `<img src="${profile.avatar}" alt="${profile.name}" class="profile-avatar"><p class="profile-name">${profile.name}</p>`; profileEl.addEventListener('click', () => { appState.activeProfile = profile; saveState(); initializeAppInterface(); showScreen('main'); }); container.appendChild(profileEl); }); if (appState.profiles.length < 5) { const addProfileEl = document.createElement('div'); addProfileEl.className = 'profile-card add-profile-card'; addProfileEl.innerHTML = `<div class="profile-avatar">+</div><p class="profile-name">Añadir perfil</p>`; addProfileEl.addEventListener('click', () => { const name = prompt("Nombre del nuevo perfil:"); if (name && name.trim()) { const newProfile = { id: Date.now(), name, avatar: `https://i.pravatar.cc/150?u=${Date.now()}` }; appState.profiles.push(newProfile); saveState(); renderProfileSelection(); } }); container.appendChild(addProfileEl); } }
    async function initializeAppInterface() { document.getElementById('profile-avatar-nav').src = appState.activeProfile.avatar; const navbar = document.getElementById('navbar'); window.onscroll = () => { window.scrollY > 50 ? navbar.classList.add('navbar-scrolled') : navbar.classList.remove('navbar-scrolled'); }; await Promise.all([ renderHero(), renderCarousels(), renderGenresDropdown(), renderCatalogFilters() ]); setupEventListeners(); showPage('home'); }
    const createSkeletonCards = (count = 10) => { let s = ''; for (let i = 0; i < count; i++) s += `<div class="movie-card"><div class="skeleton skeleton-card"></div></div>`; return s; };
    async function renderHero() { const heroSection = document.getElementById('hero-section'); const heroContent = heroSection.querySelector('.hero-content-wrapper'); const skeleton = heroSection.querySelector('.skeleton-hero'); const data = await fetchTMDB('trending/all/week'); if (!data || !data.results.length) return; const featured = data.results[Math.floor(Math.random() * data.results.length)]; const img = new Image(); img.src = `${IMG_BASE_URL}original${featured.backdrop_path}`; img.onload = () => { heroSection.style.backgroundImage = `url(${img.src})`; skeleton.classList.add('d-none'); heroContent.classList.remove('d-none'); }; document.getElementById('hero-title').textContent = featured.title || featured.name; document.getElementById('hero-description').textContent = featured.overview; document.getElementById('hero-rating').innerHTML = `<i class="bi bi-star-fill text-warning"></i> ${featured.vote_average ? featured.vote_average.toFixed(1) : 'N/A'}`; const heroPlayBtn = document.getElementById('hero-play-btn'); const heroInfoBtn = document.getElementById('hero-info-btn'); heroPlayBtn.dataset.mediaId = featured.id; heroPlayBtn.dataset.mediaType = featured.media_type; heroInfoBtn.dataset.mediaId = featured.id; heroInfoBtn.dataset.mediaType = featured.media_type; }
    
    // ✅✅✅ CORRECCIÓN DEFINITIVA DENTRO DE createMovieCard ✅✅✅
    const createMovieCard = (item) => {
        const isInList = appState.myList.some(m => m.id === item.id);
        const isLiked = appState.likes.some(m => m.id === item.id);
        const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
        // Si item.vote_average existe y es un número, lo formatea. Si no, muestra 'N/A'.
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        return `
            <div class="movie-card" data-media-id="${item.id}" data-media-type="${mediaType}">
                <img src="${item.poster_path ? IMG_BASE_URL + 'w500' + item.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${item.title || item.name}" loading="lazy">
                <div class="movie-card-info">
                    <h6 class="text-white text-truncate">${item.title || item.name}</h6>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${(item.release_date || item.first_air_date || '').substring(0, 4)}</small>
                        <small><i class="bi bi-star-fill text-warning"></i> ${rating}</small>
                    </div>
                    <div class="card-buttons d-flex gap-2 mt-2">
                        <button class="btn btn-sm" data-action="play" title="Reproducir" aria-label="Reproducir"><i class="bi bi-play-fill"></i></button>
                        <button class="btn btn-sm" data-action="add-list" title="Añadir a Mi Lista" aria-label="Añadir a Mi Lista"><i class="bi ${isInList ? 'bi-check-lg' : 'bi-plus-lg'}"></i></button>
                        <button class="btn btn-sm" data-action="like" title="Me gusta" aria-label="Me gusta"><i class="bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i></button>
                        <button class="btn btn-sm" data-action="details" title="Más información" aria-label="Más información"><i class="bi bi-info-circle"></i></button>
                    </div>
                </div>
            </div>`;
    };

    async function renderGenresDropdown() { const dropdown = document.getElementById('genres-dropdown'); const data = await fetchTMDB('genre/movie/list'); if (data && data.genres) { dropdown.innerHTML = data.genres.map(genre => `<li><a class="dropdown-item" href="#" data-page="catalog" data-filter="genre" data-genre-id="${genre.id}">${genre.name}</a></li>`).join(''); } }
    async function renderCatalog(page = 1) { const grid = document.getElementById('catalog-grid'); grid.innerHTML = createSkeletonCards(20); appState.filters.page = page; const params = { page }; if (appState.filters.genre) params.with_genres = appState.filters.genre; if (appState.filters.year) params.primary_release_year = appState.filters.year; const data = await fetchTMDB(`discover/${appState.filters.type}`, params); if (data && data.results.length > 0) { grid.innerHTML = data.results.map(createMovieCard).join(''); renderPagination(data.page, data.total_pages); } else { grid.innerHTML = '<p class="text-center w-100 lead">No se encontraron resultados.</p>'; } saveState(); }
    function renderPagination(currentPage, totalPages) { const maxPages = Math.min(totalPages, 500); const container = document.getElementById('catalog-pagination'); container.innerHTML = ''; const maxButtons = 5; let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2)); let endPage = Math.min(maxPages, startPage + maxButtons - 1); if (endPage - startPage < maxButtons - 1) { startPage = Math.max(1, endPage - maxButtons + 1); } const ul = document.createElement('ul'); ul.className = 'pagination pagination-lg'; ul.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page-nav="${currentPage - 1}">Anterior</a></li>`; for (let i = startPage; i <= endPage; i++) { ul.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page-nav="${i}">${i}</a></li>`; } ul.innerHTML += `<li class="page-item ${currentPage === maxPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page-nav="${currentPage + 1}">Siguiente</a></li>`; container.appendChild(ul); }
    async function renderCatalogFilters() { const genreSelect = document.getElementById('catalog-genre-filter'); const genreData = await fetchTMDB(`genre/${appState.filters.type}/list`); genreSelect.innerHTML = '<option value="">Todos los géneros</option>'; if (genreData && genreData.genres) { genreSelect.innerHTML += genreData.genres.map(g => `<option value="${g.id}">${g.name}</option>`).join(''); } genreSelect.value = appState.filters.genre; const yearSelect = document.getElementById('catalog-year-filter'); const currentYear = new Date().getFullYear(); yearSelect.innerHTML = '<option value="">Todos los años</option>'; for (let y = currentYear; y >= 1920; y--) { yearSelect.innerHTML += `<option value="${y}">${y}</option>`; } yearSelect.value = appState.filters.year; document.getElementById('catalog-type-filter').value = appState.filters.type; }
    function renderMyListPage() { const grid = document.getElementById('my-list-grid'); if (appState.myList.length > 0) { grid.innerHTML = appState.myList.map(createMovieCard).join(''); } else { grid.innerHTML = '<p class="text-center col-12 lead">Añade películas y series a tu lista para verlas aquí.</p>'; } }
    function renderSettingsPage() { document.getElementById('settings-email-full').textContent = `${appState.activeProfile.name.toLowerCase().replace(/\s/g, '')}@cineflix.demo`; document.getElementById('settings-plan-full').textContent = `${appState.subscription.plan} (${appState.subscription.price} €/mes)`; const planDetails = { 'Básico': { quality: 'Buena', resolution: '720p', devices: '1' }, 'Estándar': { quality: 'Fantástica', resolution: '1080p', devices: '2' }, 'Premium': { quality: 'Excepcional', resolution: '4K+HDR', devices: '4' } }; const currentPlan = planDetails[appState.subscription.plan]; if (currentPlan) { document.getElementById('plan-quality').textContent = currentPlan.quality; document.getElementById('plan-resolution').textContent = currentPlan.resolution; document.getElementById('plan-devices').textContent = currentPlan.devices; } const container = document.getElementById('settings-profiles-container-full'); container.innerHTML = appState.profiles.map(profile => ` <div class="profile-manage-card"><img src="${profile.avatar}" class="rounded" width="80" height="80" style="object-fit: cover;"><div class="flex-grow-1"><h5 class="mb-1">${profile.name}</h5><p class="text-muted mb-0">Todas las clasificaciones de edad</p></div><button class="btn btn-sm btn-outline-light">Editar</button></div>`).join(''); }
    async function openDetailModal(mediaId, mediaType, play = false) { const loader = document.getElementById('modal-content-loader'); const contentContainer = document.getElementById('modal-content-container'); loader.classList.remove('d-none'); contentContainer.classList.add('d-none'); detailModal.show(); const [details, videosResponse] = await Promise.all([ fetchTMDB(`${mediaType}/${mediaId}`), fetchTMDB(`${mediaType}/${mediaId}/videos`, { include_video_language: 'es,en' }) ]); if (!details) { detailModal.hide(); return; } const videos = videosResponse?.results || []; const trailer = videos.find(v => v.type === 'Trailer' && v.iso_639_1 === 'es') || videos.find(v => v.type === 'Trailer') || videos.find(v => v.site === 'YouTube'); document.getElementById('modal-backdrop').src = details.backdrop_path ? `${IMG_BASE_URL}original${details.backdrop_path}` : 'https://via.placeholder.com/1280x720?text=No+Backdrop'; document.getElementById('modal-title').textContent = details.title || details.name; const overviewContainer = document.getElementById('modal-overview'); const titleQuery = encodeURIComponent(`${details.title || details.name} sinopsis`); if (details.overview) { overviewContainer.innerHTML = `<p>${details.overview}</p>`; } else if (details.tagline) { overviewContainer.innerHTML = `<p class="fst-italic">"${details.tagline}"</p>`; } else if (trailer && trailer.name) { overviewContainer.innerHTML = `<p class="fst-italic">${trailer.name}</p><hr class="my-3"><a href="https://www.google.com/search?q=${titleQuery}" target="_blank" class="btn btn-outline-light smart-search-btn"><i class="bi bi-google me-2"></i>Buscar sinopsis completa</a>`; } else { overviewContainer.innerHTML = `<p>No hay una sinopsis disponible.</p><a href="https://www.google.com/search?q=${titleQuery}" target="_blank" class="btn btn-outline-light smart-search-btn"><i class="bi bi-google me-2"></i>Buscar en Google</a>`; } const year = (details.release_date || details.first_air_date || 'N/A').substring(0, 4); document.getElementById('modal-year').textContent = year; document.getElementById('modal-runtime').textContent = details.runtime ? `${details.runtime} min` : (details.number_of_seasons ? `${details.number_of_seasons} temp.` : 'N/A'); document.getElementById('modal-language').textContent = details.original_language.toUpperCase(); document.getElementById('modal-genres').innerHTML = details.genres.map(g => `<span class="badge bg-danger">${g.name}</span>`).join(' '); const trailerContainer = document.getElementById('modal-trailer-container'); trailerContainer.innerHTML = '';  const trailerWrapper = trailerContainer.parentElement; if (trailer) { trailerWrapper.classList.remove('d-none'); trailerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=${play ? 1 : 0}&controls=1&rel=0&showinfo=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`; } else { trailerWrapper.classList.remove('d-none'); const searchQuery = encodeURIComponent(`${details.title || details.name} ${year} trailer oficial español`); const fallbackUrl = `https://www.youtube.com/embed?listType=search&list=${searchQuery}`; trailerContainer.innerHTML = `<iframe src="${fallbackUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`; } const addListBtn = document.getElementById('modal-add-list-btn'); const likeBtn = document.getElementById('modal-like-btn'); addListBtn.dataset.mediaId = details.id; addListBtn.dataset.mediaType = mediaType; likeBtn.dataset.mediaId = details.id; likeBtn.dataset.mediaType = mediaType; updateActionButtons(details.id, addListBtn, likeBtn); loader.classList.add('d-none'); contentContainer.classList.remove('d-none'); }

    // --- 6. MANEJADORES DE EVENTOS ---
    let listenersAttached = false;
    function setupEventListeners() {
        if (listenersAttached) return;
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            const pageLink = target.closest('[data-page]');
            const carouselControl = target.closest('.carousel-control');
            const actionBtn = target.closest('[data-action]');
            const movieCard = target.closest('.movie-card');
            const paginationLink = target.closest('.page-link[data-page-nav]');
            const searchResultItem = target.closest('.search-result-item');
            const modalAddBtn = target.closest('#modal-add-list-btn');
            const modalLikeBtn = target.closest('#modal-like-btn');
            const heroPlayBtn = target.closest('#hero-play-btn');
            const heroInfoBtn = target.closest('#hero-info-btn');

            if (pageLink) { e.preventDefault(); handleNavigation(pageLink); return; }
            if (carouselControl) { const carousel = carouselControl.closest('.carousel-wrapper').querySelector('.movie-carousel'); const scrollAmount = carousel.clientWidth * 0.8; const direction = carouselControl.classList.contains('prev') ? -1 : 1; carousel.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' }); return; }
            if (actionBtn) { e.stopPropagation(); handleCardAction(actionBtn.dataset.action, actionBtn.closest('.movie-card')); return; }
            if (searchResultItem) { e.preventDefault(); openDetailModal(parseInt(searchResultItem.dataset.mediaId), searchResultItem.dataset.mediaType); document.getElementById('search-input').value = ''; document.getElementById('search-results').innerHTML = ''; return; }
            if (paginationLink && !paginationLink.parentElement.classList.contains('disabled')) { e.preventDefault(); renderCatalog(parseInt(paginationLink.dataset.pageNav)); window.scrollTo(0, 0); return; }
            if (modalAddBtn) { toggleListItem(parseInt(modalAddBtn.dataset.mediaId), modalAddBtn.dataset.mediaType, 'myList'); updateActionButtons(parseInt(modalAddBtn.dataset.mediaId), modalAddBtn, document.getElementById('modal-like-btn')); return; }
            if (modalLikeBtn) { toggleListItem(parseInt(modalLikeBtn.dataset.mediaId), modalLikeBtn.dataset.mediaType, 'likes'); updateActionButtons(parseInt(modalLikeBtn.dataset.mediaId), document.getElementById('modal-add-list-btn'), modalLikeBtn); return; }
            if (heroPlayBtn || heroInfoBtn) { const button = heroPlayBtn || heroInfoBtn; const mediaId = parseInt(button.dataset.mediaId); const mediaType = button.dataset.mediaType; const play = !!heroPlayBtn; openDetailModal(mediaId, mediaType, play); return; }
            if (movieCard) { openDetailModal(parseInt(movieCard.dataset.mediaId), movieCard.dataset.mediaType); return; }
        });

        document.getElementById('logout-btn').addEventListener('click', (e) => { e.preventDefault(); appState.activeProfile = null; saveState(); renderProfileSelection(); showScreen('profiles'); });
        document.getElementById('detail-modal').addEventListener('hidden.bs.modal', () => { document.getElementById('modal-trailer-container').innerHTML = ''; });
        document.getElementById('catalog-genre-filter').addEventListener('change', (e) => { appState.filters.genre = e.target.value; renderCatalog(1); });
        document.getElementById('catalog-year-filter').addEventListener('change', (e) => { appState.filters.year = e.target.value; renderCatalog(1); });
        document.getElementById('catalog-type-filter').addEventListener('change', async (e) => { appState.filters.type = e.target.value; await renderCatalogFilters(); renderCatalog(1); });
        document.getElementById('reset-filters-btn').addEventListener('click', () => { appState.filters = { genre: '', year: '', type: 'movie', page: 1 }; renderCatalogFilters(); renderCatalog(1); });
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => handleSearch(searchInput.value), 300); });
        searchInput.addEventListener('blur', () => { setTimeout(() => { document.getElementById('search-results').innerHTML = ''; }, 200); });

        listenersAttached = true;
    }

    // --- 7. LÓGICA DE LA APLICACIÓN ---
    async function handleSearch(query) { const resultsContainer = document.getElementById('search-results'); if (query.length < 3) { resultsContainer.innerHTML = ''; return; } const data = await fetchTMDB('search/multi', { query }); if (data && data.results) { resultsContainer.innerHTML = data.results .filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path) .slice(0, 5) .map(item => ` <a href="#" class="search-result-item" data-media-id="${item.id}" data-media-type="${item.media_type}"><img src="${IMG_BASE_URL}w92${item.poster_path}" alt="${item.title || item.name}"><div><h6>${item.title || item.name}</h6><p>${item.media_type === 'tv' ? 'Serie' : 'Película'} &bull; ${(item.release_date || item.first_air_date || '').substring(0, 4)}</p></div></a> `).join(''); } }
    
    function handleNavigation(link) {
        const page = link.dataset.page;
        if (!PAGES[page]) { return; }
        if (page === 'catalog') { appState.filters = { genre: '', year: '', type: 'movie', page: 1 }; const filter = link.dataset.filter; if (filter === 'genre') { appState.filters.genre = link.dataset.genreId; } renderCatalogFilters(); renderCatalog(1); }
        else if (page === 'my-list') { renderMyListPage(); }
        else if (page === 'settings') { renderSettingsPage(); }
        else if (page === 'help') { /* No necesita renderizado previo */ }
        showPage(page);
    }

    function handleCardAction(action, card) { const mediaId = parseInt(card.dataset.mediaId); const mediaType = card.dataset.mediaType; switch (action) { case 'play': openDetailModal(mediaId, mediaType, true); break; case 'add-list': toggleListItem(mediaId, mediaType, 'myList'); break; case 'like': toggleListItem(mediaId, mediaType, 'likes'); break; case 'details': openDetailModal(mediaId, mediaType); break; } if (action === 'add-list' || action === 'like') { updateCardButtons(card); } }
    async function toggleListItem(mediaId, mediaType, listType) { const list = appState[listType]; const itemIndex = list.findIndex(item => item.id === mediaId); if (itemIndex > -1) { list.splice(itemIndex, 1); } else { const details = await fetchTMDB(`${mediaType}/${mediaId}`); if (details) { list.push({ id: details.id, poster_path: details.poster_path, title: details.title || details.name, vote_average: details.vote_average, release_date: details.release_date || details.first_air_date, media_type: mediaType }); } } saveState(); if (PAGES['my-list'] && !PAGES['my-list'].classList.contains('d-none')) { renderMyListPage(); } }
    function updateActionButtons(mediaId, addListBtn, likeBtn) { if (!addListBtn || !likeBtn) return; const isInList = appState.myList.some(m => m.id === mediaId); const isLiked = appState.likes.some(m => m.id === mediaId); addListBtn.innerHTML = `<i class="bi ${isInList ? 'bi-check-lg' : 'bi-plus-lg'}"></i>`; likeBtn.innerHTML = `<i class="bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>`; }
    function updateCardButtons(cardElement) { if (!cardElement) return; const mediaId = parseInt(cardElement.dataset.mediaId); const isInList = appState.myList.some(m => m.id === mediaId); const isLiked = appState.likes.some(m => m.id === mediaId); const addListIcon = cardElement.querySelector('[data-action="add-list"] i'); if (addListIcon) addListIcon.className = `bi ${isInList ? 'bi-check-lg' : 'bi-plus-lg'}`; const likeIcon = cardElement.querySelector('[data-action="like"] i'); if (likeIcon) likeIcon.className = `bi ${isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}`; }

    // =================================================================
    // 8. FUNCIÓN DE DIAGNÓSTICO Y PRUEBAS
    // =================================================================
    function runDiagnostics() {
        console.groupCollapsed('--- INICIO DEL DIAGNÓSTICO DE CINEFLIX ---');
        console.log('TEST 1: Verificando conexión con la API de TMDB...');
        fetchTMDB('configuration')
            .then(data => {
                if (data && data.images) { console.log('%c  ✅ API OK: Conexión establecida correctamente.', 'color: #28a745;'); }
                else { console.error('%c  ❌ API ERROR: No se pudo obtener la configuración. Verifica tu API_KEY o la conexión a internet.', 'color: #dc3545;'); }
            });
        console.group('TEST 2: Verificando el estado de la aplicación (appState)');
        console.log('Suscripción activa:', appState.subscription.active);
        console.log('Plan actual:', appState.subscription.plan);
        console.log('Perfil activo:', appState.activeProfile ? appState.activeProfile.name : 'Ninguno');
        console.log(`Elementos en "Mi Lista": ${appState.myList.length}`);
        console.log(`Elementos con "Me Gusta": ${appState.likes.length}`);
        console.groupEnd();
        console.group('TEST 3: Verificando los manejadores de eventos');
        if (listenersAttached) { console.log('%c  ✅ Listeners OK: El manejador de eventos principal está activo.', 'color: #28a745;'); }
        else { console.warn('%c  ⚠️ Listeners ADVERTENCIA: El manejador de eventos principal aún no se ha adjuntado. Esto es normal si el diagnóstico se ejecuta antes de que el usuario inicie sesión.', 'color: #ffc107;'); }
        console.groupEnd();
        console.group('TEST 4: Verificando referencias a las páginas (DOM)');
        let allPagesFound = true;
        for (const pageName in PAGES) {
            if (PAGES[pageName]) { console.log(`  - Página "${pageName}": Encontrada.`); }
            else { console.error(`  - Página "${pageName}": NO ENCONTRADA. Verifica el ID en el HTML.`); allPagesFound = false; }
        }
        if(allPagesFound) { console.log('%c  ✅ DOM OK: Todas las páginas fueron encontradas correctamente.', 'color: #28a745;'); }
        else { console.error('%c  ❌ DOM ERROR: Faltan una o más referencias a las páginas. Revisa los IDs en tu index.html.', 'color: #dc3545;'); }
        console.groupEnd();
        console.log('--- DIAGNÓSTICO FINALIZADO ---');
        console.groupEnd();
    }

    // --- 9. INICIALIZACIÓN ---
    function init() { 
        loadState(); 
        if (!appState.subscription.active) { 
            renderPlanSelection(); 
            renderPayment(); 
            showScreen('plans'); 
        } else if (!appState.activeProfile) { 
            renderProfileSelection(); 
            showScreen('profiles'); 
        } else { 
            initializeAppInterface(); 
            showScreen('main'); 
        }
        // Descomenta la siguiente línea para ejecutar el test al iniciar
        runDiagnostics();
    }
    
    init();
});