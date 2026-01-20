import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { MultiValueInput } from "./MultiValueInput";
import type { MarkerAppearanceRules } from "../lib/types";

import { MarkerColorRulesEditor } from "./MarkerColorRulesEditor";

export type MapFilters = {
    architects: string[];
    styles: string[];
    tags: string[];
    countries: string[];
    cities: string[];
    radiusKm: string;
};

export function MapFiltersDialog({
                                     open,
                                     onOpenChange,
                                     filters,
                                     setFilters,
                                     tagSuggestions,
                                     architectSuggestions,
                                     styleSuggestions,
                                     countrySuggestions,
                                     citySuggestions,
                                     markerAppearanceRules,
                                     setMarkerAppearanceRules,
                                 }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;

    filters: MapFilters;
    setFilters: (next: MapFilters) => void;

    tagSuggestions: string[];
    architectSuggestions: string[];
    styleSuggestions: string[];
    countrySuggestions: string[];
    citySuggestions: string[];

    markerAppearanceRules: MarkerAppearanceRules;
    setMarkerAppearanceRules: (next: MarkerAppearanceRules) => void;
}) {
    const activeFiltersCount =
        (filters.architects.length ? 1 : 0) +
        (filters.styles.length ? 1 : 0) +
        (filters.tags.length ? 1 : 0) +
        // Новые фильтры
        (filters.countries.length ? 1 : 0) +
        (filters.cities.length ? 1 : 0) +
        (filters.radiusKm.trim() ? 1 : 0);

    const radiusHint = useMemo(() => {
        const t = filters.radiusKm.trim();
        if (!t) return null;
        const n = Number(t);
        if (!Number.isFinite(n) || n <= 0) return "Радиус должен быть числом > 0";
        return null;
    }, [filters.radiusKm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Фильтры карты
                        {activeFiltersCount > 0 && <Badge variant="secondary">Активно: {activeFiltersCount}</Badge>}
                    </DialogTitle>
                    <DialogDescription />
                </DialogHeader>

                <div className="space-y-5">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <MultiValueInput
                                dense
                                label="Архитекторы (фильтр)"
                                placeholder="Добавьте значения..."
                                values={filters.architects}
                                suggestions={architectSuggestions}
                                onChange={(v) => setFilters({ ...filters, architects: v })}
                            />
                            <MultiValueInput
                                dense
                                label="Стили (фильтр)"
                                placeholder="Добавьте значения..."
                                values={filters.styles}
                                suggestions={styleSuggestions}
                                onChange={(v) => setFilters({ ...filters, styles: v })}
                            />
                            <MultiValueInput
                                dense
                                label="Теги (фильтр)"
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
                                label="Страны (фильтр) - ИЛИ"
                                placeholder="Добавьте страны..."
                                values={filters.countries}
                                suggestions={countrySuggestions}
                                onChange={(v) => setFilters({ ...filters, countries: v })}
                            />
                            <MultiValueInput
                                dense
                                label="Города (фильтр) - ИЛИ"
                                placeholder="Добавьте города..."
                                values={filters.cities}
                                suggestions={citySuggestions}
                                onChange={(v) => setFilters({ ...filters, cities: v })}
                            />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">Радиус (км)</div>
                                <Input
                                    value={filters.radiusKm}
                                    placeholder="например 2.5"
                                    onChange={(e) => setFilters({ ...filters, radiusKm: e.target.value })}
                                />
                                {radiusHint && <div className="text-xs text-destructive">{radiusHint}</div>}
                                <div className="text-xs text-muted-foreground">
                                    Работает только если на карте выбран центр (клик по карте).
                                </div>
                            </div>

                            <div className="flex gap-2 md:justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        setFilters({
                                            architects: [],
                                            styles: [],
                                            tags: [],
                                            countries: [],
                                            cities: [],
                                            radiusKm: "",
                                        })
                                    }
                                >
                                    Сбросить фильтры
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <MarkerColorRulesEditor
                            rules={markerAppearanceRules}
                            setRules={setMarkerAppearanceRules}
                            tagSuggestions={tagSuggestions}
                            styleSuggestions={styleSuggestions}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}