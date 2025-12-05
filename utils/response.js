// ---------------------------------------------
// Unified Status Codes & Messages + Response Helpers
// ---------------------------------------------

export const STATUS = {
    OK: 200,
    CREATED: 201,

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,

    CONFLICT: 409,
    INTERNAL_ERROR: 500,
};

export const MESSAGE = {
    SUCCESS: "Request successful",
    CREATED: "Resource created successfully",

    BAD_REQUEST: "Invalid request",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "Access forbidden",
    NOT_FOUND: "Resource not found",

    CONFLICT: "Conflict occurred",
    SERVER_ERROR: "Internal server error",
};


// ---------------------------------------------
// SUCCESS RESPONSE
// ---------------------------------------------
export const successResponse = (res, statusCode = STATUS.OK, message = MESSAGE.SUCCESS, data = null) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};


// ---------------------------------------------
// ERROR RESPONSE
// ---------------------------------------------
export const errorResponse = (res, statusCode = STATUS.INTERNAL_ERROR, message = MESSAGE.SERVER_ERROR, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};
