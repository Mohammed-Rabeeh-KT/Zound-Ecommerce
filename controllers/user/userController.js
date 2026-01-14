import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import Address from "../../models/addressSchema.js";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { STATUS, MESSAGE } from "../../utils/response.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const pageNotFound = async (req, res) => {
  try {
    return res.render('page-404')
  } catch (error) {
    res.redirect('/pageNotFound')
  }
}

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


const loadHomepage = async (req, res) => {
  try {
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

    // const specialOffers = latestProducts.slice(0, 8); // Quick mapping for now

    const processProduct = (product) => {
      const activeVariant = product.variants?.find(
        v => v.status === 'Active' && v.stock > 0
      );

      return {
        ...product.toObject(),
        listingImage:
          activeVariant?.images?.[0] ||
          product.productImages?.[0] ||
          '/images/placeholder.png',
        primaryVariant: activeVariant
      };
    };

    const latestProductsProcessed = latestProducts.map(processProduct);
    const topProductsProcessed = topProducts.map(processProduct);
    const specialOffersProcessed = latestProducts.map(processProduct);


    res.render("user/home", {
      layout: "layout",
      user: req.user || null,
      cartCount: req.session?.cart?.length || 0,
      categories,
      latestProducts: latestProductsProcessed,
      topProducts: topProductsProcessed,
      brands,
      specialOffers: specialOffersProcessed
    });

  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).render('page-404'); // Or generic error
  }
}

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
  const updateData = { name, phone };

  // If email is present, we assume it was verified on frontend (Double check logic in production)
  if (email) {
    updateData.email = email;
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

  const address = await Address.findOneAndDelete({ _id: addressId, userId });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  // If deleted address was default, set another as default
  if (address.isDefault) {
    const anyAddress = await Address.findOne({ userId });
    if (anyAddress) {
      anyAddress.isDefault = true;
      await anyAddress.save();
    }
  }

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
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
  deleteAddress
};
