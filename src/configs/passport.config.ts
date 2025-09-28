import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Services
 */
import { authService } from "@/services/auth.service";

// TODO: add logger
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: `${config.OAUTH_CALLBACK_URL}/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] && profile.emails[0].value;

        if (!email) {
          return done(
            new Error(
              "Google email not available. Please make your email public.",
            ),
            false,
          );
        }

        const name =
          profile.displayName ||
          `${profile.name?.givenName ?? ""} ${profile.name?.familyName ?? ""}`.trim();
        const avatarUrl =
          profile.photos && profile.photos[0] && profile.photos[0].value;

        // Let authService handle create/find and avatar fetching/uploading
        const user = await authService.oauthLogin({
          provider: "GOOGLE",
          providerAccountId: profile.id,
          email,
          name,
          avatarUrl,
        });

        return done(null, user);
      } catch (err) {
        return done(err as any, false);
      }
    },
  ),
);

export default passport;
