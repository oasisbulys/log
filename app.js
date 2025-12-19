/**
 * Retro Study OS - Frontend Controller (Stabilized v1.5)
 * Focus: Correctness, State Management, Discipline.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- CONSULT CONSTANTS ---
    const API_URL = 'log-production-449f.up.railway.app';

    // --- STATE MANAGEMENT ---
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

    // --- DOM ELEMENTS (Safe Querying) ---
    const dom = {
        // Nav
        navButtons: document.querySelectorAll('.nav-btn'),
        screens: document.querySelectorAll('.screen'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        mainNav: document.getElementById('main-nav'),

        // Auth
        authModal: document.getElementById('modal-auth'),
        authForm: document.getElementById('form-auth'),
        authError: document.getElementById('auth-error'),
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),

        // Profile
        profileRank: document.getElementById('profile-rank'),
        profileXP: document.getElementById('profile-xp'),
        profileAvatar: document.querySelector('.profile-avatar'),
        profileAvatarImg: document.querySelector('.profile-avatar img'),
        avatarInput: document.getElementById('avatar-upload'),
        bestWindow: document.getElementById('profile-best-window'),

        // Timer
        timerDisplay: document.getElementById('timer'),
        btnStart: document.getElementById('btn-start'),
        btnPause: document.getElementById('btn-pause'),
        btnEnd: document.getElementById('btn-end'),
        statusDisplay: document.getElementById('sys-status'),

        // Modals
        modalIntent: document.getElementById('modal-session-intent'),
        formIntent: document.getElementById('form-session-intent'),
        btnCancelIntent: document.getElementById('btn-cancel-intent'),

        modalReflection: document.getElementById('modal-reflection'),
        reflectionBtns: document.querySelectorAll('.reflection-opt'),

        modalPostProof: document.getElementById('modal-post-proof'),
        formPostProof: document.getElementById('form-post-proof'),
        btnPostProof: document.getElementById('btn-post-proof'),

        coldStart: document.getElementById('cold-start-screen'),
        btnColdStart: document.getElementById('btn-cold-start-continue'),

        // Log
        logContainer: document.getElementById('activity-log-container')
    };

    // --- INITIALIZATION ---
    function init() {
        console.log("SYSTEM BOOT SEQUENCE INITIATED...");
        bindEvents();
        runColdStart(); // Strict Boot Flow
    }

    // --- AUTHENTICATION ---
    async function checkAuth() {
        if (!state.token) {
            resetToAuth();
            return;
        }

        try {
            const user = await apiFetch('/me');
            state.user = user;
            // Success: Hide auth, show system
            if (dom.authModal) dom.authModal.classList.add('hidden');
            initializeSystem(user);
        } catch (err) {
            console.error("Auth Fail:", err);
            logout(); // Clear bad token
        }
    }

    function resetToAuth() {
        if (dom.authModal) dom.authModal.classList.remove('hidden');
        // Reset state
        state.user = null;
    }

    function logout() {
        localStorage.removeItem('token');
        state.token = null;
        window.location.reload(); // Hard reset for discipline
    }

    // --- API UTILITIES (Robust) ---
    async function apiFetch(endpoint, method = 'GET', body = null) {
        const headers = {};
        if (state.token) headers['x-auth-token'] = state.token;

        // Auto-detect JSON content type, but skip for FormData
        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const options = {
            method,
            headers,
            body: (body instanceof FormData) ? body : (body ? JSON.stringify(body) : null)
        };

        try {
            const res = await fetch(`${API_URL}${endpoint}`, options);

            // Critical: Always expect JSON, but handle fallbacks safely
            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                // Fallback for non-JSON responses (e.g. 404 HTML from Vercel/Railway default pages)
                const text = await res.text();
                // If we get HTML but expected an API response, it's likely a wrong path or server crash
                if (text.startsWith('<')) throw new Error("Remote Server Error (Invalid Response)");
                throw new Error(text || res.statusText);
            }

            if (!res.ok) {
                if (res.status === 401) {
                    logout();
                    throw new Error("Session Expired");
                }
                throw new Error(data?.error || data?.msg || 'Request Failed');
            }
            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    }

    // --- NAVIGATION ---
    function handleNavigation(targetId) {
        // Update Buttons
        dom.navButtons.forEach(btn => {
            if (btn.dataset.target === targetId) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update Screens
        dom.screens.forEach(screen => {
            if (screen.id === targetId) {
                screen.classList.remove('hidden');
                screen.classList.add('active');
            } else {
                screen.classList.add('hidden');
                screen.classList.remove('active');
            }
        });

        // Mobile Menu Cleanup
        if (window.innerWidth <= 768 && dom.mainNav) {
            dom.mainNav.classList.remove('open');
        }
    }

    // --- TIMER STATE MACHINE ---
    function transitionTimer(newState) {
        const oldState = state.timer.status;

        // Valid Transitions
        // IDLE -> RUNNING
        // RUNNING -> PAUSED
        // PAUSED -> RUNNING
        // ANY -> IDLE (Reset)

        switch (newState) {
            case TimerState.RUNNING:
                if (oldState === TimerState.IDLE) {
                    // Safe Start
                    if (state.timer.intervalId) clearInterval(state.timer.intervalId);
                    state.timer.intervalId = setInterval(tick, 1000);

                    dom.btnStart.disabled = true;
                    dom.btnPause.disabled = false;
                    dom.btnEnd.disabled = false;
                    dom.statusDisplay.textContent = `STUDYING: ${state.timer.sessionData?.type || 'CORE'}`;
                } else if (oldState === TimerState.PAUSED) {
                    // Resume
                    if (state.timer.intervalId) clearInterval(state.timer.intervalId);
                    state.timer.intervalId = setInterval(tick, 1000);

                    dom.btnStart.disabled = true;
                    dom.btnPause.disabled = false;
                    dom.statusDisplay.textContent = "RESUMED";
                }
                break;

            case TimerState.PAUSED:
                if (oldState === TimerState.RUNNING) {
                    clearInterval(state.timer.intervalId);
                    state.timer.intervalId = null; // Strict Nulling

                    dom.btnStart.textContent = "RESUME";
                    dom.btnStart.disabled = false;
                    dom.btnPause.disabled = true;
                    dom.statusDisplay.textContent = "PAUSED";
                }
                break;

            case TimerState.IDLE:
                if (state.timer.intervalId) clearInterval(state.timer.intervalId);
                state.timer.intervalId = null;

                state.timer.seconds = 0;
                state.timer.sessionData = null;
                updateTimerUI();

                dom.btnStart.textContent = "START";
                dom.btnStart.disabled = false;
                dom.btnPause.disabled = true;
                dom.btnEnd.disabled = true;
                dom.statusDisplay.textContent = "SYSTEM ONLINE";
                break;
        }

        state.timer.status = newState;
    }

    function tick() {
        state.timer.seconds++;
        updateTimerUI();
    }

    function updateTimerUI() {
        const total = state.timer.seconds;
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        dom.timerDisplay.textContent =
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // --- SYSTEM LOGIC ---
    function initializeSystem(user) {
        console.log(`SYSTEM ONLINE. USER: ${user.username}`);
        hydrateUserUI(user);
        renderLog(); // Fetch real log

        // v2.0 Features
        renderQuests();
        renderLeaderboard();

        // Unhide sections (if hidden)
        dom.navButtons.forEach(btn => btn.classList.remove('hidden'));
        // Note: Screens stay managed by nav logic, but nav buttons are now safe.
    }

    // Single source of truth for UI updates (No Mocks)
    function hydrateUserUI(user) {
        if (!user) return;

        // Text Fields
        const safeRank = user.rank || 'NOVICE';
        const safeXP = user.xp !== undefined ? user.xp : 0;
        const safeStreak = user.streak !== undefined ? user.streak : 0;

        // Profile
        if (dom.profileRank) dom.profileRank.textContent = safeRank;
        if (dom.profileXP) dom.profileXP.textContent = safeXP.toLocaleString();
        const usernameEl = document.getElementById('profile-username');
        if (usernameEl) usernameEl.textContent = user.username;
        const streakEl = document.getElementById('profile-streak-val');
        if (streakEl) streakEl.textContent = `${safeStreak} DAYS`;

        // Status Bar
        const sysXP = document.getElementById('sys-xp');
        if (sysXP) sysXP.textContent = safeXP.toLocaleString();
        const sysStreak = document.getElementById('sys-streak');
        if (sysStreak) sysStreak.textContent = `${safeStreak} DAYS`;

        // Advanced Stats (v1.8 Truth)
        const todayEl = document.getElementById('profile-study-time');
        if (todayEl) todayEl.textContent = `${user.today_hours || '0.0'}h`;

        const totalEl = document.getElementById('profile-total-hours');
        if (totalEl) totalEl.textContent = user.total_hours || '0.0';

        // Avatar
        const avatarContainer = document.querySelector('.profile-avatar');
        if (avatarContainer) {
            const img = avatarContainer.querySelector('img');
            const placeholder = avatarContainer.querySelector('.avatar-placeholder');

            if (user.avatar_url && img) {
                img.src = `${API_URL}${user.avatar_url}`;
                img.classList.remove('hidden');
                if (placeholder) placeholder.classList.add('hidden');
            } else {
                if (img) img.classList.add('hidden');
                if (placeholder) placeholder.classList.remove('hidden');
            }
        }
    }

    function runColdStart() {
        // Strict Boot Flow: Always show cold start first.
        // Auth check happens ONLY after user interaction.
        dom.coldStart.classList.remove('hidden');

        // Static boot sequence - no glitches
        const lastSessionEl = document.getElementById('boot-last-session');
        if (lastSessionEl) {
            const lastBoot = localStorage.getItem('lastBootDate');
            lastSessionEl.textContent = lastBoot || "SYSTEM INIT";
        }

        dom.btnColdStart.addEventListener('click', () => {
            localStorage.setItem('lastBootDate', new Date().toDateString());
            // Animate out
            dom.coldStart.style.opacity = '0';
            setTimeout(() => {
                dom.coldStart.classList.add('hidden');
                dom.coldStart.style.opacity = '1';
                checkAuth(); // Trigger Auth/System Load ONLY here
            }, 500);
        }, { once: true });
    }

    async function renderLog() {
        if (!dom.logContainer) return;
        dom.logContainer.innerHTML = ''; // Clear mocked/loading state

        try {
            const logs = await apiFetch('/activity');

            if (logs.length === 0) {
                dom.logContainer.innerHTML = '<div class="log-item">SYSTEM: No activity recorded.</div>';
                return;
            }

            logs.forEach(log => {
                const el = document.createElement('div');
                el.className = 'log-item';

                const time = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                let imgHtml = '';
                if (log.image_url) {
                    imgHtml = `<div class="log-image-container"><img src="${API_URL}${log.image_url}" class="proof-img"></div>`;
                }

                // Interaction Bar (Restrained)
                const commentsHtml = log.comments ? log.comments.map(c =>
                    `<div class="comment-item">
                        <span class="comment-user">${c.user.username}</span>: ${c.text}
                     </div>`
                ).join('') : '';

                el.innerHTML = `
                    <div class="log-meta">[${time}]</div>
                    <div class="log-content">
                        <span class="log-user">${log.user?.username || 'UNKNOWN'}</span>
                        ${log.text}
                    </div>
                    ${imgHtml}

                    <div class="log-actions">
                         <div class="comments-list">${commentsHtml}</div>
                         <div class="add-comment-box">
                            <input type="text" class="retro-input-mini" placeholder="> add comment..."
                                   onkeydown="if(event.key==='Enter') window.postComment(${log.id}, this)">
                         </div>
                    </div>
                `;
                dom.logContainer.appendChild(el);
            });
        } catch (err) {
            dom.logContainer.innerHTML = `<div class="log-item error">SYSTEM: Link Failure (${err.message})</div>`;
        }
    }

    // Expose for inline handlers
    window.postComment = async (logId, input) => {
        const text = input.value.trim();
        if (!text) return;

        // UX: Disable and Feedback
        input.disabled = true;
        const originalPlaceholder = input.placeholder;
        input.placeholder = "posting...";
        input.style.opacity = "0.7";

        try {
            await apiFetch(`/activity/${logId}/comments`, 'POST', { text });
            // Success: clear and refresh
            input.value = '';
            renderLog();
        } catch (err) {
            alert(err.message);
            // Error: Re-enable to retry
            input.disabled = false;
            input.placeholder = originalPlaceholder;
            input.style.opacity = "1";
            input.focus();
        }
    };

    // --- QUESTS logic ---
    async function renderQuests() {
        const container = document.getElementById('quests-container');
        if (!container) return;
        container.innerHTML = '';

        try {
            const quests = await apiFetch('/quests');
            if (quests.length === 0) {
                container.innerHTML = '<div class="retro-panel quest-box"><p>No active quests.</p></div>';
                return;
            }

            quests.forEach(q => {
                const pct = Math.min(100, (q.progress_hours / q.target_hours) * 100);
                const isComplete = pct >= 100;
                let actionBtn = '';

                if (!q.joined) {
                    actionBtn = `<button class="retro-btn small" onclick="window.questAction(${q.id}, 'join')">JOIN</button>`;
                } else if (isComplete && !q.completed_at) {
                    actionBtn = `<button class="retro-btn small" onclick="window.questAction(${q.id}, 'claim')">CLAIM REWARD</button>`;
                } else if (q.completed_at) {
                    actionBtn = `<span style="color:var(--highlight-color)">COMPLETED</span>`;
                } else {
                    actionBtn = `<span style="font-size:12px; opacity:0.7">ACTIVE</span>`;
                }

                const el = document.createElement('div');
                el.className = 'retro-panel quest-box';
                el.innerHTML = `
                    <h3>${q.title}</h3>
                    <p>${q.description}</p>
                    <p style="font-size:12px; margin-top:5px;">REWARD: ${q.xp_reward} XP</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${pct}%;"></div>
                    </div>
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <span style="font-size:12px">${q.progress_hours.toFixed(1)} / ${q.target_hours}h</span>
                        ${actionBtn}
                    </div>
                `;
                container.appendChild(el);
            });
        } catch (e) {
            container.innerHTML = `<p class="error">Failed to load quests.</p>`;
        }
    }

    window.questAction = async (id, action) => {
        try {
            await apiFetch(`/quests/${id}/${action}`, 'POST');
            await renderQuests();
            if (action === 'claim') {
                // Refresh stats
                const user = await apiFetch('/me');
                hydrateUserUI(user);
                renderLog();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    // --- LEADERBOARD logic ---
    async function renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        try {
            const users = await apiFetch('/leaderboard');
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Leaderboard unavailable</td></tr>';
                return;
            }

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
                tbody.appendChild(tr);
            });
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
        }
    }

    function getTimeWindow(date) {
        const hour = date.getHours();
        if (hour >= 5 && hour < 11) return 'MORNING';
        if (hour >= 11 && hour < 17) return 'AFTERNOON';
        return 'NIGHT';
    }

    // --- EVENT BINDING ---
    function bindEvents() {
        if (window.eventsBound) return;
        window.eventsBound = true;

        // Nav
        dom.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                handleNavigation(btn.dataset.target);

                // Close hamburger menu on mobile
                if (window.innerWidth <= 768 && dom.mainNav) {
                    dom.mainNav.classList.remove('open');
                }
            });
        });

        // Mobile Menu
        if (dom.mobileMenuBtn) {
            dom.mobileMenuBtn.addEventListener('click', () => {
                if (dom.mainNav) dom.mainNav.classList.toggle('open');
            });
        }

        // Close mobile menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && dom.mainNav) {
                dom.mainNav.classList.remove('open');
            }
        });

        // Auth Form
        if (dom.authForm) {
            let mode = 'login';
            dom.tabLogin.addEventListener('click', () => {
                mode = 'login';
                dom.tabLogin.classList.add('active');
                dom.tabRegister.classList.remove('active');
                dom.authForm.querySelector('button').textContent = "AUTHENTICATE";
                dom.authError.textContent = "";
            });
            dom.tabRegister.addEventListener('click', () => {
                mode = 'register';
                dom.tabRegister.classList.add('active');
                dom.tabLogin.classList.remove('active');
                dom.authForm.querySelector('button').textContent = "REGISTER";
                dom.authError.textContent = "";
            });

            dom.authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('auth-username').value;
                const p = document.getElementById('auth-passphrase').value;
                try {
                    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
                    const res = await apiFetch(endpoint, 'POST', { username: u, passphrase: p });

                    state.token = res.token;
                    state.user = res.user;
                    localStorage.setItem('token', res.token);

                    dom.authModal.classList.add('hidden');
                    initializeSystem(res.user);
                } catch (err) {
                    dom.authError.textContent = err.message;
                }
            });
        }

        // Avatar Upload
        if (dom.profileAvatar && dom.avatarInput) {
            dom.profileAvatar.addEventListener('click', () => dom.avatarInput.click());
            dom.avatarInput.addEventListener('change', async (e) => {
                if (!e.target.files[0]) return;
                const fd = new FormData();
                fd.append('avatar', e.target.files[0]);
                try {
                    const res = await apiFetch('/me/avatar', 'PUT', fd);
                    hydrateUserUI(res);
                } catch (err) {
                    alert("Upload Failed: " + err.message);
                }
            });
        }

        // Timer Buttons
        if (dom.btnStart) {
            dom.btnStart.addEventListener('click', () => {
                if (state.timer.status === TimerState.IDLE) {
                    // Open Intent
                    if (dom.modalIntent) dom.modalIntent.classList.remove('hidden');
                } else if (state.timer.status === TimerState.PAUSED) {
                    // Resume
                    transitionTimer(TimerState.RUNNING);
                }
            });
        }

        if (dom.btnPause) {
            dom.btnPause.addEventListener('click', () => transitionTimer(TimerState.PAUSED));
        }

        if (dom.btnEnd) {
            dom.btnEnd.addEventListener('click', () => {
                // Pause first
                transitionTimer(TimerState.PAUSED);
                if (dom.modalReflection) dom.modalReflection.classList.remove('hidden');
            });
        }

        // Intent Form
        if (dom.formIntent) {
            dom.formIntent.addEventListener('submit', (e) => {
                e.preventDefault();
                const type = document.getElementById('intent-type').value;
                const note = document.getElementById('intent-note').value;
                state.timer.sessionData = {
                    type,
                    note,
                    startTime: new Date(),
                    timeTag: getTimeWindow(new Date())
                };
                if (dom.modalIntent) dom.modalIntent.classList.add('hidden');
                transitionTimer(TimerState.RUNNING);
            });
        }

        if (dom.btnCancelIntent) {
            dom.btnCancelIntent.addEventListener('click', () => dom.modalIntent.classList.add('hidden'));
        }

        // Reflection
        dom.reflectionBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const rating = btn.dataset.rating;
                const session = {
                    ...state.timer.sessionData,
                    duration: state.timer.seconds,
                    rating
                };

                try {
                    await apiFetch('/sessions/end', 'POST', session);
                    dom.modalReflection.classList.add('hidden');
                    transitionTimer(TimerState.IDLE);

                    // Refresh data
                    const user = await apiFetch('/me');
                    hydrateUserUI(user);
                    renderLog();
                } catch (err) {
                    alert("Failed to save session: " + err.message);
                }
            });
        });

        // Post Proof
        if (dom.btnPostProof) {
            dom.btnPostProof.addEventListener('click', () => dom.modalPostProof.classList.remove('hidden'));
        }

        if (dom.formPostProof) {
            dom.formPostProof.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = document.getElementById('proof-text').value;
                const file = document.getElementById('proof-file').files[0];
                const fd = new FormData();
                fd.append('text', text);
                if (file) fd.append('image', file);

                const btn = dom.formPostProof.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.textContent = "UPLOADING...";

                try {
                    await apiFetch('/activity/proof', 'POST', fd);
                    dom.modalPostProof.classList.add('hidden');
                    dom.formPostProof.reset();
                    renderLog();
                } catch (err) {
                    alert("Proof Failed: " + err.message);
                } finally {
                    btn.disabled = false;
                    btn.textContent = "UPLOAD";
                }
            });
        }

        // Close Modals (Overlay Click)
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') && e.target.id !== 'modal-auth') {
                e.target.classList.add('hidden');
            }
        });

        // Close Modals (Buttons)
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) modal.classList.add('hidden');
            });
        });

        // Create Quest Wire
        const btnCreateQuest = document.getElementById('btn-create-quest');
        const modalCreateQuest = document.getElementById('modal-create-quest');

        if (btnCreateQuest && modalCreateQuest) {
            btnCreateQuest.addEventListener('click', () => {
                modalCreateQuest.classList.remove('hidden');
            });
        }

        // Create Quest Submit
        const formCreateQuest = document.getElementById('form-create-quest');

        if (formCreateQuest) {
            formCreateQuest.addEventListener('submit', async (e) => {
                e.preventDefault();

                const title = document.getElementById('quest-title').value.trim();
                const targetInput = formCreateQuest.querySelector('input[type="number"]');
                const targetHours = Number(targetInput.value);

                if (!title || targetHours <= 0) {
                    alert('Invalid quest data');
                    return;
                }

                try {
                    await apiFetch('/quests', 'POST', {
                        title,
                        description: title,
                        target_hours: targetHours
                    });

                    modalCreateQuest.classList.add('hidden');
                    formCreateQuest.reset();

                    renderQuests();
                    renderLog();
                } catch (err) {
                    alert('Quest creation failed: ' + err.message);
                }
            });
        }
    }

    // --- BOOT ---
    init();
});
