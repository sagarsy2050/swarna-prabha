import { Toaster as Sonner } from 'sonner';

/** App-wide toast host. Usage: `import { toast } from 'sonner'`. */
export function Toaster(props) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}

export { toast } from 'sonner';
