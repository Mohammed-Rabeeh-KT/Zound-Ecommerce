import AppError from "../utils/AppError.js";
import { STATUS } from "../utils/response.js";

export const protectAdmin = (req, res, next) => {
    if(!req.session.admin){
        return next(new AppError("Please log in as admin", STATUS.UNAUTHORIZED));
    }
    next();
}

