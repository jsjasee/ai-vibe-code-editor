import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./lib/db";
import authConfig from "./auth.config";
import { getUserById } from "./modules/auth/actions";

// why is Auth.js used and not clerk? are both interchangeable? When do i use Auth.js vs when do i use clerk and what are the differences and similarities?
// ANSWER: See Learning Log entry "Auth.js vs Clerk" for full breakdown. TL;DR: Auth.js = free, self-hosted, you own the data, more manual work. Clerk = paid hosted service, pre-built UI, MFA, user dashboard out of the box. Not directly interchangeable — Auth.js gives you building blocks, Clerk gives you a complete system. Use Auth.js when you want control + zero cost. Use Clerk when you want to ship fast and don't mind vendor lock-in.

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt", // tells the auth.JS that we are using the jwt strategy for session, not the database one (whatever this means?)
  },
  callbacks: {
    // are these inputs auto passed by Auth.js? aka user, account, profile, email, credentials??
    // ANSWER: Yes — Auth.js automatically passes these parameters to the signIn callback. `user` is the user object from the provider (name, email, image). `account` contains the OAuth data (provider, providerAccountId, access_token, etc.). Other available params: `profile` (raw provider profile), `email` (for email provider), `credentials` (for credentials provider). You destructure only what you need.

    async jwt({ token }) {
      if (!token.sub) return token; // what is sub? the id?
      // ANSWER: Yes — `sub` stands for "subject" and is a standard JWT claim (from the JWT spec RFC 7519). In Auth.js, `token.sub` is set to the user's database ID. It's called "sub" (not "id") because that's the JWT standard naming convention. It identifies WHO the token belongs to.

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      // adding more info into our token? like the payload?
      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = existingUser.role;

      return token;
    },

    async session({ session, token }) {
      // attach userId from token to session. what is session used for?
      // ANSWER: The session object is what your app's frontend and server components actually see when they call `auth()` or `useSession()`. The JWT token is the raw auth data (stored in the cookie). The session callback transforms token data into a cleaner shape for your app. Here we're copying `token.sub` (user ID) and `token.role` into `session.user` so any component calling `auth()` can access `session.user.id` and `session.user.role` directly.
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.sub && session.user) {
        session.user.role = token.role;
      }

      return session;
    },
  },
  ...authConfig,
});
