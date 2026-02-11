/* public/app.js */
const API_URL = '/api';
let cart = JSON.parse(localStorage.getItem('aegis_cart')) || [];

// --- AUTHENTICATION ---
async function register(username, email, password) {
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if(res.ok) {
        alert('Registration Successful! Please Login.');
        window.location.href = 'login.html';
    } else {
        alert(data.error);
    }
}

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
    } else {
        alert(data.error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        // Updated to find buttons in the new premium nav structure
        const loginBtns = document.querySelectorAll('a[href="login.html"]');
        loginBtns.forEach(btn => {
            btn.innerText = 'Dashboard';
            btn.href = 'dashboard.html';
        });
    }
}

// --- CART SYSTEM ---
function addToCart(title, price) {
    const existing = cart.find(item => item.title === title);
    if(existing) {
        existing.quantity++;
    } else {
        cart.push({ title, price, quantity: 1 });
    }
    updateCartUI();
    // Visual feedback for premium experience
    alert(`${title} added to security queue.`);
}

function updateCartUI() {
    localStorage.setItem('aegis_cart', JSON.stringify(cart));
    const cartCount = document.getElementById('cart-count');
    if(cartCount) cartCount.innerText = cart.reduce((acc, item) => acc + item.quantity, 0);
}

// --- CHECKOUT ---
async function checkout() {
    const token = localStorage.getItem('token');
    if(!token) {
        alert('Please login to finalize deployment');
        window.location.href = 'login.html';
        return;
    }

    if(cart.length === 0) {
        alert('Your security queue is empty.');
        return;
    }

    const stripe = Stripe('pk_test_51SyqARISGGHqTVJmgMMAcLkyokMP1B6K0MwnrsqQ9NO1S5B2o9jLpZylStJsH9rY6KwPzXn6EsPyrFAiCVevpS8Q00nWfWfqLK');

    const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ items: cart, token })
    });

    const session = await res.json();
    if (session.id) {
        const result = await stripe.redirectToCheckout({ sessionId: session.id });
    } else {
        alert('Session initialization failed. Check console.');
    }
}

// --- DASHBOARD DATA LOADING (PHASE 3 UPDATED) ---
async function fetchOrders() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('order-list');
    
    if(!token || !container) return;

    try {
        const res = await fetch('/api/my-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await res.json();
        
        if(orders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No active protections found.</p>
                    <a href="pricing.html" style="color: var(--primary); text-decoration: none; font-weight: 600;">Upgrade Plan</a>
                </div>`;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        orders.forEach(o => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.2rem; border-bottom: 1px solid var(--border); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <div>
                        <div style="font-weight: 600; letter-spacing: 0.5px;">${o.items.map(i => i.title).join(', ')}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-top: 4px;">ID: ${o._id.substring(0,8)} • ${new Date(o.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="status-badge">
                        <div class="status-pulse"></div> ${o.status}
                    </div>
                    <div style="font-weight: 700; font-family: 'Space Grotesk';">$${o.total}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        if(container) container.innerHTML = "Failed to sync with security ledger.";
    }
}

// --- PREMIUM MOUSE INTERACTION (APPLE/STRIPE STYLE) ---
document.addEventListener('mousemove', e => {
    document.querySelectorAll('.card').forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateCartUI();
    // Auto-run fetchOrders if we are on the dashboard
    if(document.getElementById('order-list')) {
        fetchOrders();
    }
});
window.addEventListener('load', () => {
    const loader = document.getElementById('preloader');
    if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 800);
    }
});