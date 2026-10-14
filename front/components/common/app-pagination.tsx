"use client";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { MouseEvent } from "react";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

interface AppPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // 当前页左右各显示几个页码
  siblingCount?: number;
  disabled?: boolean;
  className?: string;
}

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

// 始终显示首页、末页和当前页附近的页码，其余用省略号代替，例如：1 … 4 5 6 … 10
export const getPageItems = (
  page: number,
  totalPages: number,
  siblingCount = 1,
): PageItem[] => {
  // 首页 + 末页 + 当前页 + 两侧 sibling + 两个省略号
  const maxVisible = siblingCount * 2 + 5;
  if (totalPages <= maxVisible) return range(1, totalPages);

  const leftSibling = Math.max(page - siblingCount, 2);
  const rightSibling = Math.min(page + siblingCount, totalPages - 1);
  const showLeftEllipsis = leftSibling > 3;
  const showRightEllipsis = rightSibling < totalPages - 2;
  // 省略号只在至少省略两页时出现，靠近两端时用页码补齐，保证总数不变
  const edgeCount = siblingCount * 2 + 3;

  if (!showLeftEllipsis) {
    return [...range(1, edgeCount), "ellipsis-end", totalPages];
  }
  if (!showRightEllipsis) {
    return [
      1,
      "ellipsis-start",
      ...range(totalPages - edgeCount + 1, totalPages),
    ];
  }
  return [
    1,
    "ellipsis-start",
    ...range(leftSibling, rightSibling),
    "ellipsis-end",
    totalPages,
  ];
};

export const AppPagination = ({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  disabled = false,
  className,
}: AppPaginationProps) => {
  if (totalPages <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  // 页码链接是 <a href="#">，分页由组件状态驱动而非 URL，需阻止默认跳转
  const handlePageClick = (target: number) => (e: MouseEvent) => {
    e.preventDefault();
    if (disabled || target === page) return;
    onPageChange(target);
  };

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="secondary"
            aria-label="上一页"
            disabled={isFirst || disabled}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:inline">上一页</span>
          </Button>
        </PaginationItem>

        {getPageItems(page, totalPages, siblingCount).map((item) =>
          typeof item === "number" ? (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === page}
                aria-label={`第 ${item} 页`}
                className={cn(disabled && "pointer-events-none opacity-50")}
                onClick={handlePageClick(item)}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <Button
            variant="secondary"
            aria-label="下一页"
            disabled={isLast || disabled}
            onClick={() => onPageChange(page + 1)}
          >
            <span className="hidden sm:inline">下一页</span>
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
