import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbEntry {
  label: string;
  // 不传 href 时渲染为纯文本；最后一项始终渲染为当前页，忽略 href
  href?: string;
}

interface AppBreadcrumbProps {
  items: BreadcrumbEntry[];
  // 超过该数量时折叠中间项，只保留首项和最后 maxItems - 1 项
  maxItems?: number;
  className?: string;
}

type DisplayItem = BreadcrumbEntry | "ellipsis";

const getDisplayItems = (
  items: BreadcrumbEntry[],
  maxItems?: number,
): DisplayItem[] => {
  if (!maxItems || maxItems < 2 || items.length <= maxItems) return items;
  return [items[0], "ellipsis", ...items.slice(-(maxItems - 1))];
};

export const AppBreadcrumb = ({
  items,
  maxItems,
  className,
}: AppBreadcrumbProps) => {
  if (items.length === 0) return null;

  const displayItems = getDisplayItems(items, maxItems);

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const key =
            item === "ellipsis" ? "ellipsis" : `${index}-${item.label}`;

          return (
            <Fragment key={key}>
              <BreadcrumbItem>
                {item === "ellipsis" ? (
                  <BreadcrumbEllipsis />
                ) : isLast ? (
                  <BreadcrumbPage className="font-semibold">
                    {item.label}
                  </BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span>{item.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
