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

brandSchema.pre('save', function (next) {
  if (this.isModified('brandName')) {
    this.slug = slugify(this.brandName, {
      lower: true,
      strict: true,
      trim: true
    });
  }
//   next();
});


const Brand = mongoose.model('Brand', brandSchema);
export default Brand;

