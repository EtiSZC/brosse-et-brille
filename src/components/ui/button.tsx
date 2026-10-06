import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-bold ring-offset-background transition-[transform,box-shadow,background-color] duration-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Candy buttons: a solid darker "edge" below that collapses when pressed.
        default:
          "bg-primary text-primary-foreground hover:brightness-105 shadow-[0_6px_0_hsl(var(--primary-shadow))] active:translate-y-1 active:shadow-[0_2px_0_hsl(var(--primary-shadow))]",
        hero:
          "bg-primary text-primary-foreground hover:brightness-105 shadow-[0_6px_0_hsl(var(--primary-shadow)),0_14px_24px_hsl(var(--ink)/0.18)] active:translate-y-1 active:shadow-[0_2px_0_hsl(var(--primary-shadow))]",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-105 shadow-[0_6px_0_hsl(var(--secondary-shadow))] active:translate-y-1 active:shadow-[0_2px_0_hsl(var(--secondary-shadow))]",
        outline:
          "border-[3px] border-ink bg-white text-ink hover:bg-tile shadow-[0_4px_0_hsl(var(--ink)/0.25)] active:translate-y-1 active:shadow-none",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 text-lg",
        sm: "h-10 px-4 text-base",
        lg: "h-16 px-10 text-xl",
        xl: "h-[72px] px-12 text-2xl",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
