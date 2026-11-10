import { BookOpen } from "lucide-react";
import { cn } from "@/lib/text";

/** The site's mark: a gold open book on a claret seal. */
export function Seal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-10 flex-none items-center justify-center overflow-hidden rounded-[0.9rem] bg-[linear-gradient(140deg,#84283a,#5a1722)] text-[#ecd3a0] shadow-[0_6px_16px_-6px_rgb(122_37_51/0.6)]",
        className,
      )}
    >
      <span className="absolute inset-[4px] rounded-[0.62rem] border border-[#e9c98f]/40" />
      <BookOpen className="relative size-[52%]" strokeWidth={1.7} />
    </span>
  );
}
