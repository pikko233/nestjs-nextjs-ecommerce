"use client";

import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="w-screen bg-muted p-8 border-t">
      <div className="container mx-auto grid md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-xl font-bold">STOREFRONT</h3>
          <p className="text-sm text-muted-foreground mt-2">
            您的优质好物首选之地。我们精心甄选每一件商品，只为满足您的需求。
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-base font-semibold">购物</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              <Link href="/">全部商品</Link>
            </li>
            <li>
              <Link href="/">商品分类</Link>
            </li>
            <li>
              <Link href="/">新品上架</Link>
            </li>
            <li>
              <Link href="/">限时优惠</Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-base font-semibold">帮助与支持</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              <Link href="/">帮助中心</Link>
            </li>
            <li>
              <Link href="/">联系我们</Link>
            </li>
            <li>
              <Link href="/">配送说明</Link>
            </li>
            <li>
              <Link href="/">退换货</Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-base font-semibold">关于我们</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              <Link href="/">公司简介</Link>
            </li>
            <li>
              <Link href="/">加入我们</Link>
            </li>
            <li>
              <Link href="/">隐私政策</Link>
            </li>
            <li>
              <Link href="/">服务条款</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};
