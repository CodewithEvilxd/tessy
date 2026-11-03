import { cn } from '@/lib/utils';

/** Tessy mark: the calico cat curled up asleep, vector, three colours (public/brand). */
export function TessyMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/tessy-cat.svg" alt="" aria-hidden width={24} height={24} className={cn('size-6 shrink-0', className)} draggable={false} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-serif text-[27px] leading-none tracking-[-0.02em]', className)}>
      <TessyMark className="size-7" />tessy
    </span>
  );
}
