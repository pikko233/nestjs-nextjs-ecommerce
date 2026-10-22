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
