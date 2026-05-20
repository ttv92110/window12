const API_BASE = '';
let authToken = localStorage.getItem('token') || null;
let isRefreshing = false;   // prevent refresh loop

function sanitize(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

const api = {
    async request(method, url, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        let res = await fetch(API_BASE + url, { method, headers, body: body ? JSON.stringify(body) : null });

        if (res.status === 401 && authToken && !isRefreshing) {
            isRefreshing = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const formData = new URLSearchParams();
                    formData.append('refresh_token', refreshToken);
                    const refreshRes = await fetch(API_BASE + '/auth/refresh', { method: 'POST', body: formData });
                    if (refreshRes.ok) {
                        const data = await refreshRes.json();
                        authToken = data.access_token;
                        localStorage.setItem('token', authToken);
                        headers['Authorization'] = `Bearer ${authToken}`;
                        res = await fetch(API_BASE + url, { method, headers, body: body ? JSON.stringify(body) : null });
                    } else {
                        // Refresh failed – clear tokens and show lock screen (no reload)
                        authToken = null;
                        localStorage.removeItem('token');
                        localStorage.removeItem('refresh_token');
                        showLockScreen();
                        throw new Error('Session expired');
                    }
                } catch (e) {
                    authToken = null;
                    localStorage.removeItem('token');
                    localStorage.removeItem('refresh_token');
                    showLockScreen();
                    throw e;
                }
            } else {
                authToken = null;
                localStorage.removeItem('token');
                showLockScreen();
                throw new Error('Not authenticated');
            }
            isRefreshing = false;
        }

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }
        return res.json();
    },
    get: (url) => api.request('GET', url),
    post: (url, data) => api.request('POST', url, data),
    put: (url, data) => api.request('PUT', url, data),
    delete: (url) => api.request('DELETE', url)
};