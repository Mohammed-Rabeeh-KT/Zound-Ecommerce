import mongoose from "mongoose";
const { Schema } = mongoose;

const bannerSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    subtitle: {
        type: String,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    image: {
        type: String,
        required: true
    },

    product: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },

    buttonText: {
        type: String,
        default: "Shop Now"
    },

    buttonLink: {
        type: String
    },

    isActive: {
        type: Boolean,
        default: true
    },

    order: {
        type: Number,
        default: 0
    },

    startDate: {
        type: Date,
        default: Date.now
    },

    endDate: {
        type: Date
    }

}, { timestamps: true });

export default mongoose.model("Banner", bannerSchema);