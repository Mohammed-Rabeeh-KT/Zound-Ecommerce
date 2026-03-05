import mongoose from 'mongoose';
const { Schema } = mongoose;

const referralConfigSchema = new Schema({
    referrerReward: {
        type: Number,
        required: true,
        default: 100
    },
    refereeReward: {
        type: Number,
        required: true,
        default: 50
    },
    description: {
        type: String,
        default: 'Invite your friends and earn rewards!'
    },
    status: {
        type: String,
        enum: ['active', 'paused'],
        default: 'active'
    }
}, {
    timestamps: true
});

const ReferralConfig = mongoose.model('ReferralConfig', referralConfigSchema);

export default ReferralConfig;
