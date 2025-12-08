import User from "../../models/userSchema.js";
import mongoose from "mongoose"
import { catchAsync } from "../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS, MESSAGE } from "../../utils/response.js";
import AppError from "../../utils/AppError.js";

const USERS_PER_PAGE = 10;


const getUsersPage = catchAsync(async (req, res, next) => {
    return res.render('admin/userManagement', {
        currentPage: 'user-management',
        adminName: req.session.admin?.name || "",
        search: req.query.search || ""
    })

})

const getUsersData = catchAsync(async (req, res) => {
    const page = Number(req.query.page);
    const search = req.query.search || "";

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
        .sort({ createdAt: -1 })        // Latest users first
        .skip((page - 1) * USERS_PER_PAGE)
        .limit(USERS_PER_PAGE);

    return res.json({
        users,
        totalUsers,
        usersPerPage: USERS_PER_PAGE,
        currentPage: page
    });
})

const blockUser = catchAsync(async (req, res, next) => {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new AppError("Invalid user ID", STATUS.BAD_REQUEST));
    }

    const user = await User.findByIdAndUpdate(userId, { isBlocked: true })

    if (!user) {
        return next(new AppError('User not found', STATUS.NOT_FOUND));
    }

    return successResponse(res, STATUS.OK, "User blocked successfully");
})


const unblockUser = catchAsync(async (req, res, next) => {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new AppError("Invalid user ID", STATUS.BAD_REQUEST));
    }

    const user = await User.findByIdAndUpdate(userId, { isBlocked: false });

    if (!user) {
        return next(new AppError("User not found", STATUS.NOT_FOUND));
    }

    return successResponse(res, STATUS.OK, "User unblocked successfully");
})


export default {
    getUsersPage,
    getUsersData,
    blockUser,
    unblockUser
}