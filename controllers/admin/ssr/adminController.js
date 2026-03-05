import AppError from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import adminAuthService from "../../../services/admin/adminAuthService.js";


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

    const result = await adminAuthService.authenticateAdmin(email, password);

    if (result.error) {
        return res.render("admin/adminLogin", {
            layout: "adminLayout",
            title: 'Admin Login',
            message: result.error,
            showError: true
        });
    }

    // if SUCCESS → Create admin session
    req.session.admin = result.admin;

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
