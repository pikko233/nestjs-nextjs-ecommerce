import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth-cookie";

// 无需登录即可访问的路由；以 "/*" 结尾表示匹配该路径下的所有子路由
const publicRoutes = [
  "/",
  "/product/*",
  "/cart",
  "/auth/login",
  "/auth/register",
];

const isPublicRoute = (pathname: string) =>
  publicRoutes.some((route) =>
    route.endsWith("/*")
      ? pathname.startsWith(route.slice(0, -1))
      : pathname === route,
  );

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicRoute(pathname) || request.cookies.has(AUTH_COOKIE)) {
    return NextResponse.next();
  }

  // 记录原访问地址，登录成功后跳回
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(loginUrl);
}

// 跳过静态资源与图片等非页面请求
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
