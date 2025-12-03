import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: [{
        addressType: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        city:{
            type: String,
        },
        landMark : {
            type : String,
        },
        state:{
            type: String,
        },  
        pincode:{
            type: Number,
            required: true
        }, 
        phone:{
            type: String,
            required: true
        },
        alt_phone:{
            type: String,
        }

    }]
});



const Address = mongoose.model('Address', addressSchema);
export default Address;