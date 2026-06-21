import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // socialProviders: {
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
  //   },
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
  //   },
  // },
  user: {
    additionalFields: {
      isSuperAdmin: { type: "boolean", defaultValue: false, input: false },
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    admin(), // ← nécessaire pour débloquer auth.api.createUser
  ],
});
