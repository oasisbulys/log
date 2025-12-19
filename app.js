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
            sessionData: null // { type, note, startTime, timeTag }
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

        // Profile
        profileRank: document.getElementById('profile-rank'),
        profileXP: document.getElementById('profile-xp'),
        profileUsername: document.getElementById('profile-username'),
        profileAvatar: document.querySelector('.profile-avatar'),
        profileAvatarImg: document.querySelector('.profile-avatar img'),
        avatarInput: document.getElementById('avatar-upload'),

        // Profile Extended Stats
        profileStreak: document.getElementById('profile-streak-val'),
        profileToday: document.getElementById('profile-study-time'),
        profileTotal: document.getElementById('profile-total-hours'),

        // Timer
        timerDisplay: document.getElementById('timer'),
        btnStart: document.getElementById('btn-start'),
        btnPause: document.getElementById('btn-pause'),
        btnEnd: document.getElementById('btn-end'),


        // Modals
        modalIntent: document.getElementById('modal-session-intent'),
        formIntent: document.getElementById('form-session-intent'),
        btnCancelIntent: document.getElementById('btn-cancel-intent'),
        modalReflection: document.getElementById('modal-reflection'),
        reflectionBtns: document.querySelectorAll('.reflection-opt'),

        modalCreateQuest: document.getElementById('modal-create-quest'),
        formCreateQuest: document.getElementById('form-create-quest'),
        btnCreateQuest: document.getElementById('btn-create-quest'),

        // Features
        leaderboardBody: document.getElementById('leaderboard-body'),
        questsContainer: document.getElementById('quests-container'),

        // Post Proof
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
        if (!user) return;
        dom.profileUsername.textContent = user.username;
        dom.profileRank.textContent = user.rank || 'NOVICE';
        dom.profileXP.textContent = (user.xp || 0).toLocaleString();

        if (dom.profileStreak) dom.profileStreak.textContent = `${user.streak || 0} Days`;
        if (dom.profileToday) dom.profileToday.textContent = `${user.today_hours || '0.0'}h`;
        if (dom.profileTotal) dom.profileTotal.textContent = user.total_hours || '0.0';



        // Force Stock Avatar
        dom.profileAvatarImg.src = 'default_avatar.jpeg';
        dom.profileAvatarImg.classList.remove('hidden');
        dom.profileAvatarImg.onerror = () => {
            dom.profileAvatarImg.src = 'default_avatar.jpeg';
        };
        const placeholder = document.querySelector('.avatar-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
    }

    /* =========================
       HOME FEED (READING SURFACE)
    ========================= */

    async function renderFeed() {
        dom.feed.innerHTML = '';
        try {
            const logs = await apiFetch('/activity');
            if (!logs.length) {
                dom.feed.innerHTML = `<div class="feed-empty">No posts yet.</div>`;
                return;
            }

            logs.forEach(log => {
                const card = document.createElement('article');
                card.className = 'feed-card';

                // Avatar with fallback
                const avatarUrl = log.user.avatar_url ? `${API_URL}${log.user.avatar_url}` : 'default_avatar.jpeg';
                const avatar = `<img src="${avatarUrl}" class="feed-avatar" onerror="this.src='default_avatar.jpeg'">`;

                const image = log.image_url
                    ? `<img src="${API_URL}${log.image_url}" class="feed-image">`
                    : '';

                // Header Metrics
                const timeText = formatTimestamp(new Date(log.created_at));
                const activityText = getActivityText(log);

                card.innerHTML = `
                    <div class="feed-header">
                        ${avatar}
                        <div class="feed-meta-col">
                            <div class="feed-user">${log.user.username}</div>
                            <div class="feed-meta">${activityText} · ${timeText}</div>
                        </div>
                    </div>
                    ${log.text ? `<div class="feed-text">${escapeHtml(log.text)}</div>` : ''}
                    ${image}
                `;
                dom.feed.appendChild(card);
            });
        } catch (e) {
            dom.feed.innerHTML = `<div class="feed-error">Failed to load feed.</div>`;
        }
    }

    // Expose for inline handlers removed (using pure render logic)
    window.postComment = null;

    /* =========================
       TIMER SYSTEM
    ========================= */

    function transitionTimer(newState) {
        const oldState = state.timer.status;

        switch (newState) {
            case TimerState.RUNNING:
                if (oldState === TimerState.IDLE) {
                    if (state.timer.intervalId) clearInterval(state.timer.intervalId);
                    state.timer.intervalId = setInterval(tick, 1000);
                    if (dom.btnStart) dom.btnStart.disabled = true;
                    if (dom.btnPause) dom.btnPause.disabled = false;
                    if (dom.btnEnd) dom.btnEnd.disabled = false;
                } else if (oldState === TimerState.PAUSED) {
                    if (state.timer.intervalId) clearInterval(state.timer.intervalId);
                    state.timer.intervalId = setInterval(tick, 1000);
                    if (dom.btnStart) dom.btnStart.disabled = true;
                    if (dom.btnPause) dom.btnPause.disabled = false;
                }
                break;

            case TimerState.PAUSED:
                if (oldState === TimerState.RUNNING) {
                    clearInterval(state.timer.intervalId);
                    state.timer.intervalId = null;
                    if (dom.btnStart) {
                        dom.btnStart.textContent = "RESUME";
                        dom.btnStart.disabled = false;
                    }
                    if (dom.btnPause) dom.btnPause.disabled = true;
                }
                break;

            case TimerState.IDLE:
                if (state.timer.intervalId) clearInterval(state.timer.intervalId);
                state.timer.intervalId = null;
                state.timer.seconds = 0;
                state.timer.sessionData = null;
                updateTimerUI();

                if (dom.btnStart) {
                    dom.btnStart.textContent = "START";
                    dom.btnStart.disabled = false;
                }
                if (dom.btnPause) dom.btnPause.disabled = true;
                if (dom.btnEnd) dom.btnEnd.disabled = true;
                break;
        }
        state.timer.status = newState;
    }

    function tick() {
        state.timer.seconds++;
        updateTimerUI();
    }

    function updateTimerUI() {
        if (!dom.timerDisplay) return;
        const total = state.timer.seconds;
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        dom.timerDisplay.textContent =
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /* =========================
       QUESTS & LEADERBOARD
    ========================= */

    async function renderQuests() {
        if (!dom.questsContainer) return;
        dom.questsContainer.innerHTML = '';
        try {
            const quests = await apiFetch('/quests');
            if (!quests.length) {
                dom.questsContainer.innerHTML = '<div class="retro-panel quest-box"><p>No active quests.</p></div>';
                return;
            }

            quests.forEach(q => {
                const pct = Math.min(100, (q.progress_hours / q.target_hours) * 100);
                const isComplete = pct >= 100;
                let actionBtn = '';

                if (!q.joined) {
                    actionBtn = `<button class="retro-btn small" onclick="window.questAction(${q.id}, 'join')">JOIN</button>`;
                } else if (isComplete && !q.completed_at) {
                    actionBtn = `<button class="retro-btn small" onclick="window.questAction(${q.id}, 'claim')">CLAIM</button>`;
                } else if (q.completed_at) {
                    actionBtn = `<span style="color:var(--highlight-color)">COMPLETED</span>`;
                } else {
                    actionBtn = `<span style="font-size:12px; opacity:0.7">ACTIVE</span>`;
                }

                const el = document.createElement('div');
                el.className = 'retro-panel quest-box';
                el.innerHTML = `
                    <h3>${q.title}</h3>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: ${pct}%;"></div></div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <span>${q.progress_hours.toFixed(1)} / ${q.target_hours}h</span>
                        ${actionBtn}
                    </div>
                `;
                dom.questsContainer.appendChild(el);
            });
        } catch (e) {
            dom.questsContainer.innerHTML = `<p class="error">Failed to load quests.</p>`;
        }
    }

    window.questAction = async (id, action) => {
        try {
            await apiFetch(`/quests/${id}/${action}`, 'POST');
            await renderQuests();
            if (action === 'claim') {
                const user = await apiFetch('/me');
                hydrateUserUI(user);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    async function renderLeaderboard() {
        if (!dom.leaderboardBody) return;
        dom.leaderboardBody.innerHTML = '';
        try {
            const users = await apiFetch('/leaderboard');
            users.forEach(u => {
                const tr = document.createElement('tr');
                if (u.is_current_user) tr.className = 'highlight';
                tr.innerHTML = `
                    <td>${u.rank}</td>
                    <td>${u.username}${u.is_current_user ? ' (YOU)' : ''}</td>
                    <td>${(u.xp || 0).toLocaleString()}</td>
                    <td>${u.total_hours || '0.0'}h</td>
                    <td class="hide-mobile">${u.streak || 0}</td>
                `;
                dom.leaderboardBody.appendChild(tr);
            });
        } catch (e) {
            dom.leaderboardBody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
        }
    }

    /* =========================
       POST PROOF
    ========================= */

    function bindPostProof() {
        dom.btnPostProof?.addEventListener('click', () => {
            if (dom.modalPostProof) dom.modalPostProof.classList.remove('hidden');
        });

        // Close Buttons for Modals
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) modal.classList.add('hidden');
            });
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

    /* =========================
       AVATAR UPLOAD (DISABLED)
    ========================= */

    function bindAvatarUpload() {
        // Feature removed: Stock avatar enforced.
    }

    /* =========================
       EVENTS & INIT
    ========================= */

    function getTimeWindow(date) {
        const hour = date.getHours();
        if (hour >= 5 && hour < 11) return 'MORNING';
        if (hour >= 11 && hour < 17) return 'AFTERNOON';
        return 'NIGHT';
    }

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

        // Auth
        dom.authForm?.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('auth-username').value.trim();
            const passphrase = document.getElementById('auth-passphrase').value;
            const endpoint = dom.tabRegister.classList.contains('active') ? '/auth/register' : '/auth/login';

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

        // Timer Controls
        dom.btnStart?.addEventListener('click', () => {
            if (state.timer.status === TimerState.IDLE) {
                dom.modalIntent?.classList.remove('hidden');
            } else if (state.timer.status === TimerState.PAUSED) {
                transitionTimer(TimerState.RUNNING);
            }
        });
        dom.btnPause?.addEventListener('click', () => transitionTimer(TimerState.PAUSED));
        dom.btnEnd?.addEventListener('click', () => {
            transitionTimer(TimerState.PAUSED);
            dom.modalReflection?.classList.remove('hidden');
        });

        // Intent Form
        dom.formIntent?.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('intent-type').value;
            const note = document.getElementById('intent-note').value;
            state.timer.sessionData = { type, note, startTime: new Date(), timeTag: getTimeWindow(new Date()) };
            dom.modalIntent.classList.add('hidden');
            transitionTimer(TimerState.RUNNING);
        });
        dom.btnCancelIntent?.addEventListener('click', () => dom.modalIntent.classList.add('hidden'));

        // Reflection
        dom.reflectionBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const rating = btn.dataset.rating;
                const session = { ...state.timer.sessionData, duration: state.timer.seconds, rating };
                try {
                    await apiFetch('/sessions/end', 'POST', session);
                    dom.modalReflection.classList.add('hidden');
                    transitionTimer(TimerState.IDLE);
                    const user = await apiFetch('/me');
                    hydrateUserUI(user);
                    renderFeed();
                } catch (err) {
                    alert("Failed to save session: " + err.message);
                }
            });
        });

        // Create Quest
        dom.btnCreateQuest?.addEventListener('click', () => dom.modalCreateQuest?.classList.remove('hidden'));
        dom.formCreateQuest?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('quest-title').value.trim();
            const target = document.getElementById('quest-hours').value;
            try {
                await apiFetch('/quests', 'POST', { title, description: title, target_hours: Number(target) });
                dom.modalCreateQuest.classList.add('hidden');
                dom.formCreateQuest.reset();
                renderQuests();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    function initializeSystem(user) {
        hydrateUserUI(user);
        renderFeed();
        renderQuests();
        renderLeaderboard();
        switchScreen('home');
    }

    function init() {
        bindEvents();
        checkAuth();
    }

    /* =========================
       HELPERS
    ========================= */

    function escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function stringToColor(str) {
        if (!str) return '#ccc';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + "00000".substring(0, 6 - c.length) + c;
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    }

    function formatTimestamp(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    function getActivityText(log) {
        // Quest Actions
        if (log.type === 'QUEST_JOIN') return `joined quest: ${log.metadata?.quest_title || 'a quest'}`;
        if (log.type === 'QUEST_COMPLETE') return `completed quest: ${log.metadata?.quest_title || 'a quest'}`;

        // Session Actions
        if (log.type === 'SESSION_COMPLETE') {
            const duration = log.metadata?.duration ? Math.round(log.metadata.duration / 60) : 0;
            return `completed ${duration}m · ${log.metadata?.type || 'STUDY'}`;
        }

        // Generic / Fallback
        return 'posted an update';
    }

    init();
});
