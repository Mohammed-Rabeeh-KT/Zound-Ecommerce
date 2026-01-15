import { errorResponse, STATUS, MESSAGE } from "../utils/response.js";

const globalErrorHandler = (err, req, res, next) => {
    console.error('Global error : ', err);

    const statusCode = err.statusCode || STATUS.INTERNAL_ERROR;
    const message = err.isOperational ? err.message : MESSAGE.SERVER_ERROR;

    if (req.accepts && req.accepts('html')) {
        return res.status(statusCode).render('error', {
            statusCode,
            message,
            error: process.env.NODE_ENV === 'development' ? err : null,
            layout: 'layout'
        });
    }

    return errorResponse(res, statusCode, message);
}

export default globalErrorHandler;