import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userSchema.js';

passport._sm = {
  logIn(req, user, done) {
    req.session = req.session || {};
    if (typeof done === "function") done();
  },
  logOut(req, done) {
    if (typeof done === "function") done();
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const profilePicture = profile.photos[0]?.value || null;

        // Check if user exists by googleId
        let user = await User.findOne({ googleId });

        if (user) {
          // User exists with this Google account
          return done(null, user);
        }

        // Check if user exists by email (password-based signup)
        user = await User.findOne({ email });

        if (user) {
          // Link Google account to existing user
          user.googleId = googleId;
           if (!user.profile_picture) {
            user.profile_picture = profilePicture;
          }
          await user.save();
          return done(null, user);
        }

        // Create new user
        const newUser = new User({
          name,
          email,
          googleId,
          profile_picture: profilePicture,
          password: null, // No password for Google users
        });

        await newUser.save();
        return done(null, newUser);

      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;