import mongoose from 'mongoose';
const { Schema } = mongoose;
import {
    ALL_ORDER_STATUSES, ORDER_STATUS,
    ALL_ITEM_STATUSES, ITEM_STATUS,
    ALL_PAYMENT_METHODS, PAYMENT_METHOD,
    ALL_PAYMENT_STATUSES, PAYMENT_STATUS,
} from '../utils/orderConstants.js';

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
        discountAllocated: {
            type: Number,
            default: 0
        },
        itemStatus: {
            type: String,
            enum: ALL_ITEM_STATUSES,
            default: ITEM_STATUS.ACTIVE
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
        enum: ALL_ORDER_STATUSES,
        default: ORDER_STATUS.PENDING
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ALL_PAYMENT_METHODS,
        default: PAYMENT_METHOD.COD
    },
    paymentStatus: {
        type: String,
        enum: ALL_PAYMENT_STATUSES,
        default: PAYMENT_STATUS.PENDING
    },
    paymentId: {
        type: String,
        default: null
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    paymentError: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;