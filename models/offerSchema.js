import mongoose from "mongoose";
const { Schema } = mongoose;

const offerSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        discount_value: {
            type: Number,
            required: true,
            min: 0
        },

        discount_type: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true
        },

        valid: {
            type: Date,
            required: true
        },

        apply_for: {
            type: String,
            enum: ["category", "product"],
            required: true
        },

        starts_at: {
            type: Date,
            required: true
        },

        ends_at: {
            type: Date,
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;
