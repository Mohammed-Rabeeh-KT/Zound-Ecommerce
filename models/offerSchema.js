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
            default: "percentage",
            required: true
        },
        apply_for: {
            type: String,
            enum: ["category", "product", "brand"],
            required: true
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            default: null
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            default: null
        },
        brandId: {
            type: Schema.Types.ObjectId,
            ref: 'Brand',
            default: null
        },

        starts_at: {
            type: Date,
            required: true
        },

        ends_at: {
            type: Date,
            required: true
        },

        min_purchase_amount: {
            type: Number,
            default: 0,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

offerSchema.index({ productId: 1 });
offerSchema.index({ categoryId: 1 });
offerSchema.index({ brandId: 1 });
offerSchema.index({ ends_at: 1 });
offerSchema.index({ starts_at: 1 });

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;
