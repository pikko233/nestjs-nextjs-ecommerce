import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { Product } from "@/types/product.type";
import { cn } from "cn";
import Image from "next/image";
import { useMemo } from "react";

interface Props {
  product: Product;
}

export const ProductCard = ({ product }: Props) => {
  const hasStock = useMemo(() => product.stock > 0, [product.stock]);

  return (
    <div className="flex flex-col overflow-hidden rounded-md shadow-sm cursor-pointer hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
      <Image
        src={product.imageUrl?.trimEnd() ?? ""}
        alt={product.name}
        width={400}
        height={400}
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
      <div className="flex flex-col gap-1 px-4 py-2 min-h-35 bg-card">
        <div className="space-y-0.5">
          <span className="text-sm text-muted-foreground">
            {product.category}
          </span>
          <h3 className="text-sm font-semibold break-all line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground break-all line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-sm font-mono font-black">
            {formatPrice(product.price)}
          </span>
          <span
            className={cn(
              "text-xs text-[#16a34a] font-semibold whitespace-nowrap tracking-tight",
              !hasStock && "text-[#dc2626]",
            )}
          >
            {hasStock ? `库存 ${product.stock} 件` : "已售罄"}
          </span>
        </div>
      </div>
    </div>
  );
};

// 页面背景本身是 bg-muted，与 Skeleton 默认色相同，这里加深一档以便看清
const SKELETON_BAR = "bg-foreground/10";

// 与 ProductCard 保持相同结构和尺寸：每个骨架条用 my-0.5 补齐到对应文字的行高，避免加载完成时布局跳动
export const ProductCardSkeleton = () => {
  return (
    <div
      aria-hidden
      className="flex flex-col overflow-hidden rounded-md shadow-sm"
    >
      <Skeleton
        className={cn(SKELETON_BAR, "aspect-square w-full rounded-none")}
      />
      <div className="flex flex-1 flex-col px-4 py-2 min-h-30">
        <div className="space-y-0.5">
          {/* 分类：text-sm，行高 20px */}
          <Skeleton className={cn(SKELETON_BAR, "my-0.5 h-4 w-12")} />
          {/* 名称：text-sm */}
          <Skeleton className={cn(SKELETON_BAR, "my-0.5 h-4 w-3/4")} />
          {/* 描述：text-xs，行高 16px，两行合为一个块，避免多出一个 gap；flex 防止上下 margin 合并 */}
          <div className="flex flex-col">
            <Skeleton className={cn(SKELETON_BAR, "my-0.5 h-3 w-full")} />
            <Skeleton className={cn(SKELETON_BAR, "my-0.5 h-3 w-2/3")} />
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <Skeleton className={cn(SKELETON_BAR, "my-0.5 h-4 w-16")} />
          <Skeleton className={cn(SKELETON_BAR, "my-0.5 h-3 w-12")} />
        </div>
      </div>
    </div>
  );
};
