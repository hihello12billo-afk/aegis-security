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

// Updated to handle Price IDs for Subscriptions
function addToCart(priceId, priceAmount) {
    // SaaS logic: One subscription at a time
    cart = [{ priceId, price: priceAmount, quantity: 1 }]; 
    localStorage.setItem('aegis_cart', JSON.stringify(cart));
    alert("Security plan selected. Proceeding to deployment...");
}

async function checkout() {
    const token = localStorage.getItem('token');
    if(!token) {
        alert("Please login to deploy security protocols.");
        window.location.href = 'login.html';
        return;
    }

    if(cart.length === 0) {
        alert("Please select a protection plan first.");
        return;
    }

    // Initialize Stripe (Ensure this matches your Publishable Key)
    const stripe = Stripe('pk_test_51SyqARISGGHqTVJmgMMAcLkyokMP1B6K0MwnrsqQ9NO1S5B2o9jLpZylStJsH9rY6KwPzXn6EsPyrFAiCVevpS8Q00nWfWfqLK');

    const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, token })
    });

    const session = await res.json();
    if(session.id) {
        stripe.redirectToCheckout({ sessionId: session.id });
    } else {
        alert("Session error. Please try again.");
    }
}

async function fetchOrders() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('order-list');
    if(!token || !container) return;

    const res = await fetch('/api/my-orders', { 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
    const orders = await res.json();
    
    container.innerHTML = orders.length ? orders.map(o => `
        <div style="display: flex; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid var(--border);">
            <div><strong>Active Shield</strong><br><small style="color:var(--text-muted)">Protocol ID: ${o._id.substring(0,8)}</small></div>
            <div class="status-badge"><div class="status-pulse"></div> ${o.status}</div>
            <div style="font-weight:700">$${o.total}/mo</div>
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