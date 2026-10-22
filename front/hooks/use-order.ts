import { getErrorMessage } from "@/lib/utils";
import { orderService } from "@/service/api/order.service";
import {
  CreateOrderRequest,
  Order,
  OrderListResponse,
  OrderQueryParams,
} from "@/types/order.type";
import { useCallback, useState } from "react";

export const useOrder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);

  const createOrder = useCallback(
    async (data: CreateOrderRequest): Promise<Order | null> => {
      setIsLoading(true);
      setError(null);

      try {
        return await orderService.createOrder(data);
      } catch (e) {
        setError(getErrorMessage(e));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getOrders = useCallback(
    async (params?: OrderQueryParams): Promise<OrderListResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await orderService.getOrders(params);
        setOrders(res.data);
        setTotal(res.total);
        return res;
      } catch (e) {
        setError(getErrorMessage(e));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getOrder = useCallback(async (id: string): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      return await orderService.getOrder(id);
    } catch (e) {
      setError(getErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 取消失败时直接抛出，由调用方提示，避免覆盖列表的加载错误
  const cancelOrder = useCallback(async (id: string): Promise<Order> => {
    const cancelled = await orderService.cancelOrder(id);
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? cancelled : order)),
    );
    return cancelled;
  }, []);

  return {
    isLoading,
    error,
    orders,
    total,
    createOrder,
    getOrders,
    getOrder,
    cancelOrder,
  };
};
