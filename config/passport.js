import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userSchema.js';
import ReferralConfig from '../models/referralConfigSchema.js';
import WalletTransaction from '../models/walletTransactionSchema.js';


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
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://zound.rabeehkt.in/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const profilePicture = profile.photos[0]?.value || null;

        // Check if user exists by googleId
        let user = await User.findOne({ googleId });

        if (user) {
          // User exists with this Google account - update profile picture
          user.profile_picture = profilePicture;
          await user.save();
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
        // Generate unique referral code
        const generateReferralCode = () =>
            'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();

        let referralCode = generateReferralCode();
        while (await User.findOne({ referralCode })) {
            referralCode = generateReferralCode();
        }

        const newUser = new User({
          name,
          email,
          googleId,
          profile_picture: profilePicture,
          password: null,
          referralCode,
        });

        // Process referral reward if a referral code was passed via session
        const referredByCode = req.session?.googleReferralCode || null;
        if (referredByCode) {
            delete req.session.googleReferralCode;

            const referrer = await User.findOne({ referralCode: referredByCode });
            if (referrer) {
                newUser.referredBy = referrer.referralCode;

                const config = await ReferralConfig.findOne({ status: 'active' });

                // Credit referee (new Google user)
                if (config && config.refereeReward > 0) {
                    newUser.wallet = config.refereeReward;
                }

                // Save user first to get _id for wallet transactions
                await newUser.save();

                // Record referee wallet transaction
                if (config && config.refereeReward > 0) {
                    await WalletTransaction.create({
                        userId: newUser._id,
                        amount: config.refereeReward,
                        type: 'Credit',
                        description: 'Referral Bonus (Google Signup)',
                        date: new Date(),
                    });
                }

                // Credit referrer (inviter)
                if (config && config.referrerReward > 0) {
                    referrer.wallet += config.referrerReward;
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    referrer.redeemedUsers.push(newUser._id);
                    await referrer.save();

                    await WalletTransaction.create({
                        userId: referrer._id,
                        amount: config.referrerReward,
                        type: 'Credit',
                        description: `Referral Bonus (Referred: ${name})`,
                        date: new Date(),
                    });
                }

                newUser.redeemed = true;
                await newUser.save();
                return done(null, newUser);
            }
        }

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