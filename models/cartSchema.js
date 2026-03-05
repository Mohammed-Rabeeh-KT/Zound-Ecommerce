import mongoose from 'mongoose';
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
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
            default: 1,
            min: 1,
            max: 10
        },
        price: {
            type: Number,
            required: true
        }
    }]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;