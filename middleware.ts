import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get JWT token (works with both session strategies)
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    const isLoggedIn = !!token;

    // Admin routes are now protected by password on frontend, not middleware
    // Just skip admin routes here

    // Protect game routes - require login
    const gameRoutes = ["/lobby", "/room", "/battle", "/profile", "/history", "/settings"];
    const isGameRoute = gameRoutes.some(route => pathname.startsWith(route));

    if (isGameRoute && !isLoggedIn) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect logged-in users away from public-only routes (login, landing)
    const publicOnlyRoutes = ["/login", "/"];
    const isPublicOnlyRoute = publicOnlyRoutes.some(route => pathname === route);

    if (isPublicOnlyRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/lobby", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/login",
        "/lobby/:path*",
        "/room/:path*",
        "/battle/:path*",
        "/profile/:path*",
        "/history/:path*",
        "/settings/:path*",
    ],
};
