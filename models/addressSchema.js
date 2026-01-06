import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    label: {
        type: String,
        enum: ['Home', 'Work', 'Other'],
        required: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    addressLine1: {
        type: String,
        required: true,
        trim: true
    },
    addressLine2: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        required: true
    },
    altPhone: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    pincode: {
        type: String,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Address = mongoose.model('Address', addressSchema);
export default Address;