import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    phone: {
        type: String,
        default: null,
    },

    googleId: {
        type: String,
        unique: true,
        sparse: true,  // This allows multiple null values
        default: undefined,
    },

    password: {
        type: String,
        required: false,
    },

    profile_picture: {
        type: String,
        default: null,
    },

    referralCode: {
        type: String,
        // unique: true,
        sparse: true,
        default: null,
    },

    redeemed: {
        type: Boolean
    },

    redeemedUsers: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String
        },
        searchedOn: {
            type: Date,
            default: Date.now
        }
    }],

    referredBy: {
        type: String,
        default: null,
    },

    referralCount: {
        type: Number,
        default: 0,
    },

    isVerified: {
        type: Boolean,
        default: false,
    },

    defaultAddress: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        default: null,
    },

    cart: {
        type: Schema.Types.ObjectId,
        ref: 'Cart'
    },

    wallet: {
        type: Number,
        default: 0
    },

    wishlist: {
        type: Schema.Types.ObjectId,
        ref: 'Wishlist'
    },

    orderHistory: {
        type: Schema.Types.ObjectId,
        ref: 'Order'
    },

    status: {
        type: String,
        default: 'active', // Example status
    },

    isBlocked: {
        type: Boolean,
        default: false,
    },

    isAdmin: {
        type: Boolean,
        default: false,
    },


},
    {
        timestamps: true, // auto adds createdAt & updatedAt
    })


const User = mongoose.model('User', userSchema);

export default User;
