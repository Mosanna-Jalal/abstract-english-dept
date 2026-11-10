import Link from "next/link";
import { CategoryIcon } from "@/components/ui/category-icon";
import { toneStyle } from "@/lib/colors";
import { cn } from "@/lib/text";
import { TURN_BACK } from "@/lib/turn";
import type { CategoryRef } from "@/lib/types";

export function CategoryChip({
  category,
  link = false,
  className,
}: {
  category: CategoryRef;
  link?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <CategoryIcon category={category} className="size-3.5 flex-none" strokeWidth={2} />
      {category.name}
    </>
  );
  if (link) {
    return (
      <Link
        href={`/categories/${category.slug}`}
        transitionTypes={TURN_BACK}
        className={cn("tone chip transition-opacity hover:opacity-80", className)}
        style={toneStyle(category.color)}
      >
        {content}
      </Link>
    );
  }
  return (
    <span className={cn("tone chip", className)} style={toneStyle(category.color)}>
      {content}
    </span>
  );
}
