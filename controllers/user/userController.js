import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import Address from "../../models/addressSchema.js";
import offerController from "../admin/offerManagementController.js";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { STATUS, MESSAGE } from "../../utils/response.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import razorpay from '../../config/razorpay.js';
import crypto from 'crypto'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const pageNotFound = catchAsync(async (req, res, next) => {
  return res.render('page-404');
});

const getCategoryImage = (catName) => {
  const map = {
    "Headphones": "/images/cat/headphones.png",
    "IEMs": "/images/cat/iems.png",
    "Speaker": "/images/cat/speaker.png",
    "DACs": "/images/cat/dacs.png",
    "Earphones": "/images/cat/earphones.png",
    "Earbuds": "/images/cat/earbuds.png",
    "Hi-Fi Speakers": "/images/cat/hifi-speakers.png",
    "Music Players": "/images/cat/music-players.png",
    "Turntables": "/images/cat/turntables.png",
    "Studio Gear": "/images/cat/studio-gear.png",
    "Wireless Audio": "/images/cat/wireless-audio.png",
    "Accessories": "/images/cat/accessories.png",
    "Gaming Audio": "/images/cat/gaming-audio.png "
  };
  return map[catName] || "/images/cat/accessories.png"; // Default
};


const loadHomepage = catchAsync(async (req, res, next) => {
  // 1. Fetch Categories
  const categoryData = await Category.find({ isListed: true });
  const categories = categoryData.map(c => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    image: getCategoryImage(c.name)
  }));

  // 2. Fetch Latest Products (New Arrivals)
  const latestProducts = await Product.find({ isDeleted: false, status: 'Active' })
    .populate('category')
    .populate('brand')
    .sort({ createdAt: -1 })
    .limit(8);

  // 3. Fetch Top Selling Products (Using isBestSeller flag or fallback to most viewed/stock)
  let topProducts = await Product.find({ isDeleted: false, status: 'Active', isBestSeller: true })
    .populate('category')
    .populate('brand')
    .limit(8);

  // Fallback if no best sellers defined
  if (topProducts.length === 0) {
    topProducts = await Product.find({ isDeleted: false, status: 'Active' })
      .populate('category')
      .populate('brand')
      .sort({ 'variants.stock': -1 }) // Simple fallback
      .limit(8);
  }

  // 4. Fetch Brands
  const brands = await Brand.find({ isListed: true }).limit(10);

  const processProduct = async (product) => {
    const activeVariant = product.variants?.find(
      v => v.status === 'Active' && v.stock > 0
    );

    const variantIndex = product.variants.findIndex(v => v._id && activeVariant._id && v._id.toString() === activeVariant._id.toString());

    const offerData = await offerController.calculateOfferPrice(product, variantIndex >= 0 ? variantIndex : 0)

    return {
      ...product.toObject(),
      listingImage:
        activeVariant?.images?.[0] ||
        product.productImages?.[0] ||
        '/images/placeholder.png',
      primaryVariant: activeVariant,
      offer: offerData
    };
  };

  const latestProductsProcessed = await Promise.all(latestProducts.map(processProduct));
  const topProductsProcessed = await Promise.all(topProducts.map(processProduct));
  const specialOffersProcessed = await Promise.all(latestProducts.map(processProduct));

  res.render("user/home", {
    layout: "layout",
    categories,
    latestProducts: latestProductsProcessed,
    topProducts: topProductsProcessed,
    brands,
    specialOffers: specialOffersProcessed
  });
});

const loadProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const userData = await User.findById(userId);

  if (!userData) {
    throw new AppError(MESSAGE.NOT_FOUND || "User not found", STATUS.NOT_FOUND)
  }

  res.status(STATUS.OK).render("user/profile", {
    user: userData.toObject(),
    currentPage: "profile"
  });
})



const otpStore = {};

const loadEditProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.redirect('/user/home')

  res.render('user/editProfile', { user, currentPage: 'profile' });
})


const sendEmailOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const userId = req.user._id;

  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser._id.toString() !== userId) {
    return res.status(400).json({ success: false, message: "Email already in use" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  console.log(`----------------------------`);
  console.log(`OTP for ${email}: ${otp}`);
  console.log(`----------------------------`);

  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 2 * 60 * 1000
  }

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
  })
  res.json({ success: true, message: "OTP sent" });
})

const verifyEmailOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const record = otpStore[email];

  if (!record || record.expires < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP expired or invalid" });
  }

  if (parseInt(otp) !== record.otp) {
    return res.status(400).json({ success: false, message: "Incorrect OTP" });
  }

  // OTP Valid
  delete otpStore[email]; // Clear OTP
  res.json({ success: true });
});

const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { name, phone, email } = req.body;

  // Server-side validation patterns
  const nameRegex = /^[A-Za-z\s]{2,50}$/;
  const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Validate name
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Name is required'
    });
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Name must be between 2 and 50 characters'
    });
  }

  if (!nameRegex.test(trimmedName)) {
    return res.status(400).json({
      success: false,
      message: 'Name should only contain letters and spaces'
    });
  }

  // Validate phone (optional but if provided, must be valid)
  if (phone && phone.trim()) {
    const cleanPhone = phone.trim().replace(/[\s\-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian phone number'
      });
    }
  }

  // Validate email
  if (email && email.trim()) {
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if email is already used by another user
    const existingUser = await User.findOne({
      email: email.trim(),
      _id: { $ne: userId }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already in use by another account'
      });
    }
  }

  const updateData = {
    name: trimmedName,
    phone: phone ? phone.trim() : ''
  };

  // If email is present, we assume it was verified on frontend (Double check logic in production)
  if (email && email.trim()) {
    updateData.email = email.trim();
  }

  await User.findByIdAndUpdate(userId, updateData);

  res.json({ success: true, message: "Profile updated" });
});

// Change Password
const changePassword = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  // Input validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required"
    });
  }

  // Get user with password
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // Check if user has a password (might be Google OAuth user)
  if (!user.password) {
    return res.status(400).json({
      success: false,
      message: "Password change not available for social login accounts"
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect"
    });
  }

  // Validate new password requirements
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters with uppercase, lowercase, and number"
    });
  }

  // Check if new password is different from current
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from current password"
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await User.findByIdAndUpdate(userId, { password: hashedPassword });

  res.json({ success: true, message: "Password changed successfully" });
});

// Upload Profile Picture
const uploadProfilePicture = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file provided"
    });
  }

  // Get current user to check for existing profile picture
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // Delete old profile picture if exists
  if (user.profile_picture) {
    const oldImagePath = path.join(__dirname, '../../public', user.profile_picture);
    if (fs.existsSync(oldImagePath)) {
      try {
        fs.unlinkSync(oldImagePath);
        console.log('Old profile picture deleted:', oldImagePath);
      } catch (err) {
        console.error('Error deleting old profile picture:', err);
      }
    }
  }

  // Generate the public URL path for the new image
  const imageUrl = `/uploads/profile-pictures/${req.file.filename}`;

  // Update user's profile picture
  await User.findByIdAndUpdate(userId, { profile_picture: imageUrl });

  res.json({
    success: true,
    message: "Profile picture updated successfully",
    imageUrl: imageUrl
  });
});

const loadAddresses = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

  res.render('user/addresses', {
    user: req.user,
    addresses: addresses
  });
})


const addAddress = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { label, fullName, addressLine1, addressLine2, phone, altPhone, city, state, pincode } = req.body;

  // Validate required fields
  if (!label || !fullName || !addressLine1 || !phone || !city || !state || !pincode) {
    return res.status(400).json({
      success: false,
      message: 'Please fill all required fields'
    });
  }

  // Validate alternate phone
  if (altPhone && phone === altPhone) {
    return res.status(400).json({
      success: false,
      message: 'Alternative phone must be different from primary phone'
    });
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

  res.json({
    success: true,
    message: 'Address added successfully',
    address: newAddress
  });
});

// Get single address by ID
const getAddress = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.id;

  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  res.json({
    success: true,
    data: address
  });
});

const updateAddress = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.id;
  const updatedAddress = req.body;

  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  // Validate alternate phone for update
  const finalPhone = updatedAddress.phone || address.phone;
  // Use property access for altPhone since it could be an empty string which is falsy but valid update
  const finalAltPhone = typeof updatedAddress.altPhone !== 'undefined' ? updatedAddress.altPhone : address.altPhone;

  if (finalAltPhone && finalPhone === finalAltPhone) {
    return res.status(400).json({
      success: false,
      message: 'Alternative phone must be different from primary phone'
    });
  }

  Object.assign(address, updatedAddress);

  await address.save();

  res.json({
    success: true,
    message: 'Address updated successfully',
    address: address
  });
});


const setDefaultAddress = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.id;

  // First, unset all existing defaults for this user
  await Address.updateMany({ userId }, { isDefault: false });

  // Set the new default
  const address = await Address.findOneAndUpdate(
    { _id: addressId, userId },
    { isDefault: true },
    { new: true }
  );

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  res.json({
    success: true,
    message: 'Default address updated',
    address
  });
});

// Delete Address
const deleteAddress = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const addressId = req.params.id;

  // Find address first to check if it's default
  const addressToCheck = await Address.findOne({ _id: addressId, userId });

  if (!addressToCheck) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  if (addressToCheck.isDefault) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete the default address. Please set another address as default first.'
    });
  }

  await Address.findByIdAndDelete(addressId);

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
});


//Wallet Page
const getWallet = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  const walletHistory = user.walletHistory ?
    user.walletHistory.sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

  res.render('user/wallet', {
    user: user,
    walletHistory,
    currentPage: 'wallet'
  })
})


const addMoneyToWallet = catchAsync(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount'
    })
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `wlt_${Date.now()}`
  });


  res.json({ success: true, order });

})


const verifyWalletPayment = catchAsync(async (req, res, next) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const userId = req.user._id;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  // Get amount from order
  const order = await razorpay.orders.fetch(razorpay_order_id);
  const amount = order.amount / 100;

  // Credit wallet
  await User.findByIdAndUpdate(userId, {
    $inc: { wallet: amount },
    $push: {
      walletHistory: {
        amount,
        type: 'Credit',
        description: 'Money added via Razorpay',
        date: new Date()
      }
    }
  });

  res.json({ success: true, message: 'Money added successfully' });
});


export default {
  loadHomepage,
  pageNotFound,
  loadProfile,
  loadEditProfile,
  sendEmailOtp,
  verifyEmailOtp,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  loadAddresses,
  addAddress,
  getAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getWallet,
  addMoneyToWallet,
  verifyWalletPayment
};
