import { useMemo, useState } from "react";
import type { ArchitectureObject } from "../lib/types";
import { Button } from "./ui/button";
import { ObjectCard } from "./ObjectCard";
import { v4 as uuidv4 } from "uuid";
import { Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "../lib/utils";
import { FiltersSortDialog, type Filters, type SortRule } from "./FiltersSortDialog";

function compareStringArray(a: string[], b: string[]) {
    const aFirst = a[0] || "";
    const bFirst = b[0] || "";
    return aFirst.localeCompare(bFirst, undefined, { sensitivity: "base" });
}

function uniqSorted(values: string[]) {
    const s = new Set(values.map((x) => x.trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function norm(s: string) {
    return s.trim().toLowerCase();
}

function includesText(haystack: string, needle: string) {
    const n = norm(needle);
    if (!n) return true;
    return norm(haystack).includes(n);
}

function toNumOrNull(v: string) {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined) {
    const aa = a ?? null;
    const bb = b ?? null;
    // nulls last
    if (aa === null && bb === null) return 0;
    if (aa === null) return 1;
    if (bb === null) return -1;
    return aa - bb;
}

function compareString(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function multiSort(items: ArchitectureObject[], rules: SortRule[]) {
    if (!rules.length) return items;
    const copy = [...items];

    copy.sort((a, b) => {
        for (const r of rules) {
            let cmp = 0;

            if (r.field === "name") {
                cmp = compareString(a.name || "", b.name || "");
            } else if (r.field === "yearStart") {
                cmp = compareNullableNumber(a.yearStart ?? null, b.yearStart ?? null);
            } else if (r.field === "yearEnd") {
                cmp = compareNullableNumber(a.yearEnd ?? null, b.yearEnd ?? null);
            } else if (r.field === "countries") {
                cmp = compareStringArray(a.countries, b.countries);
            } else if (r.field === "cities") {
                cmp = compareStringArray(a.cities, b.cities);
            } else if (r.field === "styles") {
                cmp = compareStringArray(a.styles, b.styles);
            } else if (r.field === "tags") {
                cmp = compareStringArray(a.tags, b.tags);
            }

            if (cmp !== 0) return r.dir === "asc" ? cmp : -cmp;
        }
        return 0;
    });

    return copy;
}

// Функция для проверки совпадения по ИЛИ (OR) для стран и городов
function matchAnySelected(haystack: string[], selected: string[]) {
    if (!selected.length) return true;
    const hs = new Set(haystack.map(norm));
    return selected.some((x) => hs.has(norm(x)));
}

// Функция для проверки совпадения по И (AND) для остальных полей
function matchAllSelected(haystack: string[], selected: string[]) {
    if (!selected.length) return true;
    const hs = new Set(haystack.map(norm));
    return selected.every((x) => hs.has(norm(x)));
}

export function ObjectsPage({
                                workspace,
                                items,
                                openId,
                                setOpenId,
                                onChangeItems,

                                filters,
                                setFilters,

                                sortRules,
                                setSortRules,
                                onOpenStyle, // Добавлено: обработчик открытия стиля
                            }: {
    workspace: FileSystemDirectoryHandle | null;
    items: ArchitectureObject[];
    openId: string | null;
    setOpenId: (id: string | null) => void;
    onChangeItems: (next: ArchitectureObject[]) => void;

    filters: Filters;
    setFilters: (next: Filters) => void;

    sortRules: SortRule[];
    setSortRules: (next: SortRule[]) => void;
    onOpenStyle?: (styleName: string) => void; // Добавлено: обработчик открытия стиля
}) {
    const tagSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.tags)), [items]);
    const architectSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.architects)), [items]);
    const styleSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.styles)), [items]);
    const countrySuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.countries)), [items]);
    const citySuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.cities)), [items]);

    const dupMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const it of items) {
            const k = norm(it.name);
            if (!k) continue;
            m.set(k, (m.get(k) ?? 0) + 1);
        }
        return m;
    }, [items]);

    const [filtersOpen, setFiltersOpen] = useState(false);

    const openItem = openId ? items.find((x) => x.id === openId) ?? null : null;

    const filteredSorted = useMemo(() => {
        const ysMin = toNumOrNull(filters.yearStartMin);
        const ysMax = toNumOrNull(filters.yearStartMax);
        const yeMin = toNumOrNull(filters.yearEndMin);
        const yeMax = toNumOrNull(filters.yearEndMax);

        const filtered = items.filter((it) => {
            // text fields
            if (!includesText(it.name, filters.name)) return false;
            if (!includesText(it.address, filters.address)) return false;
            if (!includesText(it.description ?? "", filters.description)) return false;
            if (!includesText(it.thoughts ?? "", filters.thoughts)) return false;

            // multi-value fields (архитекторы/стили/теги - И)
            if (!matchAllSelected(it.architects, filters.architects)) return false;
            if (!matchAllSelected(it.styles, filters.styles)) return false;
            if (!matchAllSelected(it.tags, filters.tags)) return false;

            // страны и города - ИЛИ
            if (!matchAnySelected(it.countries, filters.countries)) return false;
            if (!matchAnySelected(it.cities, filters.cities)) return false;

            // Фильтр по статусу завершенности
            if (filters.completed === "completed" && !it.completed) return false;
            if (filters.completed === "uncompleted" && it.completed) return false;

            // Фильтр по избранному
            if (filters.favorite === "favorite" && !it.favorite) return false;
            if (filters.favorite === "not_favorite" && it.favorite) return false;

            // years
            const ys = it.yearStart ?? null;
            const ye = it.yearEnd ?? null;

            if (ysMin !== null) {
                if (ys === null) return false;
                if (ys < ysMin) return false;
            }
            if (ysMax !== null) {
                if (ys === null) return false;
                if (ys > ysMax) return false;
            }

            if (yeMin !== null) {
                if (ye === null) return false;
                if (ye < yeMin) return false;
            }
            if (yeMax !== null) {
                if (ye === null) return false;
                if (ye > yeMax) return false;
            }

            return true;
        });

        return multiSort(filtered, sortRules);
    }, [items, filters, sortRules]);
    useMemo(() => {
        if (!openItem) return filteredSorted;
        return filteredSorted.filter((x) => x.id !== openItem.id);
    }, [filteredSorted, openItem]);
    const activeFiltersCount =
        (filters.name.trim() ? 1 : 0) +
        (filters.address.trim() ? 1 : 0) +
        (filters.description.trim() ? 1 : 0) +
        (filters.thoughts.trim() ? 1 : 0) +
        (filters.architects.length ? 1 : 0) +
        (filters.styles.length ? 1 : 0) +
        (filters.tags.length ? 1 : 0) +
        (filters.countries.length ? 1 : 0) +
        (filters.cities.length ? 1 : 0) +
        (filters.yearStartMin.trim() ? 1 : 0) +
        (filters.yearStartMax.trim() ? 1 : 0) +
        (filters.yearEndMin.trim() ? 1 : 0) +
        (filters.yearEndMax.trim() ? 1 : 0) +
        (filters.completed !== "all" ? 1 : 0); // Добавлено

    return (
        <div className="space-y-4">
            <FiltersSortDialog
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                filters={filters}
                setFilters={setFilters}
                sortRules={sortRules}
                setSortRules={setSortRules}
                tagSuggestions={tagSuggestions}
                architectSuggestions={architectSuggestions}
                styleSuggestions={styleSuggestions}
                countrySuggestions={countrySuggestions}
                citySuggestions={citySuggestions}
            />

            {/* Верхняя панель */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setFiltersOpen(true)}>
                        <SlidersHorizontal size={16} />
                        Фильтры и сортировка
                        <span className={cn("ml-2 text-xs text-muted-foreground", activeFiltersCount === 0 && "hidden")}>
              (активно: {activeFiltersCount})
            </span>
                    </Button>

                    <div className="text-sm text-muted-foreground">
                        Показано: {filteredSorted.length} / {items.length}
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={() => {
                        const id = uuidv4();
                        const empty: ArchitectureObject = {
                            id,
                            name: "",
                            yearStart: null,
                            yearEnd: null,
                            architects: [],
                            address: "",
                            coordinates: { lat: null, lng: null },

                            countries: [],
                            cities: [],
                            styles: [],
                            tags: [],
                            description: "",
                            photos: [],
                            thoughts: "",
                            completed: false,
                            favorite: false
                        };
                        onChangeItems([empty, ...items]);
                        setOpenId(id);
                    }}
                >
                    <Plus size={16} />
                    Добавить объект
                </Button>
            </div>

            {/* Сетка карточек */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredSorted.map((it) => {
                    const isOpen = openId === it.id;
                    const key = norm(it.name);
                    const hasDuplicateName = key ? (dupMap.get(key) ?? 0) > 1 : false;

                    return (
                        <div
                            key={it.id}
                            className={cn(
                                // в раскрытом состоянии карточка занимает всю строку сетки
                                isOpen && "col-span-1 sm:col-span-2 xl:col-span-3"
                            )}
                        >
                            <ObjectCard
                                workspace={workspace}
                                item={it}
                                open={isOpen}
                                onToggle={() => setOpenId(isOpen ? null : it.id)}
                                onChange={(next) => onChangeItems(items.map((x) => (x.id === it.id ? next : x)))}
                                onDelete={() => {
                                    const next = items.filter((x) => x.id !== it.id);
                                    onChangeItems(next);
                                    if (openId === it.id) setOpenId(null);
                                }}
                                tagSuggestions={tagSuggestions}
                                architectSuggestions={architectSuggestions}
                                styleSuggestions={styleSuggestions}
                                countrySuggestions={countrySuggestions}
                                citySuggestions={citySuggestions}
                                hasDuplicateName={hasDuplicateName}
                                onStyleClick={onOpenStyle}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
