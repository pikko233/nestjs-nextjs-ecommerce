import { CheckoutClient } from "@/components/modules/checkout/checkout-client";
import { Suspense } from "react";

const Page = () => {
  return (
    // CheckoutClient 依赖 useSearchParams 读取 orderId，需要包在 Suspense 中
    <Suspense>
      <CheckoutClient />
    </Suspense>
  );
};

export default Page;
