import { Footer } from "@/components/modules/landing/footer";
import { Header } from "@/components/modules/landing/header";
import { ProductDetailClient } from "@/components/modules/product/product-detail-client";
import { Suspense } from "react";

const Page = () => {
  return (
    <div className="flex flex-col w-screen h-screen">
      <Header />
      <Suspense fallback={<div>加载中...</div>}>
        <ProductDetailClient />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Page;
