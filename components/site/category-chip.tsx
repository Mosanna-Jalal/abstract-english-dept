import Link from "next/link";
import { toneStyle } from "@/lib/colors";
import { cn } from "@/lib/text";
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
      <span className="dot" aria-hidden />
      {category.name}
    </>
  );
  if (link) {
    return (
      <Link
        href={`/categories/${category.slug}`}
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
