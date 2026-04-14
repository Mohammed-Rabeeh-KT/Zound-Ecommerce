import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../../models/userSchema.js";
import WalletTransaction from "../../models/walletTransactionSchema.js";


//  OTP Utilities
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is ${otp}. It is valid for 2 minutes.`,
            html: `<b>Your OTP code is ${otp}. It is valid for 2 minutes.</b>`
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending OTP email:", error);
        return false;
    }
}

// Generate OTP + send email (used by signup, resend, forgot password)
async function generateAndSendOTP(email) {
    const otp = generateOTP();
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
        return { error: "Failed to send OTP. Please try again." };
    }

    return { otp };
}

// Verify OTP code (used by both signup and forgot password)
function verifyOTPCode(enteredOTP, sessionOTP) {
    return enteredOTP === sessionOTP;
}


//  Login
async function validateLoginInput(email, password) {
    const errors = {};

    if (!email || email.trim() === "") {
        errors.email = "Email is required.";
    } else {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            errors.email = "Please enter a valid email address";
        }
    }

    if (!password || password.trim() === "") {
        errors.password = "Password is required.";
    } else if (password.length < 8) {
        errors.password = "Password must be at least 8 characters long.";
    }

    return errors;
}

async function validateSignupInput(name, email, password) {
    const errors = {};

    // Name: 3-40 chars, letters, spaces, dots, hyphens, apostrophes
    if (!name || name.trim().length < 3) {
        errors.name = "Name must be at least 3 characters";
    } else if (name.trim().length > 40) {
        errors.name = "Name cannot exceed 40 characters";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) {
        errors.name = "Name can only contain letters, spaces, dots, hyphens, and apostrophes";
    }

    // Email: Standard robust format
    if (!email || email.trim() === "") {
        errors.email = "Email is required";
    } else {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            errors.email = "Please enter a valid email address";
        } else if (email.trim().length > 254) {
            errors.email = "Email is too long";
        }
    }

    // Password: 8+ chars, Upper + Lower + Number + Special
    if (!password || password.trim() === "") {
        errors.password = "Password is required";
    } else {
        if (password.length < 8) {
            errors.password = "Password must be at least 8 characters long";
        } else if (password.length > 30) {
            errors.password = "Password cannot exceed 30 characters";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password)) {
            errors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character";
        }
    }

    return errors;
}

async function authenticateUser(email, password) {
    const sanitizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
        return { error: "Invalid email or user doesn't exist.", status: 401 };
    }

    if (user.role !== "user") {
        return { error: "Invalid email or password", status: 401 };
    }

    if (user.isBlocked) {
        return { error: "Your account has been blocked.", status: 403 };
    }

    const validPassword = await bcrypt.compare(password.trim(), user.password);
    if (!validPassword) {
        return { error: "Invalid email or password.", status: 401 };
    }

    return {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isBlocked: user.isBlocked,
            wallet: user.wallet
        }
    };
}

// Generate JWT token + cookie options (used by login & Google auth)
function generateAuthToken(userId, options = {}) {
    const {
        expiresIn = "1d",
        secure = false,
        sameSite = null
    } = options;

    const token = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn }
    );

    const cookieOptions = {
        httpOnly: true,
        maxAge: expiresIn === "7d" ? 7 * 24 * 60 * 60 * 1000 : null
    };

    if (secure) cookieOptions.secure = true;
    if (sameSite) cookieOptions.sameSite = sameSite;

    return { token, cookieOptions };
}


//  Signup
async function checkExistingUser(email) {
    return await User.findOne({ email: email.trim().toLowerCase() });
}

async function validateReferralCode(referralCode) {
    if (!referralCode) return { valid: true };

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
        return { valid: false, error: "Invalid Referral Code" };
    }
    return { valid: true, referrer };
}


//  Verify OTP (Signup)
function validateOTPSession(session) {
    if (!session.userOTP || !session.otpTimestamp) {
        return { error: "OTP session expired. Please signup again.", status: 400 };
    }

    const otpAge = Date.now() - session.otpTimestamp;
    if (otpAge > 120000) {
        return { error: "OTP has expired. Please signup again.", status: 400, expired: true };
    }

    return { valid: true };
}


async function createUserFromSession(sessionData, referredByCode) {
    const hashedPassword = await bcrypt.hash(sessionData.password, 10);

    // Generate unique referral code
    const generateReferralCode = () =>
        "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();

    let referralCode = generateReferralCode();
    while (await User.findOne({ referralCode })) {
        referralCode = generateReferralCode();
    }

    const userData = new User({
        name: sessionData.name,
        email: sessionData.email,
        password: hashedPassword,
        referralCode
    });

    // Handle referral rewards
    if (referredByCode) {
        const referrer = await User.findOne({ referralCode: referredByCode });
        if (referrer) {
            userData.referredBy = referrer.referralCode;

            const ReferralConfig = (await import("../../models/referralConfigSchema.js")).default;
            const config = await ReferralConfig.findOne({ status: "active" });

            // Credit referee (new user)
            if (config && config.refereeReward > 0) {
                userData.wallet = config.refereeReward;
            }

            // Save the new user first so we have a userId for wallet transactions
            await userData.save();

            // Record referee wallet transaction
            if (config && config.refereeReward > 0) {
                await WalletTransaction.create({
                    userId: userData._id,
                    amount: config.refereeReward,
                    type: "Credit",
                    description: "Referral Bonus (Signup)",
                    date: new Date()
                });
            }

            // Credit referrer (inviter)
            if (config && config.referrerReward > 0) {
                referrer.wallet += config.referrerReward;
                await referrer.save();

                // Record referrer wallet transaction
                await WalletTransaction.create({
                    userId: referrer._id,
                    amount: config.referrerReward,
                    type: "Credit",
                    description: `Referral Bonus (Referred: ${sessionData.name})`,
                    date: new Date()
                });
            }

            userData.redeemed = true;
        }
    }

    await userData.save();
    return userData;
}


//  Forgot Password
async function findUserByEmail(email) {
    if (!email || email.trim() === "") {
        return { error: "Email is required" };
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
        return { error: "User not found" };
    }

    if (user.isBlocked) {
        return { error: "This account has been blocked. Please contact support." };
    }

    return { user };
}

function validateFpOTPSession(session) {
    if (!session.fpOTP || !session.fpTimestamp) {
        return { error: "Session expired. Please try again.", status: 400 };
    }

    const otpAge = Date.now() - session.fpTimestamp;
    if (otpAge > 120000) {
        return { error: "OTP has expired. Please try again.", status: 400, expired: true };
    }

    return { valid: true };
}


//  Reset Password
async function resetUserPassword(email, newPassword) {
    const user = await User.findOne({ email });

    if (!user) {
        return { error: "User not found." };
    }

    const isSameOld = await bcrypt.compare(newPassword, user.password);
    if (isSameOld) {
        return { error: "New password cannot be the same as old password." };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
        { email },
        { $set: { password: hashed } }
    );
    return { success: true };
}


//  Check Email
async function checkEmailExists(email) {
    if (!email || email.trim() === "") {
        return { exists: false };
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    return {
        exists: !!user,
        message: user ? "Email already exists" : "Email available"
    };
}


export default {
    generateOTP,
    sendOTPEmail,
    generateAndSendOTP,
    verifyOTPCode,
    validateLoginInput,
    validateSignupInput,
    authenticateUser,
    generateAuthToken,
    checkExistingUser,
    validateReferralCode,
    validateOTPSession,
    createUserFromSession,
    findUserByEmail,
    validateFpOTPSession,
    resetUserPassword,
    checkEmailExists
}
