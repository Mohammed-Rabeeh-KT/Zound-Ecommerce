import express from 'express';
const app = express();
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from './config/db.js';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import './config/passport.js';
import expressEjsLayouts from 'express-ejs-layouts';
import AppError from "./utils/AppError.js";

import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import userRouter from './routes/userRouter.js';
import authRouter from './routes/authRouter.js';
import adminRouter from './routes/adminRouter.js';
import { authenticateUser } from './middlewares/authMiddleware.js';


// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());


// Prevent caching for authenticated pages
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressEjsLayouts);
app.set("layout", "layout");

app.use(authenticateUser);

app.use((req, res, next) => {
    // res.locals makes these variables available in ALL EJS templates automatically
    res.locals.user = req.user || null; 
    res.locals.cartCount = req.session?.cartCount || 0; // Or fetch from your database if you have that logic
    res.locals.searchQuery = req.query.search || '';
    next();
});

app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/admin',authenticateUser,adminRouter);


const notFoundHandler = (req, res, next) => {
  console.warn('404 for', req.method, req.originalUrl);
  const err = new AppError(`Page not found: ${req.originalUrl}`, 404);

  if (req.accepts && req.accepts('html')) {
    return res.status(404).render('404', { url: req.originalUrl, layout: 'layout' });
  }

  if (req.accepts && req.accepts('json')) {
    return next(err); // let global error handler send JSON
  }

  return res.status(404).type('txt').send('404 - Page not found');
};

app.use(notFoundHandler);


app.use(globalErrorHandler);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/user/home`)
})

export default app;

