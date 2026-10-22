"use client";

import { AppBreadcrumb } from "@/components/common/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/hooks/use-product";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ProductDetail, ProductDetailSkeleton } from "./product-detail";
import { SimilarProducts } from "./similar-products";

// 也用作路由页 Suspense 的 fallback，与加载完成后的页面结构保持一致
export const ProductDetailPageSkeleton = () => {
  return (
    <div className="w-full flex-1 p-6 space-y-4">
      <span className="sr-only">加载中...</span>
      {/* 面包屑：text-sm，行高 20px */}
      <Skeleton className="py-1.5 h-4 w-40 bg-foreground/10" />
      <ProductDetailSkeleton />
    </div>
  );
};

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
    return <ProductDetailPageSkeleton />;
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
