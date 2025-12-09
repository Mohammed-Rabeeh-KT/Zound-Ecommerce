import mongoose from 'mongoose';
const {Schema} = mongoose;

const categorySchema = new mongoose.Schema({
    name : {
        type : String,
        required : true ,
        unique : true,
        trim : true
    },
    description : {
        type : String,
        required : true
    },
    isListed : {
        type : Boolean ,
        default : true
    },
    // categoryOffer : {
    //     type : Number ,
    //     default : 0
    // }

    offer_id : {
            type : Schema.Types.ObjectId,
            ref : 'Offer'
        }
    
},{timestamps : true})


const Category = mongoose.model('Category',categorySchema)

export default Category;