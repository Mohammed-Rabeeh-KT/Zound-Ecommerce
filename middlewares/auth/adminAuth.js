import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

export const protectAdmin = (req, res, next) => {
    if(!req.session.admin){
        if (req.originalUrl && req.originalUrl.startsWith('/api')) {
            return next(new AppError("Please log in as admin", STATUS.UNAUTHORIZED));
        }
        return res.redirect('/admin/login');
    }
    next();
}
