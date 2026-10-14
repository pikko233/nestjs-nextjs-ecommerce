"use client";

import { AppPagination } from "@/components/common/app-pagination";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useProduct } from "@/hooks/use-product";
import { useEffect, useState } from "react";
import { ProductCard, ProductCardSkeleton } from "./product-card";

const GRID_CLASS = "grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

export const ProductList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { isLoading, products, getProducts, error, meta } = useProduct();
  const debouncedSearch = useDebounce(search.trim());
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  const limit = 12;

  // 搜索词变化时回到第一页（在渲染阶段调整，避免先用旧页码多请求一次）
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  useEffect(() => {
    getProducts({ page, limit, search: debouncedSearch });
  }, [getProducts, page, limit, debouncedSearch]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-8 container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">全部商品</h2>
        <p className="text-sm text-muted-foreground">
          探索我们精心挑选的优质商品
        </p>
      </div>
      <Input
        placeholder="搜索商品"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-[50%]"
      />
      {isLoading ? (
        <div className={GRID_CLASS} role="status" aria-label="商品加载中">
          {Array.from({ length: limit }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        debouncedSearch ? (
          <div>未找到与“{debouncedSearch}”相关的商品</div>
        ) : (
          <div>暂无商品</div>
        )
      ) : (
        <div className={GRID_CLASS}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {products.length > 0 && (
        <AppPagination
          page={page}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
          disabled={isLoading}
          className="pt-4"
        />
      )}
    </div>
  );
};
