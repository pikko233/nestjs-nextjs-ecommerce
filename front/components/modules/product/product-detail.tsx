import { NumberBox } from "@/components/common/number-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { Product } from "@/types/product.type";
import { cn } from "cn";
import { ImageOff, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

export const ProductDetail = ({ product }: { product: Product }) => {
  const [quantity, setQuantity] = useState(1);
  const hasStock = useMemo(() => product.stock > 0, [product]);
  const { addProductToCart } = useCart();

  const handleAddToCart = () => {
    setQuantity(1);
    alert(`add ${quantity} ${product.name} to cart`);
    addProductToCart(product, quantity);
  };

  return (
    <div className="container mx-auto grid grid-cols-1 gap-8 md:grid-cols-5 md:gap-12">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl.trimEnd()}
          alt={product.name}
          width={600}
          height={600}
          className="aspect-square w-full rounded-lg object-cover md:col-span-3"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-muted-foreground md:col-span-3">
          <ImageOff className="size-12" />
        </div>
      )}
      <div className="flex flex-col gap-6 md:col-span-2 md:py-2">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary">{product.category}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {product.name}
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">
              ¥{product.price.toFixed(2)}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                hasStock ? "text-green-600" : "text-destructive",
              )}
            >
              {hasStock ? `库存 ${product.stock} 件` : "已售罄"}
            </span>
          </div>
        </div>

        {product.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        <Separator />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">数量</span>
            <NumberBox
              value={quantity}
              onChange={setQuantity}
              max={product.stock}
              disabled={!hasStock}
            />
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!hasStock}
            onClick={handleAddToCart}
          >
            <ShoppingCart />
            {hasStock ? "添加至购物车" : "暂无库存"}
          </Button>
        </div>

        <Separator />

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">规格</dt>
          <dd className="font-medium">{product.sku}</dd>
          <dt className="text-muted-foreground">分类</dt>
          <dd className="font-medium">{product.category}</dd>
        </dl>
      </div>
    </div>
  );
};
