"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CircleCheckIcon, CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCart } from "@/hooks/use-cart";
import { useOrder } from "@/hooks/use-order";
import { usePayment } from "@/hooks/use-payment";
import { useCartStore } from "@/store/cart";
import { OrderItem } from "@/types/order.type";
import { CheckoutHeader } from "./checkout-header";
import { CheckoutSteps } from "./checkout-steps";
import { PaymentMethods, paymentMethods } from "./payment-methods";
import {
  StripePaymentForm,
  StripePaymentProvider,
} from "./stripe-payment-form";

type Step = 1 | 2 | 3;

export const CheckoutClient = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>("");
  const [orderTotal, setOrderTotal] = useState<number>(0);
  // 防止快速重复点击时创建多个订单（state 更新是异步的，ref 是同步的）
  const creatingRef = useRef(false);

  const router = useRouter();

  const { createOrder, error: orderError } = useOrder();

  const { items, clearCart } = useCart();

  const {
    clientSecret,
    error: paymentError,
    confirmPayment,
    createPaymentIntent,
  } = usePayment();

  // 服务端渲染与 hydration 阶段拿到的是空购物车，需等 persist 从 localStorage 恢复后再判断
  const hasHydrated = useSyncExternalStore(
    (onChange) => useCartStore.persist.onFinishHydration(onChange),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (hasHydrated && items.length === 0 && !orderId) {
      router.push("/cart");
    }
  }, [hasHydrated, items, orderId, router]);

  // 首次选择支付方式时创建订单和 PaymentIntent；
  // 若订单已创建但 PaymentIntent 失败，再次选择时只重试 PaymentIntent
  const createOrderAndPaymentIntent = async () => {
    if (creatingRef.current || clientSecret) return;
    creatingRef.current = true;
    setIsCreatingOrder(true);
    setStripeError(null);

    try {
      let currentOrderId = orderId;
      let amount = orderTotal;

      if (!currentOrderId) {
        const cartItems: OrderItem[] = items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }));

        const order = await createOrder({
          items: cartItems,
          shippingAddress: "test address",
        });

        // 失败原因（如库存不足）已由 useOrder 记录在 orderError 中
        if (!order) return;

        currentOrderId = order.id;
        // 以后端计算的订单金额为准，后端会校验金额是否一致
        amount = order.total;
        setOrderId(order.id);
        setOrderTotal(order.total);
      }

      await createPaymentIntent({
        orderId: currentOrderId,
        amount,
        currency: "cny",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      setStripeError(msg);
    } finally {
      creatingRef.current = false;
      setIsCreatingOrder(false);
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setStripeError(null);
    createOrderAndPaymentIntent();
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setStripeError(null);
    setCurrentStep(2);

    const confirmed = await confirmPayment({
      paymentIntentId,
      orderId,
    });

    if (confirmed?.status === "COMPLETED") {
      clearCart();
      setCurrentStep(3);
    } else {
      setStripeError("已收到付款，但订单确认失败，请联系客服。");
    }
  };

  const handlePaymentError = (message: string) => {
    setStripeError(message);
  };

  const stripeMethodOrder = paymentMethods.find(
    (method) => method.value === selectedMethod,
  )?.stripeMethods;

  const errorMessage = stripeError ?? orderError ?? paymentError;

  return (
    <section className="w-full h-full">
      <div className="container mx-auto h-full p-6 flex flex-col items-center justify-center">
        <div className="w-full">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeftIcon />
            返回
          </Button>
        </div>

        <CheckoutHeader />
        <CheckoutSteps currentStep={currentStep} />

        <div className="w-full max-w-xl space-y-6 py-6">
          {errorMessage && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>支付失败</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {currentStep === 1 && (
            <>
              <PaymentMethods
                selectedMethod={selectedMethod}
                onSelect={handlePaymentMethodSelect}
                disabled={isCreatingOrder}
              />
              {isCreatingOrder && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  正在创建订单...
                </div>
              )}
              {clientSecret && (
                <StripePaymentProvider clientSecret={clientSecret}>
                  <StripePaymentForm
                    amount={orderTotal}
                    paymentMethodOrder={stripeMethodOrder}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </StripePaymentProvider>
              )}
            </>
          )}

          {currentStep === 2 && !errorMessage && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Spinner className="size-8" />
              <p>正在处理支付...</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <CircleCheckIcon className="size-12 text-green-600" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">支付成功</h2>
                <p className="text-sm text-muted-foreground">
                  感谢您的购买，订单已提交。
                </p>
              </div>
              <Button asChild>
                <Link href="/user/order">我的订单</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/">继续购物</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
