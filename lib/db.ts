// this code is to fix the hot-reload problem that nextjs has with prisma client. ensure only 1 instance of prisma.

import { PrismaClient } from "@prisma/client";

const prismaClientSingleTon = () => {
  return new PrismaClient(); // this gives us a new instance of prisma
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

export const db = globalForPrisma.prisma ?? prismaClientSingleTon();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
