import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;


const brandSchema = new Schema({
    brandName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    logo: {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean,
        default: true
    },

}, { timestamps: true })



const Brand = mongoose.model('Brand', brandSchema);
export default Brand;


brandSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { 
            lower: true,   
            strict: true,  // strip special characters except replacement
            trim: true     
        });
    }
    next();
});