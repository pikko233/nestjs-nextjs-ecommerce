import { ApiResponse } from "@/types/api.type";
import { CreateOrderRequest, Order } from "@/types/order.type";
import { apiClient } from "../axios.config";

export const orderService = {
  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<Order>>("/order", data);

    return response.data.data;
  },
};
