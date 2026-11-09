import type { Metadata } from "next";
import { EmptyState, PageIntro } from "@/components/site/bits";
import { CategoryCard } from "@/components/site/category-card";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Categories",
  description: "Every category in the collection, with the number of abstracts in each.",
};

export default async function CategoriesPage() {
  const all = await getCategories();
  const categories = all.filter((c) => c.count > 0);
  return (
    <>
      <PageIntro eyebrow="Browse by category" title="Categories">
        Each abstract has been read and filed under one category. Choose a category to read its abstracts.
      </PageIntro>
      <div className="container-page mt-8 sm:mt-10">
        {categories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <CategoryCard key={c.id} category={c} index={i} number={all.indexOf(c) + 1} />
            ))}
          </div>
        ) : (
          <EmptyState title="No categories yet">Categories appear here once abstracts have been filed under them.</EmptyState>
        )}
      </div>
    </>
  );
}
