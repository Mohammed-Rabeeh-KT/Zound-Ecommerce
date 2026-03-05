import mongoose from 'mongoose';
const { Schema } = mongoose;

const walletTransactionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for fast lookup of a user's history
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['Credit', 'Debit'],
        required: true
    },
    description: {
        type: String,
        default: 'Transaction'
    },
    orderId: { // Optional: Link transaction to a specific order if applicable
        type: Schema.Types.ObjectId,
        ref: 'Order'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

export default WalletTransaction;
