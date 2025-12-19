/**
 * Retro Study OS - Frontend Controller (v1.6)
 * HOME feed refactor applied
 */

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://log-production-449f.up.railway.app';

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

    const dom = {
        navButtons: document.querySelectorAll('.nav-btn'),
        screens: document.querySelectorAll('.screen'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        mainNav: document.getElementById('main-nav'),

        authModal: document.getElementById('modal-auth'),
        authForm: document.getElementById('form-auth'),
        authError: document.getElementById('auth-error'),
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),

        profileRank: document.getElementById('profile-rank'),
        profileXP: document.getElementById('profile-xp'),
        profileAvatar: document.querySelector('.profile-avatar'),
        avatarInput: document.getElementById('avatar-upload'),

        timerDisplay: document.getElementById('timer'),
        btnStart: document.getElementById('btn-start'),
        btnPause: document.getElementById('btn-pause'),
        btnEnd: document.getElementById('btn-end'),
        statusDisplay: document.getElementById('sys-status'),

        modalIntent: document.getElementById('modal-session-intent'),
        formIntent: document.getElementById('form-session-intent'),
        btnCancelIntent: document.getElementById('btn-cancel-intent'),

        modalReflection: document.getElementById('modal-reflection'),
        reflectionBtns: document.querySelectorAll('.reflection-opt'),

        modalPostProof: document.getElementById('modal-post-proof'),
        formPostProof: document.getElementById('form-post-proof'),
        btnPostProof: document.getElementById('btn-post-proof'),

        feedContainer: document.getElementById('activity-feed')
    };

    // ---------------- QUESTS ----------------
    async function renderQuests() {
        const container = document.getElementById('quests-container');
        if (!container) return;

        container.innerHTML = '';

        try {
            const quests = await apiFetch('/quests');

            if (!quests.length) {
                container.innerHTML =
                    '<div class="retro-panel quest-box"><p>No active quests.</p></div>';
                return;
            }

            quests.forEach(q => {
                const pct = Math.min(100, (q.progress_hours / q.target_hours) * 100);

                const el = document.createElement('div');
                el.className = 'retro-panel quest-box';
                el.innerHTML = `
                    <h3>${q.title}</h3>
                    <p>${q.description}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width:${pct}%;"></div>
                    </div>
                    <p style="font-size:12px">${q.progress_hours.toFixed(1)} / ${q.target_hours}h</p>
                `;
                container.appendChild(el);
            });
        } catch (err) {
            dom.feedContainer.innerHTML =
                '<div class="feed-card">SYSTEM: Failed to load feed</div>';
        }
    }

    // ---------------- LEADERBOARD ----------------
    async function renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        try {
            const users = await apiFetch('/leaderboard');

            if (!users.length) {
                tbody.innerHTML =
                    '<tr><td colspan="5">Leaderboard unavailable</td></tr>';
                return;
            }

            users.forEach(u => {
                const tr = document.createElement('tr');
                if (u.is_current_user) tr.classList.add('highlight');

                tr.innerHTML = `
                    <td>${u.rank}</td>
                    <td>${u.username}${u.is_current_user ? ' (YOU)' : ''}</td>
                    <td>${u.xp || 0}</td>
                    <td>${u.total_hours || '0.0'}h</td>
                    <td class="hide-mobile">${u.streak || 0}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            tbody.innerHTML =
                '<tr><td colspan="5">Error loading leaderboard</td></tr>';
        }
    }

    // ---------------- API ----------------
    async function apiFetch(endpoint, method = 'GET', body = null) {
        const headers = {};
        if (state.token) headers['x-auth-token'] = state.token;
        if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : null
        });

        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401) logout();
            throw new Error(data?.error || 'Request failed');
        }
        return data;
    }

    function logout() {
        localStorage.removeItem('token');
        window.location.reload();
    }

    async function checkAuth() {
        if (!state.token) {
            dom.authModal.classList.remove('hidden');
            return;
        }
        const user = await apiFetch('/me');
        state.user = user;
        dom.authModal.classList.add('hidden');
        initializeSystem(user);
    }

    function initializeSystem(user) {
        hydrateUserUI(user);
        renderLog();
        renderQuests();
        renderLeaderboard();
        dom.navButtons.forEach(btn => btn.classList.remove('hidden'));
    }

    function hydrateUserUI(user) {
        if (!user) return;
        dom.profileRank.textContent = user.rank || 'NOVICE';
        dom.profileXP.textContent = user.xp || 0;
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('sys-xp').textContent = user.xp || 0;
        document.getElementById('sys-streak').textContent = `${user.streak || 0} DAYS`;
    }

    // ---------------- HOME FEED ----------------
    async function renderLog() {
        if (!dom.feedContainer) return;
        dom.feedContainer.innerHTML = '';

        try {
            const logs = await apiFetch('/activity');

            if (!logs.length) {
                dom.feedContainer.innerHTML =
                    `<div class="feed-card" style="text-align:center; color:#666;">No activity yet.</div>`;
                return;
            }

            logs.forEach(log => {
                const card = document.createElement('div');
                card.className = 'feed-card';

                const avatar = log.user?.avatar_url
                    ? `${API_URL}${log.user.avatar_url}`
                    : 'https://via.placeholder.com/100';

                let imageHtml = '';
                if (log.image_url) {
                    const imgSrc = log.image_url.startsWith('http')
                        ? log.image_url
                        : `${API_URL}${log.image_url}`;
                    imageHtml = `<img src="${imgSrc}" class="feed-image">`;
                }

                card.innerHTML = `
                    <div class="feed-header">
                        <img src="${avatar}" class="feed-avatar">
                        <div>
                            <div class="feed-user">${log.user.username}</div>
                            <div class="feed-meta">${log.type}</div>
                        </div>
                    </div>
                    <div class="feed-text">${log.text}</div>
                    ${imageHtml}
                `;

                dom.feedContainer.appendChild(card);
            });
        } catch {
            dom.feedContainer.innerHTML =
                `<div class="feed-card">SYSTEM: Failed to load feed</div>`;
        }
    }

    function bindEvents() {
        dom.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                dom.screens.forEach(s => s.classList.add('hidden'));
                document.getElementById(btn.dataset.target).classList.remove('hidden');
            });
        });
    }

    function init() {
        bindEvents();
        checkAuth();
    }

    init();
});
