/**
 * Uncertanity – Frontend Controller (v1.6 FINAL)
 * Philosophy: readable feed, stable state, zero gimmicks
 */

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://log-production-449f.up.railway.app';

    /* =========================
       STATE
    ========================= */

    const TimerState = {
        IDLE: 'IDLE',
        RUNNING: 'RUNNING',
        PAUSED: 'PAUSED'
    };

    let state = {
        token: localStorage.getItem('token'),
        user: null,
        timer: {
            status: TimerState.IDLE,
            intervalId: null,
            seconds: 0,
            sessionData: null
        }
    };

    /* =========================
       DOM
    ========================= */

    const dom = {
        navButtons: document.querySelectorAll('.nav-btn'),
        screens: document.querySelectorAll('.screen'),
        mainNav: document.getElementById('main-nav'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),

        authModal: document.getElementById('modal-auth'),
        authForm: document.getElementById('form-auth'),
        authError: document.getElementById('auth-error'),
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),

        feed: document.getElementById('activity-feed'),

        profileRank: document.getElementById('profile-rank'),
        profileXP: document.getElementById('profile-xp'),
        profileUsername: document.getElementById('profile-username'),
        profileAvatar: document.querySelector('.profile-avatar'),
        profileAvatarImg: document.querySelector('.profile-avatar img'),
        avatarInput: document.getElementById('avatar-upload'),

        btnPostProof: document.getElementById('btn-post-proof'),
        modalPostProof: document.getElementById('modal-post-proof'),
        formPostProof: document.getElementById('form-post-proof')
    };

    /* =========================
       API
    ========================= */

    async function apiFetch(endpoint, method = 'GET', body = null) {
        const headers = {};
        if (state.token) headers['x-auth-token'] = state.token;
        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : null
        });

        const contentType = res.headers.get('content-type');
        const data = contentType?.includes('application/json')
            ? await res.json()
            : null;

        if (!res.ok) {
            if (res.status === 401) logout();
            throw new Error(data?.error || data?.msg || 'Request failed');
        }

        return data;
    }

    function logout() {
        localStorage.removeItem('token');
        location.reload();
    }

    /* =========================
       AUTH
    ========================= */

    async function checkAuth() {
        if (!state.token) {
            dom.authModal.classList.remove('hidden');
            return;
        }

        try {
            const user = await apiFetch('/me');
            state.user = user;
            dom.authModal.classList.add('hidden');
            initializeSystem(user);
        } catch {
            logout();
        }
    }

    /* =========================
       NAVIGATION
    ========================= */

    function switchScreen(target) {
        dom.screens.forEach(s => {
            s.classList.toggle('hidden', s.id !== target);
        });

        dom.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === target);
        });

        if (window.innerWidth <= 768) {
            dom.mainNav?.classList.remove('open');
        }
    }

    /* =========================
       USER UI
    ========================= */

    function hydrateUserUI(user) {
        dom.profileUsername.textContent = user.username;
        dom.profileRank.textContent = user.rank || 'NOVICE';
        dom.profileXP.textContent = user.xp || 0;

        if (user.avatar_url) {
            dom.profileAvatarImg.src = `${API_URL}${user.avatar_url}`;
            dom.profileAvatarImg.classList.remove('hidden');
        }
    }

    /* =========================
       HOME FEED (READING SURFACE)
    ========================= */

    async function renderFeed() {
        dom.feed.innerHTML = '';

        try {
            const logs = await apiFetch('/activity');

            if (!logs.length) {
                dom.feed.innerHTML =
                    `<div class="feed-empty">No posts yet.</div>`;
                return;
            }

            logs.forEach(log => {
                const card = document.createElement('article');
                card.className = 'feed-card';

                const avatar = log.user.avatar_url
                    ? `${API_URL}${log.user.avatar_url}`
                    : '';

                const image = log.image_url
                    ? `<img src="${API_URL}${log.image_url}" class="feed-image">`
                    : '';

                card.innerHTML = `
                    <div class="feed-header">
                        ${avatar ? `<img src="${avatar}" class="feed-avatar">` : ''}
                        <div class="feed-user">${log.user.username}</div>
                    </div>
                    <div class="feed-text">${log.text}</div>
                    ${image}
                `;

                dom.feed.appendChild(card);
            });
        } catch {
            dom.feed.innerHTML =
                `<div class="feed-error">Failed to load feed.</div>`;
        }
    }

    /* =========================
       POST PROOF
    ========================= */

    function bindPostProof() {
        dom.btnPostProof?.addEventListener('click', () => {
            dom.modalPostProof.classList.remove('hidden');
        });

        dom.formPostProof?.addEventListener('submit', async e => {
            e.preventDefault();

            const text = document.getElementById('proof-text').value.trim();
            const file = document.getElementById('proof-file').files[0];

            if (!text) return;

            const fd = new FormData();
            fd.append('text', text);
            if (file) fd.append('image', file);

            try {
                await apiFetch('/activity/proof', 'POST', fd);
                dom.modalPostProof.classList.add('hidden');
                dom.formPostProof.reset();
                renderFeed();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    /* =========================
       AVATAR UPLOAD
    ========================= */

    function bindAvatarUpload() {
        dom.profileAvatar?.addEventListener('click', () => {
            dom.avatarInput.click();
        });

        dom.avatarInput?.addEventListener('change', async e => {
            if (!e.target.files[0]) return;

            const fd = new FormData();
            fd.append('avatar', e.target.files[0]);

            try {
                const res = await apiFetch('/me/avatar', 'PUT', fd);
                hydrateUserUI(res);
            } catch (err) {
                alert(err.message);
            }
        });
    }

    /* =========================
       EVENTS
    ========================= */

    function bindEvents() {
        dom.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                switchScreen(btn.dataset.target);
            });
        });

        dom.mobileMenuBtn?.addEventListener('click', () => {
            dom.mainNav?.classList.toggle('open');
        });

        bindPostProof();
        bindAvatarUpload();

        dom.authForm?.addEventListener('submit', async e => {
            e.preventDefault();

            const username = document.getElementById('auth-username').value.trim();
            const passphrase = document.getElementById('auth-passphrase').value;

            const endpoint = dom.tabRegister.classList.contains('active')
                ? '/auth/register'
                : '/auth/login';

            try {
                const res = await apiFetch(endpoint, 'POST', { username, passphrase });
                state.token = res.token;
                localStorage.setItem('token', res.token);
                dom.authModal.classList.add('hidden');
                initializeSystem(res.user);
            } catch (err) {
                dom.authError.textContent = err.message;
            }
        });
    }

    /* =========================
       INIT
    ========================= */

    function initializeSystem(user) {
        hydrateUserUI(user);
        renderFeed();
        switchScreen('home');
    }

    function init() {
        bindEvents();
        checkAuth();
    }

    init();
});
