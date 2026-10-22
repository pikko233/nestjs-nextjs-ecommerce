import { NumberBox } from "@/components/common/number-box";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import type { CartItem as CartItemType } from "@/types/cart.type";
import { ImageOff, Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CartItemProps {
  item: CartItemType;
}

export const CartItem = ({ item }: CartItemProps) => {
  const { changeCartItemQuantity, removeCartItem } = useCart();
  const { product } = item;
  // price 可能是 Prisma Decimal 序列化后的字符串，先转成数字再相乘
  const subtotal = Number(product.price) * item.quantity;

  return (
    <div className="flex flex-col md:flex-row gap-4 p-6 bg-card rounded-md shadow-sm">
      {/* image */}
      <Link href={`/product/${product.id}`} className="shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl.trimEnd() ?? ""}
            alt={product.name}
            width={150}
            height={150}
            className="object-cover aspect-square rounded-md"
          />
        ) : (
          <div className="flex size-[150px] items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
      </Link>
      {/* info */}
      <div className="space-y-1 flex-1 min-w-0">
        <span className="text-sm text-muted-foreground">
          {product.category}
        </span>
        <Link href={`/product/${product.id}`} className="block hover:underline">
          <h2 className="text-base font-semibold break-all">{product.name}</h2>
        </Link>
        <p className="text-sm text-muted-foreground break-all line-clamp-2">
          {product.description}
        </p>
        <p className="text-sm font-mono">单价 {formatPrice(product.price)}</p>
      </div>
      {/* quantity & subtotal */}
      <div className="flex md:flex-col items-center md:items-end justify-between gap-4">
        <NumberBox
          value={item.quantity}
          max={Math.max(product.stock, 1)}
          onChange={(value) => changeCartItemQuantity(item.id, value)}
        />
        <span className="text-lg font-mono font-black">
          {formatPrice(subtotal)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => removeCartItem(item.id)}
        >
          <Trash2Icon />
          删除
        </Button>
      </div>
    </div>
  );
};
