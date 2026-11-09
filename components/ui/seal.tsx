import { cn } from "@/lib/text";

/** The site's monogram: an italic serif "A" in a claret seal with a gold ring. */
export function Seal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-10 flex-none items-center justify-center overflow-hidden rounded-[0.9rem] bg-[#7a2533] text-[#fff8f2] shadow-[0_6px_16px_-6px_rgb(122_37_51/0.6)]",
        className,
      )}
    >
      <span className="absolute inset-[5px] rounded-full border border-[#e9c98f]/50" />
      <span className="font-serif text-[1.35rem] italic leading-none">A</span>
    </span>
  );
}
