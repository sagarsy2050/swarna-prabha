/**
 * Compatibility shim. The original Base44 app used a Radix-based `useToast()`
 * returning `{ toast }` where `toast({ title, description, variant })`. This maps
 * that call shape onto `sonner`, so migrated pages didn't need rewriting.
 */
import { toast as sonnerToast } from 'sonner';

function toast({ title, description, variant } = {}) {
  const msg = title || description || '';
  const opts = description && title ? { description } : undefined;
  if (variant === 'destructive') return sonnerToast.error(msg, opts);
  return sonnerToast(msg, opts);
}

export function useToast() {
  return { toast };
}

export { toast };
export default useToast;
