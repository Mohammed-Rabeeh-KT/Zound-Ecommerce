import mongoose from 'mongoose';
const {Schema} = mongoose ; 


const brandSchema = new Schema({
    brandName : {
        type : String,
        required : true,
        trim : true,
        unique:true
    },
    logo : {
        type : String,
        required : true
    },
    isListed : {
        type : Boolean,
        default : true
    },
    
},{timestamps : true})



const Brand = mongoose.model('Brand',brandSchema);
export default Brand;


