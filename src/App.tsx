import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type AppTab } from "./components/Sidebar";
import { ObjectsPage } from "./components/ObjectsPage";
import { MapPage } from "./components/MapPage";
import type { DbFile } from "./lib/types";
import { emptyDb, ensureImagesDir, readDb, writeDb } from "./lib/db";
import { loadWorkspaceHandle, saveWorkspaceHandle, ensureReadWritePermission } from "./lib/workspace";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { ThemeToggle } from "./components/ThemeToggle";

import type { Filters, SortRule } from "./components/FiltersSortDialog";
import type { MapFilters } from "./components/MapFiltersDialog";
import {
    parseMapFiltersFromUrl,
    parseObjectsFiltersFromUrl,
    parseObjectsSortRulesFromUrl,
    parseTabFromUrl,
    syncMapFiltersToUrl,
    syncObjectsFiltersToUrl,
    syncObjectsSortRulesToUrl,
    syncTabToUrl,
} from "./lib/urlState";

function isFsAccessSupported() {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

const DEFAULT_OBJECTS_SORT: SortRule[] = [
    { id: "sr-1", field: "yearStart", dir: "asc" },
    { id: "sr-2", field: "name", dir: "asc" },
];

const DEFAULT_OBJECTS_FILTERS: Filters = {
    name: "",
    address: "",
    description: "",
    thoughts: "",
    architects: [],
    styles: [],
    tags: [],
    countries: [],
    cities: [],
    yearStartMin: "",
    yearStartMax: "",
    yearEndMin: "",
    yearEndMax: "",
    completed: "all",
};

const DEFAULT_MAP_FILTERS: MapFilters = {
    architects: [],
    styles: [],
    tags: [],
    countries: [],
    cities: [],
    radiusKm: "",
};

export default function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // 1) tab из URL + синхронизация в URL
    const [activeTab, setActiveTab] = useState<AppTab>(() => parseTabFromUrl("objects"));

    // 2) filters/sort из URL + синхронизация в URL
    const [objectsFilters, setObjectsFilters] = useState<Filters>(() => {
        const parsed = parseObjectsFiltersFromUrl();
        return { ...DEFAULT_OBJECTS_FILTERS, ...parsed };
    });

    const [objectsSortRules, setObjectsSortRules] = useState<SortRule[]>(() => {
        return parseObjectsSortRulesFromUrl(DEFAULT_OBJECTS_SORT);
    });

    const [mapFilters, setMapFilters] = useState<MapFilters>(() => {
        const parsed = parseMapFiltersFromUrl();
        return { ...DEFAULT_MAP_FILTERS, ...parsed };
    });

    const [workspace, setWorkspace] = useState<FileSystemDirectoryHandle | null>(null);
    const [db, setDb] = useState<DbFile>(emptyDb());
    const [openId, setOpenId] = useState<string | null>(null);

    const [status, setStatus] = useState<{ kind: "idle" | "loading" | "saving" | "saved" | "error"; message?: string }>(
        { kind: "idle" }
    );

    // при смене state -> URL
    useEffect(() => {
        syncTabToUrl(activeTab);
    }, [activeTab]);

    useEffect(() => {
        syncObjectsFiltersToUrl(objectsFilters);
    }, [objectsFilters]);

    useEffect(() => {
        syncObjectsSortRulesToUrl(objectsSortRules);
    }, [objectsSortRules]);

    useEffect(() => {
        syncMapFiltersToUrl(mapFilters);
    }, [mapFilters]);

    // (опционально) реагировать на back/forward
    useEffect(() => {
        const onPopState = () => {
            setActiveTab(parseTabFromUrl("objects"));

            const of = parseObjectsFiltersFromUrl();
            setObjectsFilters({ ...DEFAULT_OBJECTS_FILTERS, ...of });

            setObjectsSortRules(parseObjectsSortRulesFromUrl(DEFAULT_OBJECTS_SORT));

            const mf = parseMapFiltersFromUrl();
            setMapFilters({ ...DEFAULT_MAP_FILTERS, ...mf });
        };

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    useEffect(() => {
        (async () => {
            if (!isFsAccessSupported()) {
                setStatus({
                    kind: "error",
                    message: "File System Access API не поддерживается в этом браузере. Используйте Chrome/Edge.",
                });
                return;
            }

            setStatus({ kind: "loading", message: "Загрузка workspace..." });

            const h = await loadWorkspaceHandle();
            if (!h) {
                setStatus({ kind: "idle", message: "Выберите папку базы данных." });
                return;
            }

            const ok = await ensureReadWritePermission(h);
            if (!ok) {
                setStatus({ kind: "idle", message: "Нужно разрешение на запись в папку." });
                return;
            }

            await ensureImagesDir(h);
            const loaded = await readDb(h);
            setWorkspace(h);
            setDb(loaded);
            setStatus({ kind: "saved", message: "База загружена." });
        })();
    }, []);

    const saveTimer = useRef<number | null>(null);
    const lastSerialized = useRef<string>("");

    useEffect(() => {
        if (!workspace) return;

        const serialized = JSON.stringify(db);
        if (serialized === lastSerialized.current) return;

        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        setStatus({ kind: "saving", message: "Сохранение..." });

        saveTimer.current = window.setTimeout(async () => {
            try {
                await writeDb(workspace, db);
                lastSerialized.current = JSON.stringify(db);
                setStatus({ kind: "saved", message: "Сохранено." });
            } catch (e) {
                setStatus({ kind: "error", message: (e as Error).message });
            }
        }, 500);

        return () => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
        };
    }, [db, workspace]);

    const duplicateNames = useMemo(() => {
        const m = new Map<string, number>();
        for (const it of db.items) {
            const k = it.name.trim().toLowerCase();
            if (!k) continue;
            m.set(k, (m.get(k) ?? 0) + 1);
        }
        return Array.from(m.entries())
            .filter(([, c]) => c > 1)
            .map(([k]) => k);
    }, [db.items]);

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((x) => !x)}
                activeTab={activeTab}
                onChangeTab={(t) => setActiveTab(t)}
            />

            <div className="flex-1 h-screen overflow-auto">
                <div className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Workspace</div>
                            <div className="text-sm">{workspace ? "Папка выбрана (доступ на запись есть)" : "Не выбрана"}</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <ThemeToggle />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    if (!isFsAccessSupported()) return;
                                    const h = await (window as any).showDirectoryPicker({ mode: "readwrite" });
                                    const ok = await ensureReadWritePermission(h);
                                    if (!ok) return;

                                    await ensureImagesDir(h);
                                    await saveWorkspaceHandle(h);

                                    const loaded = await readDb(h);
                                    setWorkspace(h);
                                    setDb(loaded);
                                    setStatus({ kind: "saved", message: "Workspace подключен." });
                                }}
                            >
                                Выбрать папку БД
                            </Button>

                            <div className="text-sm text-muted-foreground">
                                {status.kind === "saving" && "Сохранение..."}
                                {status.kind === "saved" && "Сохранено"}
                                {status.kind === "loading" && "Загрузка..."}
                                {status.kind === "error" && `Ошибка: ${status.message ?? ""}`}
                                {status.kind === "idle" && (status.message ?? "")}
                            </div>
                        </div>
                    </div>

                    {duplicateNames.length > 0 && (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            Есть дубли по названию: {duplicateNames.join(", ")}
                        </div>
                    )}

                    <Separator />

                    {activeTab === "objects" && (
                        <ObjectsPage
                            workspace={workspace}
                            items={db.items}
                            openId={openId}
                            setOpenId={setOpenId}
                            onChangeItems={(next) => setDb({ ...db, items: next })}
                            filters={objectsFilters}
                            setFilters={setObjectsFilters}
                            sortRules={objectsSortRules}
                            setSortRules={setObjectsSortRules}
                        />
                    )}

                    {activeTab === "map" && (
                        <MapPage
                            items={db.items}
                            onOpenObject={(id) => {
                                setActiveTab("objects");
                                setOpenId(id);
                            }}
                            markerAppearanceRules={db.markerAppearanceRules ?? { tagIcons: {}, styleColors: {} }}
                            onChangeMarkerAppearanceRules={(next) => setDb({ ...db, markerAppearanceRules: next })}
                            filters={mapFilters}
                            setFilters={setMapFilters}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
