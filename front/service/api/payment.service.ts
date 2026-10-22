import { ApiResponse } from "@/types/api.type";
import {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
} from "@/types/payment.type";
import { apiClient } from "../axios.config";

export const paymentService = {
  createPaymentIntent: async (
    data: CreatePaymentIntentRequest,
  ): Promise<CreatePaymentIntentResponse> => {
    const response = await apiClient.post<
      ApiResponse<CreatePaymentIntentResponse>
    >("/payment/create-intent", data);

    return response.data.data;
  },

  confirmPayment: async (
    data: ConfirmPaymentRequest,
  ): Promise<ConfirmPaymentResponse> => {
    const response = await apiClient.post<ApiResponse<ConfirmPaymentResponse>>(
      "/payment/confirm",
      data,
    );

    return response.data.data;
  },
};
