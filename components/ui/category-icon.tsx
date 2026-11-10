import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { categoryIcon } from "@/lib/category-icons";

/** The icon chosen for a category (see lib/category-icons.ts). */
export function CategoryIcon({ category, ...props }: { category: { slug: string; name: string } } & LucideProps) {
  return createElement(categoryIcon(category), { "aria-hidden": true, ...props });
}
