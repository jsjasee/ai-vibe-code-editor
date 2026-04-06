// this code is to fix the hot-reload problem that nextjs has with prisma client. ensure only 1 instance of prisma.

import { PrismaClient } from "./generated/prisma/client"; // since i generated the prisma client and i have a output file, make sure to import the client from here, not @prisma/client

const prismaClientSingleTon = () => {
  return new PrismaClient(); // this gives us a new instance of prisma
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

export const db = globalForPrisma.prisma ?? prismaClientSingleTon();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
