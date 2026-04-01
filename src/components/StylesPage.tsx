import { useMemo, useState, useEffect, useCallback } from "react";
import type { Style, ArchitectureObject } from "../lib/types";
import { Button } from "./ui/button";
import { StyleCard } from "./StyleCard";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { updateStyleRelationships } from "../lib/db";
import { Input } from "./ui/input";
import { MultiValueInput } from "./MultiValueInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function StylesPage({
                               workspace,
                               items,
                               styles,
                               onChangeStyles,
                               onOpenObject,
                               openStyleId, // Добавлено: ID открытого стиля
                               onOpenStyle, // Добавлено: обработчик открытия стиля
                           }: {
    workspace: FileSystemDirectoryHandle | null;
    items: ArchitectureObject[];
    styles: Style[];
    onChangeStyles: (next: Style[]) => void;
    onOpenObject: (id: string) => void;
    openStyleId?: string | null; // Добавлено: ID открытого стиля
    onOpenStyle?: (id: string | null) => void; // Добавлено: обработчик открытия стиля
}) {
    const [filters, setFilters] = useState({
        name: "",
        description: "",
        thoughts: "",
        countries: [] as string[],
        cities: [] as string[],
        architects: [] as string[],
        completed: "all" as "all" | "completed" | "uncompleted",
    });
    const [sortField, setSortField] = useState<"name" | "countries" | "cities" | "architects" | "linkedObjects" | "completed">("name");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // Автоматически обновляем связи при изменении объектов
    useEffect(() => {
        const updatedStyles = updateStyleRelationships(items, styles);
        if (JSON.stringify(updatedStyles) !== JSON.stringify(styles)) {
            onChangeStyles(updatedStyles);
        }
    }, [items, styles, onChangeStyles]);

    // Мапа объектов для быстрого доступа
    const objectsMap = useMemo(() => {
        const map = new Map<string, ArchitectureObject>();
        items.forEach(item => map.set(item.id, item));
        return map;
    }, [items]);

    // Мапа стилей с их объектами
    const stylesWithObjects = useMemo(() => {
        return styles.map(style => ({
            style,
            linkedObjects: style.linkedObjects
                .map(id => objectsMap.get(id))
                .filter((obj): obj is ArchitectureObject => obj !== undefined)
                .sort((a, b) => a.name.localeCompare(b.name)) // Сортируем по названию
        }));
    }, [styles, objectsMap]);

    const countrySuggestions = useMemo(() => {
        return Array.from(new Set(styles.flatMap((s) => s.countries))).sort((a, b) => a.localeCompare(b));
    }, [styles]);
    const citySuggestions = useMemo(() => {
        return Array.from(new Set(styles.flatMap((s) => s.cities))).sort((a, b) => a.localeCompare(b));
    }, [styles]);
    const architectSuggestions = useMemo(() => {
        return Array.from(new Set(styles.flatMap((s) => s.architects))).sort((a, b) => a.localeCompare(b));
    }, [styles]);

    const filteredStyles = useMemo(() => {
        const hasAll = (haystack: string[], selected: string[]) =>
            selected.every((v) => haystack.map((x) => x.toLowerCase()).includes(v.toLowerCase()));

        const result = stylesWithObjects.filter(({ style }) => {
            if (filters.name.trim() && !style.name.toLowerCase().includes(filters.name.trim().toLowerCase())) return false;
            if (filters.description.trim() && !style.description.toLowerCase().includes(filters.description.trim().toLowerCase())) return false;
            if (filters.thoughts.trim() && !style.thoughts.toLowerCase().includes(filters.thoughts.trim().toLowerCase())) return false;
            if (!hasAll(style.countries, filters.countries)) return false;
            if (!hasAll(style.cities, filters.cities)) return false;
            if (!hasAll(style.architects, filters.architects)) return false;
            if (filters.completed === "completed" && !style.completed) return false;
            if (filters.completed === "uncompleted" && style.completed) return false;
            return true;
        });

        result.sort((a, b) => {
            const aa = a.style;
            const bb = b.style;
            let cmp = 0;
            if (sortField === "name") cmp = aa.name.localeCompare(bb.name);
            if (sortField === "countries") cmp = (aa.countries[0] ?? "").localeCompare(bb.countries[0] ?? "");
            if (sortField === "cities") cmp = (aa.cities[0] ?? "").localeCompare(bb.cities[0] ?? "");
            if (sortField === "architects") cmp = (aa.architects[0] ?? "").localeCompare(bb.architects[0] ?? "");
            if (sortField === "linkedObjects") cmp = a.linkedObjects.length - b.linkedObjects.length;
            if (sortField === "completed") cmp = Number(aa.completed) - Number(bb.completed);
            return sortDir === "asc" ? cmp : -cmp;
        });
        return result;
    }, [stylesWithObjects, filters, sortField, sortDir]);

    // Состояние для открытой карточки в неконтролируемом режиме
    const [internalOpenId, setInternalOpenId] = useState<string | null>(null);
    const effectiveOpenId = openStyleId !== undefined ? openStyleId : internalOpenId;
    const setOpenId = useCallback((id: string | null) => {
        if (openStyleId === undefined) {
            setInternalOpenId(id);
        }
        onOpenStyle?.(id);
    }, [openStyleId, onOpenStyle]);

    const openStyle = effectiveOpenId ? styles.find(s => s.id === effectiveOpenId) ?? null : null;

    const collapsedStyles = useMemo(() => {
        if (!openStyle) return filteredStyles;
        return filteredStyles.filter(({ style }) => style.id !== openStyle.id);
    }, [filteredStyles, openStyle]);

    const handleAddStyle = useCallback(() => {
        const id = uuidv4();
        const newStyle: Style = {
            id,
            name: "",
            countries: [],
            cities: [],
            architects: [],
            description: "",
            thoughts: "",
            photos: [],
            completed: false,
            linkedObjects: []
        };
        onChangeStyles([newStyle, ...styles]);
        setOpenId(id);
    }, [styles, onChangeStyles, setOpenId]);

    const handleChangeStyle = useCallback((styleId: string, updates: Partial<Style>) => {
        const updated = styles.map(s => s.id === styleId ? { ...s, ...updates } : s);
        onChangeStyles(updateStyleRelationships(items, updated));
    }, [styles, items, onChangeStyles]);

    const handleDeleteStyle = useCallback((styleId: string) => {
        const next = styles.filter(s => s.id !== styleId);
        onChangeStyles(next);
        if (effectiveOpenId === styleId) {
            setOpenId(null);
        }
    }, [styles, effectiveOpenId, onChangeStyles, setOpenId]);

    // Обработчик переключения карточки стиля
    const handleToggleStyle = useCallback((styleId: string) => {
        const newOpenId = effectiveOpenId === styleId ? null : styleId;
        setOpenId(newOpenId);
    }, [effectiveOpenId, setOpenId]);

    return (
        <div className="space-y-4">
            {/* Верхняя панель */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    Показано стилей: {filteredStyles.length} / {styles.length}
                </div>

                <Button
                    type="button"
                    onClick={handleAddStyle}
                >
                    <Plus size={16} />
                    Добавить стиль
                </Button>
            </div>

            <div className="rounded-md border p-3 space-y-3 bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="Название..." value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
                    <Input placeholder="Описание..." value={filters.description} onChange={(e) => setFilters({ ...filters, description: e.target.value })} />
                    <Input placeholder="Мысли..." value={filters.thoughts} onChange={(e) => setFilters({ ...filters, thoughts: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <MultiValueInput dense label="Страны" values={filters.countries} suggestions={countrySuggestions} onChange={(v) => setFilters({ ...filters, countries: v })} />
                    <MultiValueInput dense label="Города" values={filters.cities} suggestions={citySuggestions} onChange={(v) => setFilters({ ...filters, cities: v })} />
                    <MultiValueInput dense label="Архитекторы" values={filters.architects} suggestions={architectSuggestions} onChange={(v) => setFilters({ ...filters, architects: v })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Select value={filters.completed} onValueChange={(v: "all" | "completed" | "uncompleted") => setFilters({ ...filters, completed: v })}>
                        <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Все</SelectItem>
                            <SelectItem value="completed">Только завершенные</SelectItem>
                            <SelectItem value="uncompleted">Только незавершенные</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortField} onValueChange={(v: typeof sortField) => setSortField(v)}>
                        <SelectTrigger><SelectValue placeholder="Сортировка" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">По названию</SelectItem>
                            <SelectItem value="countries">По стране</SelectItem>
                            <SelectItem value="cities">По городу</SelectItem>
                            <SelectItem value="architects">По архитектору</SelectItem>
                            <SelectItem value="linkedObjects">По числу объектов</SelectItem>
                            <SelectItem value="completed">По статусу</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}>
                        Направление: {sortDir === "asc" ? "↑" : "↓"}
                    </Button>
                </div>
            </div>

            {/* Открытая карточка стиля */}
            {openStyle && (
                <div className="space-y-3">
                    <StyleCard
                        workspace={workspace}
                        style={openStyle}
                        open={true}
                        onToggle={() => handleToggleStyle(openStyle.id)}
                        onChange={(next) => handleChangeStyle(openStyle.id, next)}
                        onDelete={() => handleDeleteStyle(openStyle.id)}
                        linkedObjects={openStyle.linkedObjects
                            .map(id => objectsMap.get(id))
                            .filter((obj): obj is ArchitectureObject => obj !== undefined)}
                        onOpenObject={onOpenObject}
                    />
                </div>
            )}

            {/* Сетка карточек стилей */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {collapsedStyles.map(({ style, linkedObjects }) => (
                    <StyleCard
                        key={style.id}
                        workspace={workspace}
                        style={style}
                        open={false}
                        onToggle={() => handleToggleStyle(style.id)}
                        onChange={(next) => handleChangeStyle(style.id, next)}
                        onDelete={() => handleDeleteStyle(style.id)}
                        linkedObjects={linkedObjects}
                        onOpenObject={onOpenObject}
                    />
                ))}
            </div>

            {/* Сообщение если стилей нет */}
            {styles.length === 0 && (
                <div className="rounded-md border bg-card p-8 text-center">
                    <div className="text-lg font-medium mb-2">Стили не найдены</div>
                    <div className="text-sm text-muted-foreground mb-4">
                        Создайте первый стиль или добавьте стили в объекты архитектуры
                    </div>
                    <Button
                        onClick={handleAddStyle}
                    >
                        <Plus size={16} className="mr-2" />
                        Создать первый стиль
                    </Button>
                </div>
            )}
        </div>
    );
}
