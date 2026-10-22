import { getErrorMessage } from "@/lib/utils";
import { paymentService } from "@/service/api/payment.service";
import {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  CreatePaymentIntentRequest,
} from "@/types/payment.type";
import { useCallback, useState } from "react";

export const usePayment = () => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(
    async (data: CreatePaymentIntentRequest): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await paymentService.createPaymentIntent(data);
        setClientSecret(response.clientSecret);
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const confirmPayment = useCallback(
    async (
      data: ConfirmPaymentRequest,
    ): Promise<ConfirmPaymentResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        return await paymentService.confirmPayment(data);
      } catch (e) {
        setError(getErrorMessage(e));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { clientSecret, isLoading, error, createPaymentIntent, confirmPayment };
};
