import User from "../../models/userSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";
import mongoose from "mongoose";

const USERS_PER_PAGE = 10;

const getUsersList = async (page = 1, search = "") => {
    const query = search
        ? {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        }
        : {};

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
