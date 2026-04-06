// utility file

export const publicRoutes: string[] = [];

export const protectedRoutes: string[] = ["/"]; // user cannot access this if not logged in

export const authRoutes: string[] = ["/auth/sign-in"]; // authenticates the user, afterwards they can access the page.

export const apiAuthPrefix: string = "/api/auth";

export const DEFAULT_LOGIN_REDIRECT = "/";
