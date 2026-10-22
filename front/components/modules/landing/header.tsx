"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { authService } from "@/service/api/auth.service";
import { LayoutDashboard, LogIn, LogOut, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const Header = () => {
  const { totalItems } = useCart();
  const { isLoading, setIsLoading, error, user, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleDashboardClick = () => {
    if (user?.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/user");
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await authService.logout();
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogin = async () => {
    router.push("/auth/login");
  };

  return (
    <>
      <header className="sticky top-0 w-screen h-16 shadow-sm px-6 shrink-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="w-full h-full flex items-center justify-between gap-2">
          <Link href="/" className="text-xl sm:text-2xl font-black">
            STOREFRONT
          </Link>
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="secondary"
              size="icon"
              className="relative"
            >
              <Link
                href="/cart"
                aria-label={
                  totalItems > 0 ? `购物车，${totalItems} 件商品` : "购物车"
                }
              >
                <ShoppingCart className="size-4" />
                {totalItems > 0 && (
                  <Badge className="absolute top-0 left-full -translate-x-[50%] -translate-y-[50%]">
                    {totalItems}
                  </Badge>
                )}
              </Link>
            </Button>
            {isAuthenticated ? (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={user?.role === "ADMIN" ? "管理后台" : "个人中心"}
                  onClick={handleDashboardClick}
                >
                  <LayoutDashboard className="size-4" />
                </Button>
                <Button onClick={handleLogout}>
                  <LogOut className="size-4 hidden sm:block" />
                  退出登录
                </Button>
              </>
            ) : (
              <Button onClick={handleLogin}>
                <LogIn className="size-4 hidden sm:block" />
                登录
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
