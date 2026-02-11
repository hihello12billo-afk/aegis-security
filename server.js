require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');

const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serves your HTML files

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, username: user.username, isAdmin: user.isAdmin });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- STRIPE PAYMENT ROUTE ---

app.post('/api/create-checkout-session', async (req, res) => {
    const { items, token } = req.body;
    
    // Verify User
    let userId = null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create Line Items for Stripe
    const lineItems = items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: { name: item.title },
            unit_amount: item.price * 100, // Stripe expects cents
        },
        quantity: item.quantity,
    }));

    // Create Order in DB (Pending)
    const order = new Order({
        userId,
        items,
        total: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
        status: 'Pending'
    });
    await order.save();

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.DOMAIN}/dashboard.html?success=true`,
        cancel_url: `${process.env.DOMAIN}/pricing.html?canceled=true`,
    });

    res.json({ id: session.id });
});

// --- DASHBOARD DATA ---
app.get('/api/my-orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const orders = await Order.find({ userId: verified.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
});

// Serve Frontend
app.get(/(.*)/, (req, res) => {     // <--- THIS LINE CHANGED
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));