import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { PanelLeftClose, PanelLeftOpen, Database } from "lucide-react";

export function Sidebar({
                            collapsed,
                            onToggle,
                        }: {
    collapsed: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            className={cn(
                "h-screen border-r bg-card",
                "flex flex-col",
                collapsed ? "w-16" : "w-64"
            )}
        >
            <div className="p-3 flex items-center justify-between gap-2">
                <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
                    <Database size={18} />
                    {!collapsed && <div className="font-semibold">Arch DB</div>}
                </div>

                <Button type="button" variant="ghost" size="icon" onClick={onToggle}>
                    {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </Button>
            </div>

            <div className="px-2">
                <div
                    className={cn(
                        "rounded-md px-3 py-2 text-sm",
                        "bg-accent text-accent-foreground"
                    )}
                    title="Просмотр и создание объектов"
                >
                    {collapsed ? "DB" : "Просмотр и создание объектов"}
                </div>
            </div>

            <div className="mt-auto p-3 text-xs text-muted-foreground">
                {!collapsed && (
                    <div>
                        Без бэкенда. Хранение в `db.json` + `images/` через выбранную папку.
                    </div>
                )}
            </div>
        </div>
    );
}