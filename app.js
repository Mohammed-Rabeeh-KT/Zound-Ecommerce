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


import globalErrorHandler from "./middlewares/core/globalErrorHandler.js";
import userSsrRouter from './routes/user/user.ssr.routes.js';
import userApiRouter from './routes/user/user.api.routes.js';
import adminSsrRouter from './routes/admin/admin.ssr.routes.js';
import adminApiRouter from './routes/admin/admin.api.routes.js';
import publicRouter from './routes/public.routes.js';

import authRouter from './routes/auth.routes.js';
import { authenticateUser } from './middlewares/auth/authMiddleware.js';
import cacheControlMiddleware from './middlewares/core/cacheControlMiddleware.js';
import localsMiddleware from './middlewares/auth/localsMiddleware.js';
import notFoundMiddleware from './middlewares/core/notFoundMiddleware.js';
import layoutMiddleware from './middlewares/core/layoutMiddleware.js';
import emailNormalizer from './middlewares/core/emailNormalizer.js';
import limiter, { authLimiter } from './middlewares/core/rateLimiter.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
await db();

app.set('trust proxy', 1);
app.use(limiter);

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

app.use(cacheControlMiddleware);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/utils', express.static(path.join(__dirname, 'utils')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressEjsLayouts);

// Layout Decision Middleware
app.use(layoutMiddleware);
app.use(emailNormalizer);

app.use(authenticateUser);
app.use(localsMiddleware);

app.use('/auth', authRouter);

app.use('/', publicRouter);
app.use('/user', userSsrRouter);
app.use('/api/user', userApiRouter);
app.use('/admin', adminSsrRouter);
app.use('/api/admin', adminApiRouter);


app.use(globalErrorHandler);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`)
})

export default app;

