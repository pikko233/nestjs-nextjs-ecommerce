import { ApiResponse } from "@/types/api.type";
import {
  CreateOrderRequest,
  Order,
  OrderListResponse,
  OrderQueryParams,
} from "@/types/order.type";
import { apiClient } from "../axios.config";

export const orderService = {
  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<Order>>("/order", data);

    return response.data.data;
  },

  getOrders: async (params?: OrderQueryParams): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>("/order", {
      params,
    });

    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<Order>>(`/order/${id}`);

    return response.data.data;
  },

  // 仅待处理订单可取消，后端会回滚库存
  cancelOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.delete<ApiResponse<Order>>(`/order/${id}`);

    return response.data.data;
  },
};
