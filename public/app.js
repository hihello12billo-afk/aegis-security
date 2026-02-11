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
    const nav = document.querySelector('.nav-links');
    if (token) {
        // Change "Login" to "Dashboard"
        const loginBtn = document.getElementById('login-link');
        if(loginBtn) {
            loginBtn.innerText = 'Dashboard';
            loginBtn.href = 'dashboard.html';
        }
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
        alert('Please login to checkout');
        window.location.href = 'login.html';
        return;
    }

    const stripe = Stripe('pk_test_51SyqARISGGHqTVJmgMMAcLkyokMP1B6K0MwnrsqQ9NO1S5B2o9jLpZylStJsH9rY6KwPzXn6EsPyrFAiCVevpS8Q00nWfWfqLK'); // Replace with your Test Public Key

    const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ items: cart, token })
    });

    const session = await res.json();
    const result = await stripe.redirectToCheckout({ sessionId: session.id });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateCartUI();
});