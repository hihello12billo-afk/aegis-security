const API_URL = '/api';
let cart = JSON.parse(localStorage.getItem('aegis_cart')) || [];

async function login(email, password) {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        window.location.href = 'dashboard.html';
    } else { alert(data.error); }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function addToCart(title, price) {
    cart = [{ title, price, quantity: 1 }]; // Simplification: one plan at a time
    localStorage.setItem('aegis_cart', JSON.stringify(cart));
    window.location.href = 'dashboard.html';
}

async function fetchOrders() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('order-list');
    if(!token || !container) return;

    const res = await fetch('/api/my-orders', { headers: { 'Authorization': `Bearer ${token}` } });
    const orders = await res.json();
    
    container.innerHTML = orders.length ? orders.map(o => `
        <div style="display: flex; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid var(--border);">
            <div><strong>${o.items[0].title}</strong><br><small style="color:var(--text-muted)">${o._id}</small></div>
            <div class="status-badge"><div class="status-pulse"></div> ${o.status}</div>
            <div style="font-weight:700">$${o.total}</div>
        </div>
    `).join('') : '<p style="text-align:center; padding:2rem; color:var(--text-muted)">No active shields.</p>';
}

// Global Mouse Tracker for Card Glow
document.addEventListener('mousemove', e => {
    document.querySelectorAll('.card').forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('order-list')) fetchOrders();
    if(localStorage.getItem('username') && document.getElementById('welcome-msg')) {
        document.getElementById('welcome-msg').innerText = `Welcome, ${localStorage.getItem('username')}`;
    }
});