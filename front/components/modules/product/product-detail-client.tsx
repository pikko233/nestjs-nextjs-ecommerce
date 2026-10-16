"use client";

import { AppBreadcrumb } from "@/components/common/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/hooks/use-product";
import { Loader } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ProductDetail } from "./product-detail";
import { SimilarProducts } from "./similar-products";

export const ProductDetailClient = () => {
  const { id: productId } = useParams<{ id: string }>();
  const { getProduct, product, isLoading, error } = useProduct();

  useEffect(() => {
    if (productId) {
      getProduct(productId);
    }
  }, [getProduct, productId]);

  // 首次渲染时请求尚未发出，product 和 error 都为空，也按加载中处理，避免闪出"商品不存在"
  if (isLoading || (!product && !error)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-6 flex-1">
        <h2 className="text-2xl font-semibold">商品不存在</h2>
        <p className="text-sm text-muted-foreground">
          你要找的商品不存在或已下架
        </p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 p-6 space-y-4">
      <AppBreadcrumb
        items={[
          { label: "首页", href: "/" },
          { label: product?.name ?? "商品详情" },
        ]}
      />
      <ProductDetail product={product} />
      <SimilarProducts
        category={product.categoryId}
        currentProductId={product.id}
      />
    </div>
  );
};
