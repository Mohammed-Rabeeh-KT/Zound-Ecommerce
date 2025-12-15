import jwt from 'jsonwebtoken';
import User from '../models/userSchema.js';

export const authenticateUser = async (req, res, next) => {
    try {
            // Skip authentication for Google OAuth routes
        if (req.path.startsWith('/auth')) {
            return next();
        }

        // Passport session user (Google OAuth)
        if (req.isAuthenticated && req.isAuthenticated()) {
            return next();
        }

        const token = req.cookies?.authToken;

        if (!token) {
            req.user = null;
            return next();
        }

         let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      res.clearCookie("authToken");
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.isBlocked) {
      res.clearCookie("authToken");
      req.user = null;
      return next();
    }

    req.user = user;
    return next();

    } catch (error) {
        console.log(error);
        req.user = null;
        next();
    }
}

export const requireUser = (req, res, next) => {
    if (!req.user) {
        // Not logged in
        return res.redirect('/user/login');
    }

    if (req.user.role !== "user") {
        // Logged in but not user → send them where they belong
        if (req.user.role === "admin") {
            return res.redirect('/admin/dashboard');
        }

        return res.status(403).send("Access Denied");
    }

    next();
};


export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        // Not logged in
        return res.redirect('/admin/login');
    }

    if (req.user.role !== "admin") {
        // Logged in but not admin → redirect properly
        return res.redirect('/user/home');
    }

    next();
};



