import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

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
});
