const mongoose = require('mongoose');
const {Schema} = mongoose ; 


const brandSchema = new Schema({
    brandName : {
        type : String,
        required : true
    },
    logo : {
        type : [String],
        required : true
    },
    isActive : {
        type : Boolean,
        default : true
    }
},{timestamps : true})



const Brand = mongoose.model('Brand',brandSchema);
module.exports = Brand;


