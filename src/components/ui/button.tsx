import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
    size?: "default" | "sm" | "icon";
};

export function Button({
                           className,
                           variant = "default",
                           size = "default",
                           ...props
                       }: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
                variant === "default" &&
                "bg-primary text-primary-foreground hover:opacity-90",
                variant === "secondary" &&
                "bg-secondary text-secondary-foreground hover:opacity-90",
                variant === "outline" &&
                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:opacity-90",
                variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
                size === "default" && "h-9 px-4 py-2",
                size === "sm" && "h-8 px-3",
                size === "icon" && "h-9 w-9",
                className
            )}
            {...props}
        />
    );
}