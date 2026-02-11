const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [
        {
            title: String,
            price: Number,
            quantity: Number
        }
    ],
    total: Number,
    status: { type: String, default: 'Pending' }, // Pending, Paid
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);