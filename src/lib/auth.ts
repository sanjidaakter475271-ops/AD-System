import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'air-hq-inventory-super-secret-key-2026-baf-secure',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const cleanUsername = credentials.username.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name || user.username,
          username: user.username,
          role: user.role,
          baseUnit: user.baseUnit || 'Air HQ',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.baseUnit = (user as any).baseUnit;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).baseUnit = token.baseUnit;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
};
