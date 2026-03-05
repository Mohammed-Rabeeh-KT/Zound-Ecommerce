const normalizeEmail = (req, res, next) => {
    if (req.body && typeof req.body.email === 'string') {
        req.body.email = req.body.email.trim().toLowerCase();
    }
    // Also check query strings just in case
    if (req.query && typeof req.query.email === 'string') {
        req.query.email = req.query.email.trim().toLowerCase();
    }
    next();
};

export default normalizeEmail;
