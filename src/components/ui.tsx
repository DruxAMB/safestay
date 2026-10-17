import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type LabelHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* Minimal shadcn-style primitives — token classes only. */

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium",
        "transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90",
        variant === "secondary" && "border border-border bg-card text-foreground [@media(hover:hover)]:hover:bg-muted",
        variant === "ghost" && "text-foreground [@media(hover:hover)]:hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground",
          "transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-foreground", className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-card text-card-foreground", className)} {...props} />;
}

export function Badge({ className, tone = "muted", ...props }: HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "success" | "warn" | "danger" | "primary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success-bg text-success",
        tone === "warn" && "bg-warn-bg text-warn",
        tone === "danger" && "bg-danger-bg text-danger",
        tone === "primary" && "bg-primary/40 text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function EmptyState({ title, body, action }: {
  title: string; body: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
