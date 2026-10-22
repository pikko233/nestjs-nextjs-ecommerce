"use client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { LayoutDashboard, LogIn, LogOut, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const Header = () => {
  const { totalItems } = useCart();
  const { isLoading, user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleDashboardClick = () => {
    if (user?.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/user");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("已退出登录");
    // 当前页可能需要登录（如结算页），统一回到首页
    router.replace("/");
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
                <ConfirmDialog
                  trigger={
                    <Button disabled={isLoading}>
                      <LogOut className="size-4 hidden sm:block" />
                      退出登录
                    </Button>
                  }
                  title="确定退出登录吗？"
                  description="退出后需要重新登录才能下单和查看订单。"
                  confirmText="退出登录"
                  confirmVariant="destructive"
                  onConfirm={handleLogout}
                />
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
