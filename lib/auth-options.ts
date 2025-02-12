import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID as string,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
      tenantId: process.env.AZURE_AD_TENANT_ID as string,
      authorization: {
        params: { scope: "openid profile user.Read email" },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) {
        console.error("Sign-in error: Missing account or profile");
        return false;
      }

      try {
        // Find existing user by email
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email as string },
        });

        if (existingUser) {
          // Update the existing account
          await prisma.account.update({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            data: {
              access_token: account.access_token,
              token_type: account.token_type,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          });

          return true; // Explicitly return true for success
        }

        // Create a new user if none exists
        const newUser = await prisma.user.create({
          data: {
            email: profile.email as string,
            name: profile.name as string,
          },
        });

        // Create a new account for the user
        await prisma.account.create({
          data: {
            userId: newUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            token_type: account.token_type,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
            type: "oauth", // Specify the account type here
          },
        });

        return true; // Indicate successful sign-in
      } catch (error) {
        console.error("Sign-in error:", error);
        return false; // Return false on error
      }
    },
    async session({ session, user }) {
      // Ajoutez l'ID de l'utilisateur à la session
      session.user.id = user.id;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/",
    error: "/auth/error", // Ajoutez une page d'erreur personnalisée
  },
  // Ajoutez une gestion des erreurs
  events: {
    signIn: async ({ user }) => {
      if (!user) {
        console.error("NextAuth error: User not found");
      }
    },
  },
  // Add error handling for NextAuth
  logger: {
    error(code, metadata) {
      console.error("NextAuth error:", code, metadata);
    },
  },
};
