import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean,
        default: true
    },
    // categoryOffer : {
    //     type : Number ,
    //     default : 0
    // }

    offer_id: {
        type: Schema.Types.ObjectId,
        ref: 'Offer'
    }

}, { timestamps: true })

categorySchema.pre('save', async function(next) {
    if (this.name && (this.isModified('name') || !this.slug)) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            trim: true
        });
    }
    // next();
});

const Category = mongoose.model('Category', categorySchema)

export default Category;