import { getErrorMessage } from "@/lib/utils";
import { orderService } from "@/service/api/order.service";
import { CreateOrderRequest, Order } from "@/types/order.type";
import { useCallback, useState } from "react";

export const useOrder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return { isLoading, error, createOrder };
};
