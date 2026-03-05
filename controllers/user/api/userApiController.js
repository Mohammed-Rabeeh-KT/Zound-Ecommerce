import { catchAsync } from "../../../utils/catchAsync.js";
import { successResponse, STATUS } from "../../../utils/response.js";
import userService from "../../../services/user/userService.js";

// Send OTP to email
const sendEmailOtp = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const userId = req.user._id;

    await userService.sendEmailOtp(email, userId);

    res.json({ success: true, message: "OTP sent" });
});

// Verify email OTP
const verifyEmailOtp = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;

    await userService.verifyEmailOtp(email, otp);

    res.json({ success: true, message: "Email verified" });
});

// Update Profile Data
const updateProfile = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    await userService.updateProfileData(userId, req.body);

    res.json({ success: true, message: "Profile updated" });
});

// Change Password
const changePassword = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    await userService.changeUserPassword(userId, currentPassword, newPassword);

    res.json({ success: true, message: "Password changed successfully" });
});

// Upload Profile Picture
const uploadProfilePicture = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const imageUrl = await userService.updateProfilePicture(userId, req.file);

    res.json({
        success: true,
        message: "Profile picture updated successfully",
        imageUrl: imageUrl
    });
});

// Add Address
const addAddress = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const newAddress = await userService.addAddress(userId, req.body);

    res.json({
        success: true,
        message: 'Address added successfully',
        address: newAddress
    });
});

// Get single address by ID
const getAddress = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const addressId = req.params.id;

    const address = await userService.getAddressById(userId, addressId);

    res.json({
        success: true,
        data: address
    });
});

// Update Address
const updateAddress = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const addressId = req.params.id;

    const address = await userService.updateAddress(userId, addressId, req.body);

    res.json({
        success: true,
        message: 'Address updated successfully',
        address: address
    });
});

// Set default address
const setDefaultAddress = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const addressId = req.params.id;

    const address = await userService.setDefaultAddress(userId, addressId);

    res.json({
        success: true,
        message: 'Default address updated',
        address
    });
});

// Delete Address
const deleteAddress = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const addressId = req.params.id;

    await userService.deleteAddress(userId, addressId);

    res.json({
        success: true,
        message: 'Address deleted successfully'
    });
});

// Add Money to Wallet
const addMoneyToWallet = catchAsync(async (req, res, next) => {
    const { amount } = req.body;

    const order = await userService.addMoneyToWallet(amount);

    res.json({ success: true, order });
});

// Verify Wallet Payment
const verifyWalletPayment = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    await userService.verifyWalletPayment(userId, req.body);

    res.json({ success: true, message: 'Money added successfully' });
});

export default {
    sendEmailOtp,
    verifyEmailOtp,
    updateProfile,
    changePassword,
    uploadProfilePicture,
    addAddress,
    getAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    addMoneyToWallet,
    verifyWalletPayment
};
