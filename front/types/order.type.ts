export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: string;
}

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  shippingAddress: string;
  items: OrderItemDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  // 按订单号模糊搜索
  search?: string;
}

// 订单列表接口没有经过 ApiResponse 包装，直接返回分页数据
export interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}
