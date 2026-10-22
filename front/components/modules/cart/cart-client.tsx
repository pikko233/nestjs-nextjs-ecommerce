"use client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { ArrowRightIcon, ShoppingCartIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { CartItem } from "./cart-item";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export const CartClient = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items: CartItems, totalItems, totalPrice, clearCart } = useCart();

  const handleCheckout = () => {
    // if (!isAuthenticated) {
    //   router.push("/auth/login?redirect=/cart");
    // }
    router.push("/checkout");
  };

  return (
    <section className="w-full flex flex-1 flex-col p-6 bg-muted/30">
      <div className="container mx-auto flex flex-1 flex-col space-y-4">
        {/* header */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">购物车</h1>
          {CartItems.length > 0 && (
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <XCircleIcon />
                  清空购物车
                </Button>
              }
              title="确定清空购物车吗？"
              description={`购物车中的 ${totalItems} 件商品将被全部移除，此操作无法撤销。`}
              confirmText="清空"
              confirmVariant="destructive"
              onConfirm={clearCart}
            />
          )}
        </div>
        {/* content */}
        {CartItems.length === 0 ? (
          <Empty className="bg-card rounded-md shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCartIcon />
              </EmptyMedia>
              <EmptyTitle>购物车还是空的</EmptyTitle>
              <EmptyDescription>
                去逛逛吧，挑选喜欢的商品加入购物车
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/">去逛逛</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              {CartItems.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
            {/* order summary：大屏下吸顶，top 为 Header 高度 + 间距 */}
            <aside className="flex flex-col gap-4 p-6 bg-card rounded-md shadow-sm lg:sticky lg:top-22">
              <h2 className="text-lg font-semibold">订单摘要</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">商品数量</dt>
                  <dd>{totalItems} 件</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">商品小计</dt>
                  <dd className="font-mono">{formatPrice(totalPrice)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">运费</dt>
                  <dd className="text-muted-foreground">结算时计算</dd>
                </div>
              </dl>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">合计</span>
                <span className="text-2xl font-mono font-black">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              {/* TODO: 结算页完成后接入跳转 */}
              {/* Button 内的 svg 有 pointer-events-none，借助 Button 自带的 group/button 由按钮 hover 驱动图标动画 */}
              <Button size="lg" className="w-full" onClick={handleCheckout}>
                去结算
                <ArrowRightIcon className="transition-transform duration-200 group-hover/button:translate-x-1" />
              </Button>
              <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/">继续购物</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
};
