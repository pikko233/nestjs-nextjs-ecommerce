"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export const Header = () => {
  const [cartItems, setCartItems] = useState(9);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  return (
    <>
      <header className="sticky top-0 w-screen h-16 border-b border-border px-6 z-50 bg-transparent/90 backdrop-blur-md">
        <div className="w-full h-full flex items-center justify-between">
          <Link href="/" className="text-2xl font-black">
            STOREFRONT
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="secondary" size="icon" className="relative">
                <ShoppingCart className="size-4" />
                <Badge className="absolute top-0 left-full -translate-x-[50%] -translate-y-[50%]">
                  {cartItems}
                </Badge>
              </Button>
            </Link>
            {isAuthenticated ? (
              <>
                <Button variant="secondary" size="icon">
                  <LayoutDashboard className="size-4" />
                </Button>
                <Button>退出登录</Button>
              </>
            ) : (
              <Button>登录</Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
