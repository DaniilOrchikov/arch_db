import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchitectureObject, MarkerAppearanceRules, Photo } from "../lib/types";
import type { Filters, SortRule } from "./FiltersSortDialog";
import { Button } from "./ui/button";
import { SlidersHorizontal, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { MultiValueInput } from "./MultiValueInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { readWorkspaceFile } from "../lib/photos";

type TimelineItem = ArchitectureObject & { start: number; end: number; row: number };
const ZOOM_SPANS = [1000, 500, 200, 100, 50, 10] as const;

function norm(s: string) {
    return s.trim().toLowerCase();
}

function pickMarkerColor(it: ArchitectureObject, rules?: MarkerAppearanceRules) {
    const r = rules ?? { tagIcons: {}, styleColors: {} };
    for (const s of it.styles) {
        const c = r.styleColors[norm(s)];
        if (c) return c;
    }
    return "#2563eb";
}

function getContrastTextColor(hexColor: string): string {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "#111111" : "#ffffff";
}

function includesText(haystack: string, needle: string) {
    const n = norm(needle);
    if (!n) return true;
    return norm(haystack).includes(n);
}

function matchAnySelected(haystack: string[], selected: string[]) {
    if (!selected.length) return true;
    const hs = new Set(haystack.map(norm));
    return selected.some((x) => hs.has(norm(x)));
}

function matchAllSelected(haystack: string[], selected: string[]) {
    if (!selected.length) return true;
    const hs = new Set(haystack.map(norm));
    return selected.every((x) => hs.has(norm(x)));
}

function toNumOrNull(v: string) {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

async function resolvePhotoSource(workspace: FileSystemDirectoryHandle | null, photo: Photo): Promise<string> {
    if (photo.type === "url") return photo.value.trim();
    if (!workspace) return "";
    const file = await readWorkspaceFile(workspace, photo.value);
    return URL.createObjectURL(file);
}

function TimelineTooltip({ workspace, item }: { workspace: FileSystemDirectoryHandle | null; item: ArchitectureObject }) {
    const [src, setSrc] = useState("");
    const prevSrcRef = useRef("");

    useEffect(() => {
        let alive = true;
        (async () => {
            const first = item.photos?.[0];
            if (!first) {
                if (prevSrcRef.current.startsWith("blob:")) URL.revokeObjectURL(prevSrcRef.current);
                prevSrcRef.current = "";
                setSrc("");
                return;
            }
            const resolved = await resolvePhotoSource(workspace, first);
            if (!alive) {
                if (resolved.startsWith("blob:")) URL.revokeObjectURL(resolved);
                return;
            }
            if (prevSrcRef.current.startsWith("blob:")) URL.revokeObjectURL(prevSrcRef.current);
            prevSrcRef.current = resolved;
            setSrc(resolved);
        })();
        return () => {
            alive = false;
        };
    }, [workspace, item.photos]);

    useEffect(() => {
        return () => {
            if (prevSrcRef.current.startsWith("blob:")) URL.revokeObjectURL(prevSrcRef.current);
        };
    }, []);

    return (
        <div className="space-y-1 w-64">
            {src && <img src={src} alt="" className="h-24 w-full object-cover rounded border" />}
            <div className="font-medium">{item.name || "Без названия"}</div>
            {item.address?.trim() && <div className="text-xs text-muted-foreground">{item.address}</div>}
        </div>
    );
}

export function TimelinePage({
    workspace,
    items,
    filters,
    setFilters,
    setSortRules,
    onOpenObject,
    markerAppearanceRules,
    onChangeMarkerAppearanceRules,
}: {
    workspace: FileSystemDirectoryHandle | null;
    items: ArchitectureObject[];
    filters: Filters;
    setFilters: (next: Filters) => void;
    setSortRules: (next: SortRule[]) => void;
    onOpenObject: (id: string) => void;
    markerAppearanceRules: MarkerAppearanceRules;
    onChangeMarkerAppearanceRules: (next: MarkerAppearanceRules) => void;
}) {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [zoomIndex, setZoomIndex] = useState(3);
    const [startYear, setStartYear] = useState(1700);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const [styleKey, setStyleKey] = useState("");
    const [styleColor, setStyleColor] = useState("#2563eb");

    const filtered = useMemo(() => {
        const ysMin = toNumOrNull(filters.yearStartMin);
        const ysMax = toNumOrNull(filters.yearStartMax);
        const yeMin = toNumOrNull(filters.yearEndMin);
        const yeMax = toNumOrNull(filters.yearEndMax);

        return items.filter((it) => {
            if (!includesText(it.name, filters.name)) return false;
            if (!includesText(it.address, filters.address)) return false;
            if (!includesText(it.description ?? "", filters.description)) return false;
            if (!includesText(it.thoughts ?? "", filters.thoughts)) return false;
            if (!matchAllSelected(it.architects, filters.architects)) return false;
            if (!matchAllSelected(it.styles, filters.styles)) return false;
            if (!matchAllSelected(it.tags, filters.tags)) return false;
            if (!matchAnySelected(it.countries, filters.countries)) return false;
            if (!matchAnySelected(it.cities, filters.cities)) return false;
            if (filters.completed === "completed" && !it.completed) return false;
            if (filters.completed === "uncompleted" && it.completed) return false;
            if (filters.favorite === "favorite" && !it.favorite) return false;
            if (filters.favorite === "not_favorite" && it.favorite) return false;

            const ys = it.yearStart ?? null;
            const ye = it.yearEnd ?? null;
            if (ysMin !== null && (ys === null || ys < ysMin)) return false;
            if (ysMax !== null && (ys === null || ys > ysMax)) return false;
            if (yeMin !== null && (ye === null || ye < yeMin)) return false;
            if (yeMax !== null && (ye === null || ye > yeMax)) return false;
            return true;
        });
    }, [items, filters]);

    const spanYears = ZOOM_SPANS[zoomIndex];
    const endYear = startYear + spanYears;

    const arrangedWithRows = useMemo(() => {
        const arranged = filtered
            .filter((it) => it.yearStart != null || it.yearEnd != null)
            .map((it) => ({
                ...it,
                start: it.yearStart ?? it.yearEnd ?? 0,
                end: it.yearEnd ?? it.yearStart ?? 0,
            }))
            .sort((a, b) => a.start - b.start);

        const rowEnds: number[] = [];
        const withRows: TimelineItem[] = [];
        for (const item of arranged) {
            let row = rowEnds.findIndex((lastEnd) => item.start > lastEnd);
            if (row === -1) {
                row = rowEnds.length;
                rowEnds.push(item.end);
            } else {
                rowEnds[row] = item.end;
            }
            withRows.push({ ...item, row });
        }
        return withRows;
    }, [filtered]);

    const timelineItems = useMemo(() => arrangedWithRows.filter((it) => it.end >= startYear && it.start <= endYear), [arrangedWithRows, startYear, endYear]);

    const visibleHovered = hoveredId ? timelineItems.find((i) => i.id === hoveredId) ?? null : null;
    const styleSuggestions = useMemo(() => Array.from(new Set(items.flatMap((i) => i.styles))).sort((a, b) => a.localeCompare(b)), [items]);

    const yearTicks = useMemo(() => {
        const ticks: number[] = [];
        const step = spanYears <= 50 ? 10 : spanYears <= 200 ? 20 : 50;
        for (let y = Math.floor(startYear / step) * step; y <= endYear; y += step) ticks.push(y);
        return ticks;
    }, [startYear, endYear, spanYears]);

    const maxRow = useMemo(() => (timelineItems.length ? Math.max(...timelineItems.map((i) => i.row)) : 0), [timelineItems]);
    const contentHeight = Math.max((maxRow + 1) * 46 + 24, 240);

    return (
        <div className="space-y-4">
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Фильтры хронологии</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input value={filters.name} placeholder="Название" onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
                            <Input value={filters.address} placeholder="Адрес" onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
                            <Input value={filters.description} placeholder="Описание" onChange={(e) => setFilters({ ...filters, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <MultiValueInput dense label="Стили" values={filters.styles} suggestions={styleSuggestions} onChange={(v) => setFilters({ ...filters, styles: v })} />
                            <MultiValueInput dense label="Страны" values={filters.countries} suggestions={Array.from(new Set(items.flatMap((i) => i.countries)))} onChange={(v) => setFilters({ ...filters, countries: v })} />
                            <MultiValueInput dense label="Города" values={filters.cities} suggestions={Array.from(new Set(items.flatMap((i) => i.cities)))} onChange={(v) => setFilters({ ...filters, cities: v })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input value={filters.yearStartMin} placeholder="Год начала от" onChange={(e) => setFilters({ ...filters, yearStartMin: e.target.value })} />
                            <Input value={filters.yearEndMax} placeholder="Год окончания до" onChange={(e) => setFilters({ ...filters, yearEndMax: e.target.value })} />
                            <Select value={filters.completed} onValueChange={(v: "all" | "completed" | "uncompleted") => setFilters({ ...filters, completed: v })}>
                                <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все</SelectItem>
                                    <SelectItem value="completed">Завершенные</SelectItem>
                                    <SelectItem value="uncompleted">Незавершенные</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-md border p-2 space-y-2">
                            <div className="text-sm font-medium">Цвет карточек по стилям</div>
                            <div className="flex gap-2">
                                <Input value={styleKey} placeholder="Стиль" onChange={(e) => setStyleKey(e.target.value)} />
                                <Input type="color" value={styleColor} onChange={(e) => setStyleColor(e.target.value)} className="w-16 p-1" />
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const key = styleKey.trim().toLowerCase();
                                        if (!key) return;
                                        onChangeMarkerAppearanceRules({
                                            ...markerAppearanceRules,
                                            styleColors: { ...markerAppearanceRules.styleColors, [key]: styleColor },
                                        });
                                        setStyleKey("");
                                    }}
                                >
                                    Добавить
                                </Button>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1">
                                {Object.entries(markerAppearanceRules.styleColors).map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block h-3 w-3 rounded-full" style={{ background: v }} />
                                            {k}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                const next = { ...markerAppearanceRules.styleColors };
                                                delete next[k];
                                                onChangeMarkerAppearanceRules({ ...markerAppearanceRules, styleColors: next });
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button type="button" variant="outline" onClick={() => setSortRules([])}>Очистить сортировку</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal size={16} />
                    Фильтры
                </Button>
                <Button type="button" variant="outline" onClick={() => setStartYear((y) => y - Math.floor(spanYears / 4))}>
                    <ChevronLeft size={16} /> Назад
                </Button>
                <Button type="button" variant="outline" onClick={() => setStartYear((y) => y + Math.floor(spanYears / 4))}>
                    Вперёд <ChevronRight size={16} />
                </Button>
                <div className="ml-2 text-sm text-muted-foreground">Масштаб</div>
                <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    list="timeline-zoom-marks"
                    value={zoomIndex}
                    onChange={(e) => setZoomIndex(Number(e.target.value))}
                />
                <div className="text-sm">{spanYears} лет</div>
                <div className="text-sm text-muted-foreground">{startYear} — {endYear}</div>
                <datalist id="timeline-zoom-marks">
                    {ZOOM_SPANS.map((span, idx) => (
                        <option key={span} value={idx} label={`${span}`} />
                    ))}
                </datalist>
            </div>

            <div className="rounded-md border bg-card h-[calc(100vh-230px)] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto relative px-3 pt-3">
                    <div className="relative" style={{ height: `${contentHeight}px` }}>
                        {yearTicks.map((year) => {
                            const left = ((year - startYear) / spanYears) * 100;
                            return (
                                <div key={year} className="absolute top-0 bottom-0" style={{ left: `${left}%` }}>
                                    <div className="h-full w-px bg-border/50" />
                                </div>
                            );
                        })}

                        {timelineItems.map((item) => {
                            const left = ((item.start - startYear) / spanYears) * 100;
                            const width = Math.max(((item.end - item.start) / spanYears) * 100, 4);
                            const color = pickMarkerColor(item, markerAppearanceRules);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onMouseEnter={(e) => {
                                        setHoveredId(item.id);
                                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                                        setHoverPos({
                                            x: e.currentTarget.getBoundingClientRect().left - rect.left + e.currentTarget.clientWidth / 2,
                                            y: e.currentTarget.getBoundingClientRect().top - rect.top,
                                        });
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredId((id) => (id === item.id ? null : id));
                                        setHoverPos(null);
                                    }}
                                    onClick={() => onOpenObject(item.id)}
                                    className="absolute rounded px-2 py-1 text-left shadow hover:brightness-110"
                                    style={{
                                        left: `${left}%`,
                                        width: `${Math.min(width, 35)}%`,
                                        top: `${item.row * 46 + 10}px`,
                                        background: color,
                                        color: getContrastTextColor(color),
                                    }}
                                >
                                    <div className="truncate">{item.name || "Без названия"}</div>
                                </button>
                            );
                        })}

                        {visibleHovered && hoverPos && (
                            <div
                                className="absolute z-20 rounded-md border bg-background p-2 shadow-xl -translate-x-1/2 -translate-y-full pointer-events-none"
                                style={{ left: hoverPos.x, top: hoverPos.y - 8 }}
                            >
                                <TimelineTooltip workspace={workspace} item={visibleHovered} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 border-t bg-card px-3 py-2">
                    <div className="relative h-8">
                        {yearTicks.map((year) => {
                            const left = ((year - startYear) / spanYears) * 100;
                            return (
                                <div key={`label-${year}`} className="absolute top-0" style={{ left: `${left}%` }}>
                                    <div className="h-2 w-px bg-foreground/50 mx-auto" />
                                    <div className="text-xs text-muted-foreground -translate-x-1/2">{year}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
