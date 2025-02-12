import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();

  // Ajout des headers CORS
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
