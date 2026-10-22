"use client";

import { AppPagination } from "@/components/common/app-pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrder } from "@/hooks/use-order";
import { getErrorMessage } from "@/lib/utils";
import { OrderStatus } from "@/types/order.type";
import { CircleAlertIcon, PackageIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OrderCard, OrderCardSkeleton, orderStatusLabels } from "./order-card";

type StatusFilter = OrderStatus | "ALL";

const statusFilters: StatusFilter[] = [
  "ALL",
  ...(Object.keys(orderStatusLabels) as OrderStatus[]),
];

const LIMIT = 5;

export const OrderList = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { isLoading, error, orders, total, getOrders, cancelOrder } =
    useOrder();
  const debouncedSearch = useDebounce(search.trim());
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);

  // 搜索词变化时回到第一页（在渲染阶段调整，避免先用旧页码多请求一次）
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  useEffect(() => {
    getOrders({
      page,
      limit: LIMIT,
      status: status === "ALL" ? undefined : status,
      search: debouncedSearch || undefined,
    });
  }, [getOrders, page, status, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilter = status !== "ALL" || debouncedSearch !== "";

  const handleStatusChange = (value: string) => {
    setStatus(value as StatusFilter);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelOrder(id);
      toast.success("订单已取消");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <section className="w-full flex flex-1 flex-col p-6 bg-muted/30">
      <div className="container mx-auto flex flex-1 flex-col gap-4">
        <h1 className="text-2xl font-semibold">我的订单</h1>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={status} onValueChange={handleStatusChange}>
            <TabsList className="max-w-full overflow-x-auto">
              {statusFilters.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {value === "ALL" ? "全部" : orderStatusLabels[value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="按订单号搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card md:w-72"
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>订单加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div
            className="flex flex-col gap-4"
            role="status"
            aria-label="订单加载中"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Empty className="bg-card rounded-md shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>
                {hasFilter ? "没有符合条件的订单" : "还没有订单"}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilter
                  ? "换个筛选条件试试"
                  : "去逛逛吧，挑选喜欢的商品下单"}
              </EmptyDescription>
            </EmptyHeader>
            {!hasFilter && (
              <EmptyContent>
                <Button asChild>
                  <Link href="/">去逛逛</Link>
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isCancelling={cancellingId === order.id}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        {orders.length > 0 && (
          <AppPagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            disabled={isLoading}
            className="pt-4"
          />
        )}
      </div>
    </section>
  );
};
