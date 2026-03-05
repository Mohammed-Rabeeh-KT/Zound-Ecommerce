import AppError from "../../utils/AppError.js";

const notFoundMiddleware = (req, res, next) => {
    console.warn('404 for', req.method, req.originalUrl);
    const err = new AppError(`Page not found: ${req.originalUrl}`, 404);

    if (req.accepts && req.accepts('html')) {
        const isAdmin = req.originalUrl?.startsWith('/admin');
        return res.status(404).render('404', {
            url: req.originalUrl,
            layout: false,
            isAdmin
        });
    }

    if (req.accepts && req.accepts('json')) {
        return next(err); // let global error handler send JSON
    }

    return res.status(404).type('txt').send('404 - Page not found');
};

export default notFoundMiddleware;
