require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');
const { body, validationResult } = require('express-validator');

const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

// --- AUTHENTICATION ROUTES ---

app.post('/api/register', [
    body('email').isEmail().withMessage('Please enter a real email address.'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be 8+ characters.')
        .matches(/[A-Z]/).withMessage('Password needs an Uppercase letter.')
        .matches(/[0-9]/).withMessage('Password needs a Number.'),
    body('username').isLength({ min: 3, max: 20 }).trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already in use." });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.json({ message: "Operative successfully registered." });
    } catch (err) {
        res.status(500).json({ error: "Database error." });
    }
});

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

// --- STRIPE SUBSCRIPTION ROUTE ---

app.post('/api/create-checkout-session', async (req, res) => {
    const { items, token } = req.body;
    
    let userId = null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Prepare Line Items for Subscriptions (Price IDs)
    const lineItems = items.map(item => ({
        price: item.priceId, // Uses Stripe Price ID
        quantity: item.quantity,
    }));

    // Create Order in DB
    const order = new Order({
        userId,
        items: items.map(i => ({ title: "Active Shield", price: i.price })),
        total: items.reduce((acc, item) => acc + item.price, 0),
        status: 'Active'
    });
    await order.save();

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription', // Changed from 'payment'
        success_url: `${process.env.DOMAIN || 'http://localhost:3000'}/dashboard.html?success=true`,
        cancel_url: `${process.env.DOMAIN || 'http://localhost:3000'}/pricing.html?canceled=true`,
    });

    res.json({ id: session.id });
});

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

// Admin and Static serving
app.get('/api/admin/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Access Denied');
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (!verified.isAdmin) return res.status(403).send('Access Denied: Admins Only');
        const orders = await Order.find().populate('userId', 'username email').sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
});

// Important: Serve static files correctly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));