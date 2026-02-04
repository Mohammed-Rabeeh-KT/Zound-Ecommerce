import mongoose from 'mongoose';
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const dateCode = `${year}${month}${day}`;
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 4; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return `ZND-${dateCode}-${code}`;
        },
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variantId: {
            type: Schema.Types.ObjectId,
            default: null
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        itemStatus: {
            type: String,
            enum: ['Active', 'Cancelled',  'Return Requested', 'Returned', 'Return Rejected' , 'Delivered'],
            default: 'Active'
        },
        cancelReason: {
            type: String,
            default: null
        },
        returnReason: {
            type: String,
            default: null
        },
        returnRejectReason: {
            type: String,
            default: null
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
        default: 'Pending'
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Razorpay', 'Wallet'],
        default: 'COD'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;