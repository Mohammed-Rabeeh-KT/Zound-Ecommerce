import User from '../../models/userSchema.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS, MESSAGE } from "../../utils/response.js";


//  const loadAdminLogin = async (req, res) => {
//     try {

//         if(req.session.admin){
//             return res.redirect('/admin/dashboard');
//         }
//         res.render('admin/adminLogin', {
//             layout: 'adminLayout',
//             title: 'Admin Login',
//             message: null,
//             errors: {} 
//         });
//     } catch (error) {
//         console.log(error.message);
//     }
// }

const loadAdminLogin = catchAsync(async (req, res, next) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }

    res.render('admin/adminLogin', {
        layout: 'adminLayout',
        title: 'Admin Login',
        message: null,
        errors: {}
    })
})


const loginAdmin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Backend Validation

    if (!email || !password) {
        return res.render('admin/adminLogin', {
            layout: 'adminLayout',
            title: 'Admin Login',
            message: 'All fields are required',
            showError: true
        })
    }

    const admin = await User.findOne({ email });

    if (!admin) {
        return res.render("admin/adminLogin", {
            layout: "adminLayout",
            message: "Invalid email or password",
            showError: true
        });
    }


    if (admin.role !== 'admin') {
        return res.render("admin/adminLogin", {
            layout: "adminLayout",
            message: "Access denied. Not an admin.",
            showError: true
        });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        return res.render("admin/adminLogin", {
            layout: "adminLayout",
            message: "Invalid email or password",
            showError: true
        });
    }


    // if SUCCESS → Create admin session
    req.session.admin = {
        id: admin._id,
        email: admin.email,
        role: admin.role,
    };

    return res.render("admin/adminLogin", {
        layout: "adminLayout",
        successMessage: "Login successful!",
        redirectTo: "/admin/dashboard"
    });

})


const logoutAdmin = catchAsync(async (req, res, next) => {
    req.session.admin = null;
    req.session.destroy(() => {
        res.redirect('/admin/login');
    })
})

export default {
    loadAdminLogin,
    loginAdmin,
    logoutAdmin
}   