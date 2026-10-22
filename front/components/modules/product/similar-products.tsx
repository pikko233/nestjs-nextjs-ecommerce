"use client";

import { useProduct } from "@/hooks/use-product";
import Link from "next/link";
import { useEffect } from "react";
import { ProductCard, ProductCardSkeleton } from "../landing/product-card";

// 加载态与数据态共用同一容器，列宽由 grid 决定，骨架与卡片尺寸一致
const GRID_CLASS = "grid w-full grid-cols-2 gap-4 md:grid-cols-4";

interface Props {
  category: string;
  currentProductId: string;
}

export const SimilarProducts = ({ category, currentProductId }: Props) => {
  const { products, getProducts, isLoading } = useProduct();

  useEffect(() => {
    if (category) {
      getProducts({ category, limit: 8 });
    }
  }, [category, getProducts]);

  const similarProducts = products
    .filter((product) => product.id !== currentProductId)
    .slice(0, 4);

  // 加载完成且没有相似商品时，整块不显示
  if (!isLoading && similarProducts.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto w-full space-y-4 py-10">
      <h2 className="text-2xl font-semibold">相似商品推荐</h2>
      <div className={GRID_CLASS}>
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
          : similarProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <ProductCard product={product} />
              </Link>
            ))}
      </div>
    </section>
  );
};
