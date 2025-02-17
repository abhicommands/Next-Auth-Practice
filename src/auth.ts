import NextAuth, { CredentialsSignin } from "next-auth"
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/app/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Provider } from "next-auth/providers";

class InvalidLoginError extends CredentialsSignin {
  code = "Incorrect password"
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "Invalid credentials"
}

class UserNotFoundError extends CredentialsSignin {
  code = "User doesn't exist"
}

class OauthError extends CredentialsSignin {
  code = "Email already registered with another provider"
}

const credentialsSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one digit")
    .regex(/[@$!%*?&#]/, "Password must contain at least one special character")
    .max(32, "Password must be less than 32 characters"),
});

const providers: Provider[] = [Google,
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      if (!credentials?.email || !credentials?.password) {
        throw new InvalidCredentialsError();
      }
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) {
        throw new InvalidCredentialsError();
      }
      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user) {
        throw new UserNotFoundError();
      }
      if (!user.hashedPassword) {
        throw new OauthError();
      }
      const isValidPassword = await bcrypt.compare(
        credentials.password as string,
        user.hashedPassword as string
      );

      if (!isValidPassword) {
        throw new InvalidLoginError();
      }
      return {
        id: `${user.id}`,
        name: `${user.name}`,
        email: `${user.email}`,
      };
    },
  }),
]

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account && account.provider !== "credentials") {
        // Check if this email is already registered
        const existingUser = await prisma.user.findFirst({
          where: { email: user.email as string },
          include: { accounts: true },
        });

        if (existingUser) {
          // If the user is attempting to sign in with an OAuth provider
          // Check if the OAuth provider matches an existing account for this email
          if (existingUser.accounts.some((acc) => acc.provider === account.provider)) {
            return true;
          } else { throw new OauthError(); }
        } else {
          return true;
        }
      } else {
        return true;
      }
    },
    jwt({ token, user }) {
      // If it's the first time JWT callback is run, user object will be available
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },

});
