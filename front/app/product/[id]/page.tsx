import { Footer } from "@/components/modules/landing/footer";
import { Header } from "@/components/modules/landing/header";
import {
  ProductDetailClient,
  ProductDetailPageSkeleton,
} from "@/components/modules/product/product-detail-client";
import { Suspense } from "react";

const Page = () => {
  return (
    <div className="flex flex-1 flex-col w-screen h-full">
      <Header />
      {/* ProductDetailClient 依赖 useParams，需要包在 Suspense 中才能预渲染页面外壳 */}
      <Suspense fallback={<ProductDetailPageSkeleton />}>
        <ProductDetailClient />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Page;
