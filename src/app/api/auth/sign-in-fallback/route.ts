import { NextResponse } from "next/server";

// Native fallback never parses, echoes, logs, redirects or authenticates a body.
// A failed/missing client handler cannot serialize credentials into a GET URL.
export function POST() {
  return new NextResponse("JavaScript is required to sign in securely. Return to sign-in and reload the page. / Se requiere JavaScript para iniciar sesión de forma segura. Vuelva a iniciar sesión y recargue la página.", {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }
  });
}
