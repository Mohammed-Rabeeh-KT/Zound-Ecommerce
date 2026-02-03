import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand",
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    productImages: [{
        type: String,
        required: true
    }],
    features: [{
        type: String
    }],
    variants: [{
        type: { type: String, default: 'Color' },
        value: { type: String },
        images: [String],
        color: { type: String },
        size: { type: String },
        basePrice: { type: Number, required: true },
        salePrice: { type: Number, required: true },
        stock: { type: Number, required: true, default: 0 },
        sku: { type: String },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        }
    }],
    isBestSeller: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, {
    timestamps: true
});

productSchema.pre('save', function (next) {
    if (this.isModified('productName')) {
        this.slug = slugify(this.productName, {
            lower: true,
            strict: true,
            trim: true
        });
    }
    // next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;

