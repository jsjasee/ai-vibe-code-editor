import { useSession } from "next-auth/react"; // this is from Auth.js

export const useCurrentUser = () => {
  const session = useSession();
  return session?.data?.user;
};

// we need a current user for client component
