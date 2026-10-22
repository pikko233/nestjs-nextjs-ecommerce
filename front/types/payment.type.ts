export interface CreatePaymentIntentRequest {
  orderId: string;
  amount: number;
  currency?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentId: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  orderId: string;
}

export type PaymentStatus = "COMPLETED" | "FAILED" | "CANCELLED" | "PENDING";

export interface ConfirmPaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  userId: string;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}
