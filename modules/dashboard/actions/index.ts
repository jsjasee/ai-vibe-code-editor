"use server";

import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";

// fetch all the playground which is created by the currently logged in user

export const getAllPlaygroundForUser = async () => {
  const user = await currentUser();

  try {
    const playground = await db.playground?.findMany({
      where: {
        userId: user?.id,
      },
      include: {
        user: true,
      },
    });

    return playground;
  } catch (error) {
    console.log(error);
  }
};
