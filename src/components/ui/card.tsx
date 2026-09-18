import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui Card, with shadcn's structure and this site's tokens.
 *
 * The composition is shadcn's exactly — Card / CardHeader / CardTitle /
 * CardDescription / CardContent / CardFooter, each a forwardRef'd div taking
 * className — so anything written against shadcn's docs drops straight in.
 *
 * The colours are not shadcn's. `npx shadcn init` rewrites globals.css and
 * tailwind.config with its own --background/--foreground/--muted variables,
 * which would overwrite the warm-neutral and violet ramps this site's design
 * system is built on, and leave two parallel colour vocabularies in one
 * stylesheet. These use the ink- and brand- scales like every other component here.
 */
const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border border-ink-200 bg-white text-ink-900', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-display font-semibold leading-none tracking-tight text-ink-950', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-ink-600', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
