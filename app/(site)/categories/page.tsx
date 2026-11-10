import type { Metadata } from "next";
import { NotebookTabs } from "lucide-react";
import { EmptyState, PageIntro } from "@/components/site/bits";
import { Bookshelf } from "@/components/site/bookshelf";
import { PageSheet } from "@/components/site/page-sheet";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Categories",
  description: "Every category in the collection, with the number of abstracts in each.",
};

export default async function CategoriesPage() {
  const all = await getCategories();
  const categories = all.filter((c) => c.count > 0);
  return (
    <PageSheet>
      <PageIntro eyebrow="Browse by category" title="Categories" icon={<NotebookTabs />}>
        Each abstract has been read and filed under one sub-theme. Choose one to read its abstracts.
      </PageIntro>
      <div className="container-page mt-8 sm:mt-10">
        {categories.length ? (
          <Bookshelf categories={categories} all={all} />
        ) : (
          <EmptyState title="No categories yet">Categories appear here once abstracts have been filed under them.</EmptyState>
        )}
      </div>
    </PageSheet>
  );
}
