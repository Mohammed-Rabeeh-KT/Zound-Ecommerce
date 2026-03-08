import { catchAsync } from "../../../utils/catchAsync.js";
import authService from "../../../services/user/authService.js";


const login = catchAsync(async (req, res, next) => {
    const { email, password, remember } = req.body;

    // Validate input
    const errors = await authService.validateLoginInput(email, password);
    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            message: Object.values(errors)[0]
        });
    }

    // Authenticate
    const result = await authService.authenticateUser(email, password);
    if (result.error) {
        return res.status(result.status).json({
            success: false,
            message: result.error
        });
    }

    const { token, cookieOptions } = authService.generateAuthToken(result.user._id, {
        expiresIn: remember ? "7d" : "1d"
    });
    res.cookie("authToken", token, cookieOptions);

    res.json({
        success: true,
        redirectUrl: "/user/home"
    });
});



const signup = catchAsync(async (req, res, next) => {
    const { name, email, password, confirmPassword, referralCode } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "Passwords do not match"
        });
    }

    const existingUser = await authService.checkExistingUser(email);
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: "Email already exists"
        });
    }

    // Validate referral code
    const referralResult = await authService.validateReferralCode(referralCode);
    if (!referralResult.valid) {
        return res.status(400).json({
            success: false,
            message: referralResult.error
        });
    }
    if (referralCode) {
        req.session.referredByCode = referralCode;
    }
    const sendResult = await authService.generateAndSendOTP(email);
    if (sendResult.error) {
        return res.status(500).json({
            success: false,
            message: sendResult.error
        });
    }

    const otp = sendResult.otp;
    console.log("Generated OTP:", otp);

    // Store in session
    req.session.userOTP = otp;
    req.session.otpTimestamp = Date.now();
    req.session.otpAttempts = 0;
    req.session.userData = { name, email, password };

    console.log("OTP sent to email:", otp);

    return res.json({
        success: true,
        message: "OTP sent to your email!",
        redirectUrl: "/user/verify-otp"
    });
});


//  Verify OTP (Signup)

const verifyOTP = catchAsync(async (req, res, next) => {
    const { otp } = req.body;
    const enteredOTP = Array.isArray(otp) ? otp.join("") : otp;

    console.log("Entered OTP:", enteredOTP);
    console.log("session otp:", req.session.userOTP);

    // Validate session
    const sessionCheck = authService.validateOTPSession(req.session);
    if (sessionCheck.error) {
        if (sessionCheck.expired) {
            delete req.session.userOTP;
            delete req.session.otpTimestamp;
            delete req.session.userData;
            delete req.session.otpAttempts;
        }
        return res.status(sessionCheck.status).json({
            success: false,
            message: sessionCheck.error,
            expired: sessionCheck.expired || false
        });
    }

    // Verify code
    if (!authService.verifyOTPCode(enteredOTP, req.session.userOTP)) {
        return res.status(400).json({
            success: false,
            message: "The OTP you entered is incorrect."
        });
    }

    // Create user
    await authService.createUserFromSession(req.session.userData, req.session.referredByCode);

    // Clear session
    delete req.session.userOTP;
    delete req.session.otpTimestamp;
    delete req.session.userData;
    delete req.session.otpAttempts;
    delete req.session.referredByCode;

    return res.json({
        success: true,
        redirectUrl: "/user/login",
        message: "Signup successful!"
    });
});


//  Resend OTP (Signup)

const resendOTP = catchAsync(async (req, res, next) => {
    if (!req.session.userData) {
        return res.status(400).json({
            success: false,
            message: "Session expired. Please signup again."
        });
    }

    if ((req.session.otpAttempts || 0) >= 3) {
        return res.status(429).json({
            success: false,
            message: "Too many resend attempts. Please signup again."
        });
    }

    const result = await authService.generateAndSendOTP(req.session.userData.email);
    if (result.error) {
        console.error("Failed to resend OTP email");
        return res.status(500).json({
            success: false,
            message: result.error
        });
    }

    console.log("Resent OTP:", result.otp);

    // Update session
    req.session.userOTP = result.otp;
    req.session.otpTimestamp = Date.now();
    req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;

    return res.json({
        success: true,
        message: "OTP has been resent to your email.",
        attemptsLeft: 3 - req.session.otpAttempts
    });
});



const verifyFpOTP = catchAsync(async (req, res) => {
    const { otp } = req.body;
    const enteredOTP = Array.isArray(otp) ? otp.join("") : otp;

    const sessionCheck = authService.validateFpOTPSession(req.session);
    if (sessionCheck.error) {
        return res.status(sessionCheck.status).json({
            success: false,
            message: sessionCheck.error
        });
    }

    if (!authService.verifyOTPCode(enteredOTP, req.session.fpOTP)) {
        return res.status(400).json({
            success: false,
            message: "Invalid OTP"
        });
    }

    req.session.fpVerified = true;
    delete req.session.fpOTP;

    return res.json({
        success: true,
        redirectUrl: "/user/fp-reset-password"
    });
});

const resetPassword = catchAsync(async (req, res, next) => {
    const { password, confirmPassword } = req.body;

    if (!req.session.fpVerified || !req.session.fpEmail) {
        return res.json({
            success: false,
            message: "Session expired. Please try again."
        });
    }

    if (password !== confirmPassword) {
        return res.json({
            success: false,
            message: "Passwords do not match."
        });
    }

    const result = await authService.resetUserPassword(req.session.fpEmail, password);
    if (result.error) {
        return res.json({
            success: false,
            message: result.error
        });
    }

    delete req.session.fpEmail;
    delete req.session.fpVerified;

    return res.json({
        success: true,
        message: "Password reset successfully!",
        redirectUrl: "/user/login"
    });
});

const resendFpOTP = catchAsync(async (req, res, next) => {
    if (!req.session.fpEmail) {
        return res.status(400).json({
            success: false,
            message: "Session expired. Please try again."
        });
    }

    const result = await authService.generateAndSendOTP(req.session.fpEmail);
    if (result.error) {
        return res.status(500).json({
            success: false,
            message: result.error
        });
    }

    req.session.fpOTP = result.otp;
    req.session.fpTimestamp = Date.now();

    return res.json({
        success: true,
        message: "OTP has been resent to your email."
    });
});

const checkEmail = catchAsync(async (req, res, next) => {
    const { email } = req.query;

    const result = await authService.checkEmailExists(email);

    return res.json({
        exists: result.exists,
        message: result.message || ""
    });
});


export default {
    login,
    signup,
    verifyOTP,
    resendOTP,
    verifyFpOTP,
    resetPassword,
    resendFpOTP,
    checkEmail
};
