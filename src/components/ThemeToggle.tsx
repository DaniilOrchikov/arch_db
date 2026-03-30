import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={cn("w-9 h-9 relative", className)}
            title={theme === "light" ? "Переключить на темную тему" : "Переключить на светлую тему"}
        >
            {/* Солнце - видно в светлой теме */}
            <Sun className={cn(
                "h-[1.2rem] w-[1.2rem] transition-all duration-300",
                theme === "light" ? "scale-100 rotate-0" : "scale-0 -rotate-90"
            )} />

            {/* Луна - видно в темной теме */}
            <Moon className={cn(
                "h-[1.2rem] w-[1.2rem] transition-all duration-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"
            )} />

            <span className="sr-only">Переключить тему</span>
        </Button>
    );
}
