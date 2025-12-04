import User from '../../models/userSchema.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

 const loadAdminLogin = async (req, res) => {
    try {

        if(req.session.admin){
            return res.redirect('/admin/dashboard');
        }
        res.render('admin/adminLogin', {
            layout: 'adminLayout',
            title: 'Admin Login',
            message: null,
            errors: {} 
        });
    } catch (error) {
        console.log(error.message);
    }
}


export default {
    loadAdminLogin
}





