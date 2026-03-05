const layoutMiddleware = (req, res, next) => {
    if (req.path.startsWith('/admin')) {
        req.app.set('layout', 'adminLayout');
    } else {
        req.app.set('layout', 'layout');
    }
    next();
};

export default layoutMiddleware;
