import passport from "passport";
import { catchAsync } from "../../../utils/catchAsync.js";
import authService from "../../../services/user/authService.js";


//  Page Loaders (SSR)


const loadLogin = catchAsync(async (req, res, next) => {
    // Redirect authenticated users away from login
    if (req.user) {
        return res.redirect('/user/home');
    }
    return res.render("user/login", {
        layout: "layout",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0,
        message: null,
        errors: {}
    });
});

const loadSignup = (req, res) => {
    // Redirect authenticated users away from signup
    if (req.user) {
        return res.redirect('/user/home');
    }
    const referralCode = req.query.ref || '';
    res.render("user/signup", {
        layout: "layout",
        message: null,
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0,
        referralCode
    });
};

const loadVerifyOTP = catchAsync(async (req, res) => {
    console.log(req.session.userData);
    if (!req.session.userData) {
        return res.redirect('/user/signup');
    }
    res.render("user/verify-otp", {
        layout: "layout",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0,
        errorMessage: null
    });
});

const loadForgotPassword = catchAsync(async (req, res, next) => {
    return res.render('user/forgot-password', {
        layout: "layout",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0
    });
});

const loadFpVerifyOTP = catchAsync(async (req, res, next) => {
    if (!req.session.fpOTP) {
        return res.redirect('/user/forgot-password');
    }
    res.render('user/fp-verify-otp', {
        layout: "layout",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0,
        errorMessage: null
    });
});

const loadResetPassword = catchAsync(async (req, res, next) => {
    if (!req.session.fpVerified || !req.session.fpEmail) {
        return res.redirect('/user/forgot-password');
    }
    res.render('user/fp-reset-password', {
        layout: "layout",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0,
    });
});


//  Forgot Password (SSR POST)

const forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

        const result = await authService.findUserByEmail(email);

        if (result.error) {
            return res.render('user/forgot-password', {
                layout: "layout",
                message: result.error,
                user: req.user || null,
                cartCount: req.session?.cart?.length || 0,
                errors: { email: result.error }
            });
        }

        const sendResult = await authService.generateAndSendOTP(email);

        if (sendResult.error) {
            return res.render('user/forgot-password', {
                layout: "layout",
                message: sendResult.error,
                user: req.user || null,
                cartCount: req.session?.cart?.length || 0
            });
        }

        const otp = sendResult.otp;
        console.log("Generated FP OTP:", otp);

        // Store in session
        req.session.fpOTP = otp;
        req.session.fpEmail = email;
        req.session.fpTimestamp = Date.now();
        res.redirect('/user/fp-verify-otp');
});


// ============================
//  Logout
// ============================

const logout = (req, res) => {
    res.clearCookie("authToken");

        // If Passport session exists, destroy it safely
        if (req.isAuthenticated && req.isAuthenticated()) {
            req.logout(err => {
                if (err) {
                    console.error("Passport logout error:", err);
                }
            });
        }

        // Destroy express-session if it exists
        if (req.session) {
            req.session.destroy(err => {
                if (err)
                    console.error("Session destroy error:", err);

                return res.redirect("/user/home");
            });
        } else {
            return res.redirect("/user/home");
        }
};


const googleLogin = (req, res, next) => {
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })(req, res, next);
};


const googleCallback = (req, res, next) => {
    passport.authenticate(
        "google",
        { failureRedirect: "/user/login", session: true },
        async (err, user) => {
            if (err || !user) {
                    console.error("Google Auth Error:", err);
                    return res.redirect("/user/login");
                }

                const { token, cookieOptions } = authService.generateAuthToken(user._id, {
                    expiresIn: "7d",
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax"
                });
                res.cookie("authToken", token, cookieOptions);
                return res.redirect("/user/home");
        }
    )(req, res, next);
};


export default {
    loadLogin,
    loadSignup,
    logout,
    googleLogin,
    googleCallback,
    loadVerifyOTP,
    loadForgotPassword,
    forgotPassword,
    loadFpVerifyOTP,
    loadResetPassword,
}