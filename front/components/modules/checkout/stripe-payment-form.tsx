"use client";

import React, { type ChangeEvent, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  Appearance,
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/format";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);
export const StripePaymentProvider = ({
  clientSecret,
  children,
}: {
  clientSecret: string;
  children: React.ReactNode;
}) => {
  const appearance: Appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#de6824",
      colorBackground: "#ffffff",
      colorText: "#1e293b",
      colorDanger: "#ef4444",
      fontFamily: "Poppins, sans-serif",
      spacingUnit: "4px",
      borderRadius: "6px",
    },
  };

  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
    // Stripe 表单内的标签、提示与错误信息使用中文
    locale: "zh",
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

type StripePaymentFormProps = {
  amount: number;
  // 控制 PaymentElement 中支付方式的展示顺序，例如 ["card"]
  paymentMethodOrder?: string[];
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
};

// 必须放在 StripePaymentProvider 内部使用
export const StripePaymentForm = ({
  amount,
  paymentMethodOrder,
  onSuccess,
  onError,
}: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: ChangeEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    try {
      // 卡支付不会跳转；支付宝等需要跳转的支付方式会回到 return_url
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "支付失败");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        onError(`支付未完成，当前状态：${paymentIntent?.status ?? "未知"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <PaymentElement options={{ paymentMethodOrder }} />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!stripe || !elements || isSubmitting}
      >
        {isSubmitting && <Spinner />}
        支付 {formatPrice(amount)}
      </Button>
    </form>
  );
};
