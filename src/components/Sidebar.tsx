// Sidebar.tsx (обновленный)
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { PanelLeftClose, PanelLeftOpen, Database, Map as MapIcon, Palette, Home, Gamepad2 } from "lucide-react";

export type AppTab = "objects" | "map" | "styles" | "geoguessr";

export function Sidebar({
                            collapsed,
                            onToggle,
                            activeTab,
                            onChangeTab,
                        }: {
    collapsed: boolean;
    onToggle: () => void;
    activeTab: AppTab;
    onChangeTab: (t: AppTab) => void;
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
                    <Home size={18} />
                    {!collapsed && <div className="font-semibold">Arch DB</div>}
                </div>

                <Button type="button" variant="ghost" size="icon" onClick={onToggle}>
                    {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </Button>
            </div>

            <div className="px-2 space-y-2">
                <button
                    type="button"
                    className={cn(
                        "w-full rounded-md px-3 py-2 text-sm text-left flex items-center gap-2",
                        activeTab === "objects" ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                    onClick={() => onChangeTab("objects")}
                    title="Просмотр и создание объектов"
                >
                    <Database size={16} />
                    {!collapsed && <span>Объекты</span>}
                </button>

                <button
                    type="button"
                    className={cn(
                        "w-full rounded-md px-3 py-2 text-sm text-left flex items-center gap-2",
                        activeTab === "styles" ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                    onClick={() => onChangeTab("styles")}
                    title="Стили архитектуры"
                >
                    <Palette size={16} />
                    {!collapsed && <span>Стили</span>}
                </button>

                <button
                    type="button"
                    className={cn(
                        "w-full rounded-md px-3 py-2 text-sm text-left flex items-center gap-2",
                        activeTab === "map" ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                    onClick={() => onChangeTab("map")}
                    title="Карта"
                >
                    <MapIcon size={16} />
                    {!collapsed && <span>Карта</span>}
                </button>

                <button
                    type="button"
                    className={cn(
                        "w-full rounded-md px-3 py-2 text-sm text-left flex items-center gap-2",
                        activeTab === "geoguessr" ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    )}
                    onClick={() => onChangeTab("geoguessr")}
                    title="Игра - Угадай здание"
                >
                    <Gamepad2 size={16} />
                    {!collapsed && <span>Угадай здание</span>}
                </button>
            </div>

            <div className="mt-auto p-3 text-xs text-muted-foreground">
                {!collapsed && (
                    <div>
                        {/* Можно добавить информацию или действия */}
                    </div>
                )}
            </div>
        </div>
    );
}