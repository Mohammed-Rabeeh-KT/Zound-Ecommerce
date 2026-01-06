import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import passport from "passport";

const loadLogin = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).send('Server error')
  }
}

const loadSignup = (req, res) => {
    // Redirect authenticated users away from signup
    if (req.user) {
      return res.redirect('/user/home');
    }
  res.render("user/signup", { layout: "layout", message: null, user: req.user || null, cartCount: req.session?.cart?.length || 0 });
}


function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
    })

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 2 minutes.`,
      html: `<b>Your OTP code is ${otp}. It is valid for 2 minutes.</b>`
    })

    return info.accepted.length > 0;

  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (password != confirmPassword) {

      return res.render('user/signup', {
        layout: 'layout',
        message: "Password do not match",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0

      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('user/signup', {
        layout: "layout",
        message: 'Email already exists',
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const otp = generateOTP();
    console.log("Generated OTP:", otp);



    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      console.error("Failed to send OTP email");
      return res.json({ success: false, message: "Failed to send OTP email. Please try again." });
    }

    req.session.userOTP = otp;
    req.session.otpTimestamp = Date.now(); // Store OTP creation time
    req.session.otpAttempts = 0; // Track resend attempts
    req.session.userData = { name, email, password }

    res.render('user/verify-otp', {
      layout: "layout",
      user: req.user || null,
      cartCount: req.session?.cart?.length || 0,
      errorMessage: ""
    });
    console.log("OTP sent to email:", otp);

  } catch (error) {
    console.error("Error during signup:", error);
    res.redirect('/pageNotFound');
  }
}

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("Entered OTP:", otp.join(''));
    console.log("session otp : ", req.session.userOTP)

    // Check if OTP exists in session
    if (!req.session.userOTP || !req.session.otpTimestamp) {
      return res.status(400).json({ success: false, message: "OTP session expired. Please signup again." });
    }

    // Check if OTP has expired (2 minutes = 120000 milliseconds)
    const otpAge = Date.now() - req.session.otpTimestamp;
    if (otpAge > 120000) {
      // Clear expired OTP from session
      delete req.session.userOTP;
      delete req.session.otpTimestamp;
      delete req.session.userData;
      delete req.session.otpAttempts;
      return res.status(400).json({ success: false, message: "OTP has expired. Please signup again.", expired: true });
    }

    if (otp.join('') === req.session.userOTP) {
      const user = req.session.userData;
      const hashedPassword = await bcrypt.hash(user.password, 10);

      const userData = new User({
        name: user.name,
        email: user.email,
        password: hashedPassword
      });

      await userData.save();

      // Clean up OTP and temporary user data from session
      delete req.session.userOTP;
      delete req.session.otpTimestamp;
      delete req.session.userData;
      delete req.session.otpAttempts;

      return res.json({ success: true, redirectUrl: '/user/login', message: "Signup successful!" });


    } else {
      return res.status(400).json({ success: false, message: "The OTP you entered is incorrect." });
    }

  } catch (error) {
    console.error('Error Verifying OTP:', error);
    return res.status(500).json({ success: false, message: "Server error during OTP verification." });
  }
}

// Resend OTP endpoint
const resendOTP = async (req, res) => {
  try {
    // Check if user has valid session data
    if (!req.session.userData) {
      return res.status(400).json({ success: false, message: "Session expired. Please signup again." });
    }

    // Check resend attempts (limit to 3 resends)
    if (req.session.otpAttempts >= 3) {
      return res.status(429).json({ success: false, message: "Too many resend attempts. Please signup again." });
    }

    // Generate new OTP
    const otp = generateOTP();
    console.log("Resent OTP:", otp);

    // Send OTP email
    const emailSent = await sendOTPEmail(req.session.userData.email, otp);
    if (!emailSent) {
      console.error("Failed to resend OTP email");
      return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again." });
    }

    // Update session with new OTP and timestamp
    req.session.userOTP = otp;
    req.session.otpTimestamp = Date.now();
    req.session.otpAttempts += 1;

    return res.json({
      success: true,
      message: "OTP has been resent to your email.",
      attemptsLeft: 3 - req.session.otpAttempts
    });

  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
}


const login = async (req, res) => {
  const { email, password, remember } = req.body;

  try {
    const errors = {};


    // Validate email
    if (!email || email.trim() === "") {
      errors.email = "Email is required.";
    } else {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    // Validate password
    if (!password || password.trim() === "") {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 8 characters long.";
    }


    if (Object.keys(errors).length > 0) {
      return res.render('user/login', {
        layout: "layout",
        message: null,
        errors: errors,
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0
      });
    }
    // ============ SANITIZE INPUTS ============
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();


    //find user by email
    const user = await User.findOne({ email: sanitizedEmail });

    

    if (!user) {
      return res.render('user/login', { layout: "layout", message: "Invalid email or user doesn't exist.", errors: {}, user: req.user || null, cartCount: req.session?.cart?.length || 0 })
    }

    if(user.role !== 'user'){
      return res.render('user/login', {
        layout: "layout",
        message: "Invalid email or password",
        errors: {},
        user: null,
        cartCount: req.session?.cart?.length || 0
      })
    }

    if (user.isBlocked) {
      return res.render('user/login', { layout: "layout", message: "Your account has been blocked.", errors: {}, user: req.user || null, cartCount: req.session?.cart?.length || 0 })
    }

    const validPassword = await bcrypt.compare(sanitizedPassword, user.password);
    if (!validPassword) {
      return res.render('user/login', { layout: "layout", message: "Invalid email or password.", errors: {}, user: req.user || null, cartCount: req.session?.cart?.length || 0 })
    }

    // ============ SUCCESSFUL LOGIN ============

    //Create JWT token
    const token = jwt.sign({ id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: remember ? '7d' : '1d' });


    res.cookie('authToken', token, {
      httpOnly: true,
      maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : null
    });

    res.redirect('/user/home');
  }

  catch (error) {
    console.error("Error during login:", error);
    res.render('user/login', {
      layout: "layout",
      message: "Error during login. Please try again.",
      user: req.user || null,
      cartCount: req.session?.cart?.length || 0
    })
  }
};

// // ------------------ AJAX: CHECK IF EMAIL EXISTS (used in signUp)------------------

const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || email.trim() === "") {
      return res.json({ exists: false, message: "" });
    }

    const user = await User.findOne({ email })
    if (user) {
      return res.json({ exists: true, message: "Email already exists" });
    }

    return res.json({ exists: false, message: "Email available" });

  } catch (error) {
    console.log("Email check error:", error);
    res.status(500).json({ exists: false, message: "Server error" });
  }
}


const logout = (req, res) => {
  try {
    // Clear JWT cookie
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

  } catch (error) {
    console.error("Logout error:", error);
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
      try {
        if (err || !user) {
          console.error("Google Auth Error:", err);
          return res.redirect("/user/login");
        }

        // Create JWT token
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Set cookie
        res.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.redirect("/user/home");

      } catch (error) {
        console.error("Google callback error:", error);
        return res.redirect("/user/login");
      }
    }
  )(req, res, next);
};



const loadForgotPassword = async (req, res) => {
  try {
    return res.render('user/forgot-password', {
      layout: "layout",
      user: req.user || null,
      cartCount: req.session?.cart?.length || 0
    })
  }
  catch (error) {
    console.log("Forgot password page not found")
    res.status(500).send('Server error')
  }
}


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email || email.trim() === "") {
        return res.render('user/forgot-password', {
            layout: "layout",
            message: "Email is required",
            user: req.user || null,
            cartCount: req.session?.cart?.length || 0,
            errors: { email: "Email is required" }
        });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
        return res.render('user/forgot-password', {
            layout: "layout",
            message: "The otp has shared to your email account",
            user: req.user || null,
            cartCount: req.session?.cart?.length || 0,
            errors: { email: "User not found" }
        });
    }

    if (user.isBlocked) {
        return res.render('user/forgot-password', {
            layout: "layout",
            message: "This account has been blocked. Please contact support.",
            user: req.user || null,
            cartCount: req.session?.cart?.length || 0
        });
    }

    // Generate and send OTP
    const otp = generateOTP();
    const emailSent = await sendOTPEmail(email, otp);
    console.log("Generated FP OTP:", otp);
    if (!emailSent) {
        return res.render('user/forgot-password', {
            layout: "layout",
            message: "Failed to send OTP. Please try again.",
            user: req.user || null,
            cartCount: req.session?.cart?.length || 0,
            errors: {}
        });
    }
    // Store in session
    req.session.fpOTP = otp;
    req.session.fpEmail = email;
    req.session.fpTimestamp = Date.now();
    res.redirect('/user/fp-verify-otp');
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).send('Server error');
  }
}


const loadFpVerifyOTP = async (req, res) => {
    try {
        if (!req.session.fpOTP) {
            return res.redirect('/user/forgot-password');
        }
        res.render('user/fp-verify-otp', {
            layout: "layout",
            user: req.user || null,
            cartCount: req.session?.cart?.length || 0,
            errorMessage: null
        });
    } catch (error) {
        console.error("Error loading FP verify OTP:", error);
        res.status(500).send('Server error');
    }
}



const verifyFpOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        // Handle if otp is array or string depending on your frontend implementation
        const enteredOTP = Array.isArray(otp) ? otp.join('') : otp;
        if (!req.session.fpOTP) {
             return res.status(400).json({ success: false, message: "Session expired. Please try again." });
        }
        if (enteredOTP === req.session.fpOTP) {
            req.session.fpVerified = true;
            // Optional: Clear OTP to prevent reuse, but keep email
            delete req.session.fpOTP; 
            return res.json({ success: true, redirectUrl: '/user/fp-reset-password' });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }
    } catch (error) {
        console.error("Error verifying FP OTP:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}
const loadResetPassword = async (req, res) => {
    try {
        if (!req.session.fpVerified || !req.session.fpEmail) {
            return res.redirect('/user/forgot-password');
        }
        res.render('user/fp-reset-password', {
            layout: "layout",
            user: req.user || null,
            cartCount: req.session?.cart?.length || 0,
            message: null,
            errors: {}
        });
    } catch (error) {
        console.error("Error loading reset password:", error);
        res.status(500).send('Server error');
    }
}


const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!req.session.fpVerified || !req.session.fpEmail) {
      return res.json({ success: false, message: "Session expired. Please try again." });
    }

    const user = await User.findOne({ email: req.session.fpEmail });

    // Check old == new
    const isSameOld = await bcrypt.compare(password, user.password);
    if (isSameOld) {
      return res.json({ success: false, message: "New password cannot be the same as old password." });
    }

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match." });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.updateOne(
      { email: req.session.fpEmail },
      { $set: { password: hashed } }
    );

    delete req.session.fpEmail;
    delete req.session.fpVerified;

    return res.json({ success: true, message: "Password reset successfully!" });

  } catch (err) {
    console.error("Reset error:", err);
    return res.json({ success: false, message: "Server error. Please try again." });
  }
};


const resendFpOTP = async (req, res) => {
  try {
    // Check if the session has the email from the first step
    if (!req.session.fpEmail) {
      return res.status(400).json({ success: false, message: "Session expired. Please try again." });
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // Send email
    const emailSent = await sendOTPEmail(req.session.fpEmail, otp);

    if (!emailSent) {
      return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
    }

    // Update session with new OTP and timestamp
    req.session.fpOTP = otp;
    req.session.fpTimestamp = Date.now();

    console.log("Resent FP OTP:", otp);
    return res.json({ success: true, message: "OTP has been resent to your email." });


  } catch (error) {
    console.error("Error resending FP OTP:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


export default{
  loadLogin,
  loadSignup,
  signup,
  login,
  checkEmail,
  verifyOTP,
  resendOTP,
  logout,
  googleLogin,
  googleCallback,
  loadForgotPassword,
  forgotPassword,
  loadFpVerifyOTP,
  verifyFpOTP,
  loadResetPassword,
  resetPassword,
  resendFpOTP
}