import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { MultiValueInput } from "./MultiValueInput";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortField = "name" | "yearStart" | "yearEnd" | "countries" | "cities" | "styles" | "tags";
export type SortRule = { id: string; field: SortField; dir: "asc" | "desc" };

export type Filters = {
    name: string;
    address: string;
    description: string;
    thoughts: string;

    architects: string[];
    styles: string[];
    tags: string[];

    countries: string[];
    cities: string[];

    yearStartMin: string;
    yearStartMax: string;
    yearEndMin: string;
    yearEndMax: string;
    completed: "all" | "completed" | "uncompleted";
};

function fieldLabel(f: SortField) {
    if (f === "name") return "Название";
    if (f === "yearStart") return "Год начала";
    if (f === "yearEnd") return "Год окончания";
    if (f === "countries") return "Страна";
    if (f === "cities") return "Город";
    if (f === "styles") return "Стиль";
    return "Тег";
}

function SortableRuleRow({
                             rule,
                             onToggleDir,
                             onRemove,
                         }: {
    rule: SortRule;
    onToggleDir: () => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: rule.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2 rounded-md border bg-card px-2 py-2",
                isDragging && "opacity-80"
            )}
        >
            <button
                type="button"
                className="cursor-grab rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="drag"
                {...attributes}
                {...listeners}
            >
                <GripVertical size={16} />
            </button>

            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{fieldLabel(rule.field)}</div>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={onToggleDir}>
                {rule.dir === "asc" ? "↑" : "↓"}
            </Button>

            <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="remove">
                <Trash2 size={16} />
            </Button>
        </div>
    );
}

export function FiltersSortDialog({
                                      open,
                                      onOpenChange,

                                      filters,
                                      setFilters,

                                      sortRules,
                                      setSortRules,

                                      tagSuggestions,
                                      architectSuggestions,
                                      styleSuggestions,

                                      countrySuggestions,
                                      citySuggestions,
                                  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;

    filters: Filters;
    setFilters: (next: Filters) => void;

    sortRules: SortRule[];
    setSortRules: (next: SortRule[]) => void;

    tagSuggestions: string[];
    architectSuggestions: string[];
    styleSuggestions: string[];

    countrySuggestions: string[];
    citySuggestions: string[];
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const usedFields = useMemo(() => new Set(sortRules.map((r) => r.field)), [sortRules]);
    const availableFields: SortField[] = useMemo(
        () => (["yearStart", "yearEnd", "name", "countries", "cities", "styles", "tags"] as SortField[])
            .filter((f) => !usedFields.has(f)),
        [usedFields]
    );

    function addSortRule(field: SortField) {
        const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
        setSortRules([...sortRules, { id, field, dir: "asc" }]);
    }

    function onDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (!over) return;
        if (active.id === over.id) return;

        const oldIndex = sortRules.findIndex((r) => r.id === active.id);
        const newIndex = sortRules.findIndex((r) => r.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        setSortRules(arrayMove(sortRules, oldIndex, newIndex));
    }

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
        (filters.completed !== "all" ? 1 : 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Фильтры и сортировка
                        {activeFiltersCount > 0 && <Badge variant="secondary">Активно: {activeFiltersCount}</Badge>}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    {/* ФИЛЬТРЫ */}
                    <div className="space-y-3">
                        <div className="text-sm font-medium">Фильтры</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                                value={filters.name}
                                placeholder="Название содержит..."
                                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                            />
                            <Input
                                value={filters.address}
                                placeholder="Адрес содержит..."
                                onChange={(e) => setFilters({ ...filters, address: e.target.value })}
                            />
                            <Input
                                value={filters.description}
                                placeholder="Описание содержит..."
                                onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                            />
                            <Input
                                value={filters.thoughts}
                                placeholder="Мысли содержат..."
                                onChange={(e) => setFilters({ ...filters, thoughts: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <MultiValueInput
                                dense
                                label="Архитекторы"
                                placeholder="Добавьте значения..."
                                values={filters.architects}
                                suggestions={architectSuggestions}
                                onChange={(v) => setFilters({ ...filters, architects: v })}
                            />
                            <MultiValueInput
                                dense
                                label="Стили"
                                placeholder="Добавьте значения..."
                                values={filters.styles}
                                suggestions={styleSuggestions}
                                onChange={(v) => setFilters({ ...filters, styles: v })}
                            />
                            <MultiValueInput
                                dense
                                label="Теги"
                                placeholder="Добавьте значения..."
                                values={filters.tags}
                                suggestions={tagSuggestions}
                                onChange={(v) => setFilters({ ...filters, tags: v })}
                            />
                        </div>

                        {/* Новая сетка для стран и городов */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <MultiValueInput
                                dense
                                label="Страны"
                                placeholder="Добавьте страны..."
                                values={filters.countries}
                                suggestions={countrySuggestions}
                                onChange={(v) => setFilters({ ...filters, countries: v })}
                            />
                            <MultiValueInput
                                dense
                                label="Города"
                                placeholder="Добавьте города..."
                                values={filters.cities}
                                suggestions={citySuggestions}
                                onChange={(v) => setFilters({ ...filters, cities: v })}
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Input
                                value={filters.yearStartMin}
                                placeholder="Год начала от"
                                onChange={(e) => setFilters({ ...filters, yearStartMin: e.target.value })}
                            />
                            <Input
                                value={filters.yearStartMax}
                                placeholder="Год начала до"
                                onChange={(e) => setFilters({ ...filters, yearStartMax: e.target.value })}
                            />
                            <Input
                                value={filters.yearEndMin}
                                placeholder="Год окончания от"
                                onChange={(e) => setFilters({ ...filters, yearEndMin: e.target.value })}
                            />
                            <Input
                                value={filters.yearEndMax}
                                placeholder="Год окончания до"
                                onChange={(e) => setFilters({ ...filters, yearEndMax: e.target.value })}
                            />
                        </div>

                        {/* Фильтр по статусу завершенности */}
                        <div className="grid grid-cols-1 gap-2">
                            <div className="text-xs font-medium text-muted-foreground">Статус объекта</div>
                            <Select
                                value={filters.completed}
                                onValueChange={(value: "all" | "completed" | "uncompleted") =>
                                    setFilters({ ...filters, completed: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все объекты</SelectItem>
                                    <SelectItem value="completed">Только завершенные</SelectItem>
                                    <SelectItem value="uncompleted">Только незавершенные</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    setFilters({
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
                                        completed: "all", // Сброс к значению по умолчанию
                                    })
                                }
                            >
                                Сбросить фильтры
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* СОРТИРОВКА */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-medium">Сортировка</div>

                            <div className="flex flex-wrap gap-2">
                                {availableFields.map((f) => (
                                    <Button
                                        key={f}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addSortRule(f)}
                                    >
                                        <Plus size={16} />
                                        {fieldLabel(f)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {sortRules.length === 0 ? (
                            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                                Сортировка не задана
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                <SortableContext items={sortRules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {sortRules.map((r) => (
                                            <SortableRuleRow
                                                key={r.id}
                                                rule={r}
                                                onToggleDir={() =>
                                                    setSortRules(
                                                        sortRules.map((x) => (x.id === r.id ? { ...x, dir: x.dir === "asc" ? "desc" : "asc" } : x))
                                                    )
                                                }
                                                onRemove={() => setSortRules(sortRules.filter((x) => x.id !== r.id))}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}

                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setSortRules([])}>
                                Сбросить сортировку
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}