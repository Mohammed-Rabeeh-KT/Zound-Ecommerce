import mongoose from 'mongoose';
const { Schema } = mongoose;

const productSchema = new Schema({

    productName: {
        type: String,
        required: true,
        trim: true,
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    brand_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Brand" 
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice : {
        type: Number,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
        default : 0
    },
    offerId: {
        type: Schema.Types.ObjectId,
        ref: 'Offers'
    },
    product_img : [{
        type : String
    }],
    isBestSeller : {
        type : Boolean,
        default : false
    },
    isLatest : {
        type : Boolean,
        default : false
    },
    description : {
        type : String,
    },
    variants : {
        type : Schema.Types.ObjectId,
        ref:'Variants'
    },
    isDeleted : {
        type : Boolean
    },
    reviews : {
        type : Schema.Types.ObjectId,
        ref : 'Reviews'
    },
    regularPrice : {
        type : Number
    },
    salePrice : {
        type : Number
    },
    productOffer : {
        type : Number ,
        default : 0,
    },
    status : {
        type : String ,
        enum : ["Available","out of stock","Discontinued"],
        required : true ,
        default : 'Available'
    }},
    {
        timestamps : true
    }

);


const Product = mongoose.model('Product',productSchema);

export default Product;