import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import WalletTransaction from "../../models/walletTransactionSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS, MESSAGE } from "../../utils/response.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import razorpay from '../../config/razorpay.js';

const otpStore = {};

const getProfileData = async (userId) => {
    const userData = await User.findById(userId);
    if (!userData) {
        throw new AppError(MESSAGE.NOT_FOUND || "User not found", STATUS.NOT_FOUND);
    }

    let referralCount = 0;
    if (userData.referralCode) {
        referralCount = await User.countDocuments({ referredBy: userData.referralCode });
    }

    const userObj = userData.toObject();
    userObj.referralCount = referralCount;

    return userObj;
};

const sendEmailOtp = async (email, userId) => {
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
        throw new AppError("Email already in use", STATUS.BAD_REQUEST);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    console.log(`----------------------------`);
    console.log(`OTP for ${email}: ${otp}`);
    console.log(`----------------------------`);

    otpStore[email] = {
        otp,
        expiresAt: Date.now() + 2 * 60 * 1000
    };

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    });

    await transporter.sendMail({
        from: '"ZOUND Security" <no-reply@zound.com>',
        to: email,
        subject: 'Verify your new email',
        text: `Your OTP for email change is: ${otp}`
    });

    return true;
};

const verifyEmailOtp = async (userId, email, otp) => {
    const record = otpStore[email];

    if (!record) {
        throw new AppError("No OTP request found for this email", STATUS.BAD_REQUEST);
    }

    if (record.expiresAt < Date.now()) {
        throw new AppError("OTP has expired. Please request a new one.", STATUS.BAD_REQUEST);
    }

    if (parseInt(otp) !== record.otp) {
        throw new AppError("Incorrect OTP", STATUS.BAD_REQUEST);
    }

    // OTP Valid - Update User Email Directly
    delete otpStore[email]; // Clear OTP

    await User.findByIdAndUpdate(userId, { email: email.trim() });

    return true;
};

const updateProfileData = async (userId, data) => {
    const { name, phone, email } = data;

    // Server-side validation patterns
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Validate name
    if (!name || !name.trim()) {
        throw new AppError('Name is required', STATUS.BAD_REQUEST);
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
        throw new AppError('Name must be between 2 and 50 characters', STATUS.BAD_REQUEST);
    }

    if (!nameRegex.test(trimmedName)) {
        throw new AppError('Name should only contain letters and spaces', STATUS.BAD_REQUEST);
    }

    // Validate phone (optional but if provided, must be valid)
    if (phone && phone.trim()) {
        const cleanPhone = phone.trim().replace(/[\s\-]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            throw new AppError('Please enter a valid 10-digit Indian phone number', STATUS.BAD_REQUEST);
        }
    }

    // Validate email
    if (email && email.trim()) {
        if (!emailRegex.test(email.trim())) {
            throw new AppError('Please enter a valid email address', STATUS.BAD_REQUEST);
        }

        // Check if email is already used by another user
        const existingUser = await User.findOne({
            email: email.trim(),
            _id: { $ne: userId }
        });
        if (existingUser) {
            throw new AppError('This email is already in use by another account', STATUS.BAD_REQUEST);
        }
    }

    const updateData = {
        name: trimmedName,
        phone: phone ? phone.trim() : ''
    };

    await User.findByIdAndUpdate(userId, updateData);
    return true;
};

const changeUserPassword = async (userId, currentPassword, newPassword) => {
    // Input validation
    if (!currentPassword || !newPassword) {
        throw new AppError("Current password and new password are required", STATUS.BAD_REQUEST);
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
        throw new AppError("User not found", STATUS.NOT_FOUND);
    }

    // Check if user has a password (might be Google OAuth user)
    if (!user.password) {
        throw new AppError("Password change not available for social login accounts", STATUS.BAD_REQUEST);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
        throw new AppError("Current password is incorrect", STATUS.BAD_REQUEST);
    }

    // Validate new password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new AppError("New password must be at least 8 characters with uppercase, lowercase, and number", STATUS.BAD_REQUEST);
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw new AppError("New password must be different from current password", STATUS.BAD_REQUEST);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    return true;
};

const updateProfilePicture = async (userId, file) => {
    if (!file) {
        throw new AppError("No image file provided", STATUS.BAD_REQUEST);
    }

    // Get current user to check for existing profile picture
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found", STATUS.NOT_FOUND);
    }

    const imageUrl = file.path;

    await User.findByIdAndUpdate(userId, { profile_picture: imageUrl });

    return imageUrl;
};

const getAddresses = async (userId) => {
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
    return addresses;
};

const addAddress = async (userId, data) => {
    const { label, fullName, addressLine1, addressLine2, phone, altPhone, city, state, pincode } = data;

    // Validate required fields
    if (!label || !fullName || !addressLine1 || !phone || !city || !state || !pincode) {
        throw new AppError('Please fill all required fields', STATUS.BAD_REQUEST);
    }

    // Validate alternate phone
    if (altPhone && phone === altPhone) {
        throw new AppError('Alternative phone must be different from primary phone', STATUS.BAD_REQUEST);
    }

    // Check if this is the first address (make it default)
    const existingCount = await Address.countDocuments({ userId });
    const isDefault = existingCount === 0;

    const newAddress = new Address({
        userId,
        label,
        fullName,
        addressLine1,
        addressLine2: addressLine2 || '',
        phone,
        altPhone: altPhone || '',
        city,
        state,
        pincode,
        isDefault
    });

    await newAddress.save();
    return newAddress;
};

const getAddressById = async (userId, addressId) => {
    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
        throw new AppError('Address not found', STATUS.NOT_FOUND);
    }

    return address;
};

const updateAddress = async (userId, addressId, updatedAddress) => {
    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
        throw new AppError('Address not found', STATUS.NOT_FOUND);
    }

    // Validate alternate phone for update
    const finalPhone = updatedAddress.phone || address.phone;
    // Use property access for altPhone since it could be an empty string which is falsy but valid update
    const finalAltPhone = typeof updatedAddress.altPhone !== 'undefined' ? updatedAddress.altPhone : address.altPhone;

    if (finalAltPhone && finalPhone === finalAltPhone) {
        throw new AppError('Alternative phone must be different from primary phone', STATUS.BAD_REQUEST);
    }

    Object.assign(address, updatedAddress);
    await address.save();
    return address;
};

const setDefaultAddress = async (userId, addressId) => {
    // First, unset all existing defaults for this user
    await Address.updateMany({ userId }, { isDefault: false });

    // Set the new default
    const address = await Address.findOneAndUpdate(
        { _id: addressId, userId },
        { isDefault: true },
        { new: true }
    );

    if (!address) {
        throw new AppError('Address not found', STATUS.NOT_FOUND);
    }

    return address;
};

const deleteAddress = async (userId, addressId) => {
    // Find address first to check if it's default
    const addressToCheck = await Address.findOne({ _id: addressId, userId });

    if (!addressToCheck) {
        throw new AppError('Address not found', STATUS.NOT_FOUND);
    }

    if (addressToCheck.isDefault) {
        throw new AppError('Cannot delete the default address. Please set another address as default first.', STATUS.BAD_REQUEST);
    }

    await Address.findByIdAndDelete(addressId);
    return true;
};

// =====================================================
// WALLET (using separate WalletTransaction collection)
// =====================================================
const getWalletData = async (userId, page = 1, limit = 10) => {
    const user = await User.findById(userId);

    const skip = (page - 1) * limit;

    // Fetch wallet history from the separate WalletTransaction collection
    const totalItems = await WalletTransaction.countDocuments({ userId });
    const totalPages = Math.ceil(totalItems / limit);

    const walletHistory = await WalletTransaction.find({ userId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);

    return { 
        user, 
        walletHistory,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

const addMoneyToWallet = async (amount) => {
    if (!amount || amount <= 0) {
        throw new AppError('Invalid amount', STATUS.BAD_REQUEST);
    }

    const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `wlt_${Date.now()}`
    });

    return order;
};

const verifyWalletPayment = async (userId, data) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = data;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        throw new AppError('Payment verification failed', STATUS.BAD_REQUEST);
    }

    // Get amount from order
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amount = order.amount / 100;

    // Credit wallet balance
    await User.findByIdAndUpdate(userId, {
        $inc: { wallet: amount }
    });

    // Record transaction in WalletTransaction collection
    await WalletTransaction.create({
        userId,
        amount,
        type: 'Credit',
        description: 'Money added via Razorpay',
        date: new Date()
    });

    return true;
};

// =====================================================
// REFERRALS (using separate WalletTransaction collection)
// =====================================================
const getReferralPageData = async (userId) => {
    const user = await User.findById(userId);

    if (!user.referralCode) {
        user.referralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await user.save();
    }

    // Find Referred Users
    const refereesRaw = await User.find({ referredBy: user.referralCode })
        .select('name createdAt redeemed')
        .sort({ createdAt: -1 })
        .lean();

    // Fetch referral-related wallet transactions from WalletTransaction collection
    const referralTransactions = await WalletTransaction.find({
        userId,
        description: { $regex: /Referral Bonus/i }
    }).lean();

    // For each referee, find the actual reward amount from wallet transactions
    // The wallet transaction description format is "Referral Bonus (Referred: <refereeName>)"
    const referees = refereesRaw.map(referee => {
        // Find the matching wallet transaction for this referee
        const matchingTransaction = referralTransactions.find(t =>
            t.description &&
            t.description.includes('Referral Bonus') &&
            t.description.includes(referee.name)
        );

        return {
            ...referee,
            rewardAmount: matchingTransaction ? matchingTransaction.amount : 0
        };
    });

    // Calculate Stats
    const totalReferrals = referees.length;
    const successfulReferrals = referees.filter(r => r.redeemed).length;
    const pendingReferrals = totalReferrals - successfulReferrals;

    // Calculate Total Earned from wallet transactions
    const referralEarnings = referralTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Get Referral Config (for "How It Works" section display)
    const ReferralConfig = (await import("../../models/referralConfigSchema.js")).default;
    const config = await ReferralConfig.findOne({ status: 'active' }) || { referrerReward: 0, refereeReward: 0 };

    return {
        user: user.toObject(),
        referralCode: user.referralCode,
        stats: {
            total: totalReferrals,
            successful: successfulReferrals,
            pending: pendingReferrals,
            earned: referralEarnings
        },
        referees: referees,
        config: config
    };
};

export default {
    getProfileData,
    sendEmailOtp,
    verifyEmailOtp,
    updateProfileData,
    changeUserPassword,
    updateProfilePicture,
    getAddresses,
    addAddress,
    getAddressById,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    getWalletData,
    addMoneyToWallet,
    verifyWalletPayment,
    getReferralPageData
};
