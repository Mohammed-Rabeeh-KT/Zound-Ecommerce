import { catchAsync } from "../../../utils/catchAsync.js";


const getUsersPage = catchAsync(async (req, res, next) => {
    return res.render('admin/userManagement', {
        currentPage: 'user-management',
        adminName: req.session.admin?.name || "",
        search: req.query.search || ""
    })

})


export default {
    getUsersPage
}