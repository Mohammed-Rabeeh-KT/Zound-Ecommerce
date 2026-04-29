import User from "../../models/userSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";
import mongoose from "mongoose";

const USERS_PER_PAGE = 10;

const getUsersList = async (page = 1, search = "", status = "", startDate = "", endDate = "") => {
    const query = {};
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ];
    }

    if (status === "active") query.isBlocked = false;
    else if (status === "inactive") query.isBlocked = true;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            query.createdAt.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
        .sort({ createdAt: -1 }) // Latest users first
        .skip((page - 1) * USERS_PER_PAGE)
        .limit(USERS_PER_PAGE);

    return {
        users,
        totalUsers,
        usersPerPage: USERS_PER_PAGE,
        currentPage: page
    };
};

const blockUser = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid user ID", STATUS.BAD_REQUEST);
    }

    const user = await User.findByIdAndUpdate(userId, { isBlocked: true });

    if (!user) {
        throw new AppError('User not found', STATUS.NOT_FOUND);
    }

    return user;
};

const unblockUser = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid user ID", STATUS.BAD_REQUEST);
    }

    const user = await User.findByIdAndUpdate(userId, { isBlocked: false });

    if (!user) {
        throw new AppError("User not found", STATUS.NOT_FOUND);
    }

    return user;
};

export default {
    getUsersList,
    blockUser,
    unblockUser
};
