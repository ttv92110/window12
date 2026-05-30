// auth-ui.js – login/signup UI, token refresh, password toggle

let currentUserX = null;

document.addEventListener('DOMContentLoaded', () => {
    setupAuthUI();

    if (authToken) {
        validateTokenAndLogin();
    } else {
        showLockScreen();
    }
});

function setupAuthUI() {
    // Password toggle for both login and signup
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.textContent = isPassword ? '🙈' : '👁️';
        });
    });

    document.getElementById('login-btn').addEventListener('click', loginHandler);
    document.getElementById('signup-btn').addEventListener('click', signupHandler);

    // Plus icon → show signup form
    document.getElementById('show-signup-icon').addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'flex';
        document.getElementById('show-signup-icon').style.display = 'none';
        document.getElementById('show-login-icon').style.display = 'flex';
    });

    // Back arrow → show login form
    document.getElementById('show-login-icon').addEventListener('click', () => {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('show-login-icon').style.display = 'none';
        document.getElementById('show-signup-icon').style.display = 'flex';
    });

    // Lock screen click → show login box
    document.getElementById('lock-screen').addEventListener('click', () => {
        document.getElementById('login-box').style.display = 'flex';
    });
}

async function loginHandler(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!username || !password) return alert('Enter username and password');
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    try {
        const res = await fetch('/auth/login', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Invalid credentials');
        const data = await res.json();
        authToken = data.access_token;
        localStorage.setItem('token', authToken);
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        await loadUserProfile();
        loginSuccess();
    } catch (err) {
        alert('Login failed: ' + err.message);
    }
}

async function signupHandler(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const fullName = document.getElementById('signup-fullname').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    if (!email || !username || !fullName || !password) return alert('All fields are required');
    try {
        await api.post('/auth/signup', { username, password, full_name: fullName, email });
        alert('Signup successful! You can now login.');
        // Switch back to login form
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('show-login-icon').style.display = 'none';
        document.getElementById('show-signup-icon').style.display = 'flex';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-username').value = '';
        document.getElementById('signup-fullname').value = '';
        document.getElementById('signup-password').value = '';
    } catch (err) {
        alert('Signup failed: ' + err.message);
    }
}

async function validateTokenAndLogin() {
    try {
        const res = await api.get('/auth/me');
        currentUserX = res;
        Win12.currentUser = res;           // important for other modules
        document.getElementById('user-display').textContent = currentUserX.full_name;
        // Update welcome heading if login form is visible (first time)
        const heading = document.getElementById('login-heading');
        if (heading) heading.textContent = currentUserX.full_name;
        loginSuccess();
    } catch (e) {
        localStorage.removeItem('token');
        authToken = null;
        showLockScreen();
    }
}

async function loadUserProfile() {
    currentUserX = await api.get('/auth/me');
    Win12.currentUser = currentUserX;
    document.getElementById('user-display').textContent = currentUserX.full_name;
    const heading = document.getElementById('login-heading');
    if (heading) heading.textContent = currentUserX.full_name;  // future logins will show name
}

function loginSuccess() {
    document.getElementById('login-box').style.display = 'none';
    // Hide boot screen immediately
    if (typeof hideBootScreen === 'function') hideBootScreen();
    // Hide plus icons
    const plusBtn = document.getElementById('show-signup-icon');
    const backBtn = document.getElementById('show-login-icon');
    if (plusBtn) plusBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    // Unlock
    if (typeof unlockSystem === 'function') unlockSystem();
    if (typeof connectWebSocket === 'function') connectWebSocket();
    if (typeof initBackendData === 'function') initBackendData();
}

function showLockScreen() {
    document.getElementById('lock-screen').classList.remove('hidden');
    document.getElementById('login-box').style.display = 'none';
    // Show plus button again
    const plusBtn = document.getElementById('show-signup-icon');
    if (plusBtn) plusBtn.style.display = 'flex';
}