import { errorResponse, STATUS, MESSAGE } from "../utils/response.js";

 const globalErrorHandler = (err, req, res, next) => {
    console.error('Global error : ', err);

    const statusCode = err.statusCode || STATUS.INTERNAL_ERROR;
    const message = err.isOperational ? err.message : MESSAGE.SERVER_ERROR;

    return errorResponse(res,statusCode,message)
}


export default globalErrorHandler;