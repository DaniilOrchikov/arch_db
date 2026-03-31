import { useMemo, useState } from "react";
import type { ArchitectureObject } from "../lib/types";
import type { Filters, SortRule } from "./FiltersSortDialog";
import { FiltersSortDialog } from "./FiltersSortDialog";
import { Button } from "./ui/button";
import { SlidersHorizontal } from "lucide-react";

function norm(s: string) {
    return s.trim().toLowerCase();
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

export function TimelinePage({
    items,
    filters,
    setFilters,
    sortRules,
    setSortRules,
    onOpenObject,
}: {
    items: ArchitectureObject[];
    filters: Filters;
    setFilters: (next: Filters) => void;
    sortRules: SortRule[];
    setSortRules: (next: SortRule[]) => void;
    onOpenObject: (id: string) => void;
}) {
    const [filtersOpen, setFiltersOpen] = useState(false);

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

    const timelineItems = useMemo(() => {
        const withYears = filtered
            .filter((it) => it.yearStart != null || it.yearEnd != null)
            .map((it) => ({
                ...it,
                start: it.yearStart ?? it.yearEnd ?? 0,
                end: it.yearEnd ?? it.yearStart ?? 0,
            }))
            .sort((a, b) => a.start - b.start);
        return withYears;
    }, [filtered]);

    const minYear = useMemo(() => Math.min(...timelineItems.map((it) => it.start), 0), [timelineItems]);
    const maxYear = useMemo(() => Math.max(...timelineItems.map((it) => it.end), 1), [timelineItems]);
    const range = Math.max(maxYear - minYear, 1);

    return (
        <div className="space-y-4">
            <FiltersSortDialog
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                filters={filters}
                setFilters={setFilters}
                sortRules={sortRules}
                setSortRules={setSortRules}
                tagSuggestions={Array.from(new Set(items.flatMap((i) => i.tags)))}
                architectSuggestions={Array.from(new Set(items.flatMap((i) => i.architects)))}
                styleSuggestions={Array.from(new Set(items.flatMap((i) => i.styles)))}
                countrySuggestions={Array.from(new Set(items.flatMap((i) => i.countries)))}
                citySuggestions={Array.from(new Set(items.flatMap((i) => i.cities)))}
            />

            <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal size={16} />
                    Фильтры и сортировка
                </Button>
                <div className="text-sm text-muted-foreground">Объектов на шкале: {timelineItems.length}</div>
            </div>

            <div className="rounded-md border p-4 overflow-x-auto">
                <div className="relative min-w-[900px] h-[420px]">
                    <div className="absolute top-8 left-0 right-0 h-[2px] bg-border" />
                    {timelineItems.map((item, idx) => {
                        const left = ((item.start - minYear) / range) * 100;
                        const width = Math.max(((item.end - item.start) / range) * 100, 1);
                        const row = idx % 8;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className="absolute text-left rounded border bg-card hover:bg-accent/40 px-2 py-1 text-xs"
                                style={{
                                    left: `${left}%`,
                                    width: `${Math.min(width + 2, 28)}%`,
                                    top: `${40 + row * 44}px`,
                                }}
                                onClick={() => onOpenObject(item.id)}
                                title={`${item.start}–${item.end}`}
                            >
                                <div className="font-medium truncate">{item.name || "Без названия"}</div>
                                <div className="text-[11px] text-muted-foreground">
                                    {item.start} — {item.end}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
