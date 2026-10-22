"use client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Order, OrderStatus } from "@/types/order.type";
import { format } from "date-fns";
import Link from "next/link";

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "待支付",
  // 付款成功后后端置为 PROCESSING，对用户而言即已支付、等待发货
  PROCESSING: "待发货",
  SHIPPED: "已发货",
  DELIVERED: "已送达",
  CANCELLED: "已取消",
};

const statusClassNames: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PROCESSING: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  SHIPPED: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  DELIVERED: "bg-green-500/15 text-green-700 dark:text-green-400",
  CANCELLED: "bg-muted text-muted-foreground",
};

interface OrderCardProps {
  order: Order;
  isCancelling?: boolean;
  onCancel: (id: string) => void;
}

export const OrderCard = ({
  order,
  isCancelling,
  onCancel,
}: OrderCardProps) => {
  const totalQuantity = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <article className="bg-card rounded-md shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <time dateTime={order.createdAt} className="font-medium">
            {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
          </time>
          <span className="text-muted-foreground">
            订单号：<span className="font-mono">{order.id}</span>
          </span>
        </div>
        <Badge className={cn(statusClassNames[order.status])}>
          {orderStatusLabels[order.status]}
        </Badge>
      </header>
      <Separator />
      <ul className="divide-y px-6">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 py-3 text-sm"
          >
            <Link
              href={`/product/${item.productId}`}
              className="min-w-0 truncate hover:underline"
            >
              {item.productName}
            </Link>
            <div className="flex shrink-0 items-center gap-4">
              <span className="text-muted-foreground font-mono">
                {formatPrice(item.price)} × {item.quantity}
              </span>
              <span className="w-24 text-right font-mono">
                {formatPrice(item.subtotal)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <Separator />
      <footer className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          收货地址：{order.shippingAddress || "--"}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            共 {totalQuantity} 件，合计
            <span className="ml-1 text-lg font-mono font-black">
              {formatPrice(order.total)}
            </span>
          </span>
          {order.status === "PENDING" && (
            <>
              <ConfirmDialog
                trigger={
                  <Button variant="outline" size="sm" disabled={isCancelling}>
                    {isCancelling ? "取消中..." : "取消订单"}
                  </Button>
                }
                title="确定取消该订单吗？"
                description="取消后订单无法恢复，商品库存将被释放。"
                confirmText="取消订单"
                cancelText="再想想"
                confirmVariant="destructive"
                onConfirm={() => onCancel(order.id)}
              />
              <Button size="sm" asChild disabled={isCancelling}>
                <Link href={`/checkout?orderId=${order.id}`}>去支付</Link>
              </Button>
            </>
          )}
        </div>
      </footer>
    </article>
  );
};

export const OrderCardSkeleton = () => (
  <div className="bg-card rounded-md shadow-sm">
    <div className="flex items-center justify-between px-6 py-4">
      <Skeleton className="h-5 w-72" />
      <Skeleton className="h-5 w-14" />
    </div>
    <Separator />
    <div className="space-y-3 px-6 py-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <Separator />
    <div className="flex justify-end px-6 py-4">
      <Skeleton className="h-6 w-40" />
    </div>
  </div>
);
