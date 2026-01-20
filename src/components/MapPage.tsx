import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import type { ArchitectureObject, Coordinates, MarkerAppearanceRules } from "../lib/types";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { SlidersHorizontal, X } from "lucide-react";
import { MapFiltersDialog, type MapFilters } from "./MapFiltersDialog";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png?url";
import markerIcon from "leaflet/dist/images/marker-icon.png?url";
import markerShadow from "leaflet/dist/images/marker-shadow.png?url";

const EMPTY_RULES: MarkerAppearanceRules = { tagIcons: {}, styleColors: {} };

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function norm(s: string) {
    return s.trim().toLowerCase();
}

function uniqSorted(values: string[]) {
    const s = new Set(values.map((x) => x.trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
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

function toNumOrNull(v: string) {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const sin1 = Math.sin(dLat / 2);
    const sin2 = Math.sin(dLng / 2);

    const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function hasCoords(c: Coordinates) {
    return c.lat != null && c.lng != null && Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

function ClickToSetCenter({ onPick }: { onPick: (c: { lat: number; lng: number }) => void }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

/**
 * Цвет берём ТОЛЬКО по стилям (правила редактируются).
 * Теги/архитекторы больше не влияют на цвет.
 */
function pickMarkerColor(it: ArchitectureObject, rules?: MarkerAppearanceRules) {
    const r = rules ?? EMPTY_RULES;
    for (const s of it.styles) {
        const c = r.styleColors[norm(s)];
        if (c) return c;
    }
    return "#2563eb";
}

function pickMarkerIconName(it: ArchitectureObject, rules?: MarkerAppearanceRules) {
    const r = rules ?? EMPTY_RULES;
    for (const t of it.tags) {
        const icon = r.tagIcons[norm(t)];
        if (icon) return icon;
    }
    return "";
}

/**
 * Вычисляет контрастный цвет (черный или белый) на основе яркости фона
 */
function getContrastColor(hexColor: string): string {
    // Удаляем символ # если есть
    const hex = hexColor.replace('#', '');

    // Преобразуем hex в RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Вычисляем яркость по формуле YIQ (учитывающую восприятие человеческим глазом)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Если яркость больше 128 - используем черный цвет, иначе белый
    return yiq >= 128 ? '#000000' : '#ffffff';
}

/**
 * Цветной пин + контрастная иконка внутри.
 */
function makePinIcon(color: string, iconName: string) {
    const iconColor = getContrastColor(color);
    const iconHtml = iconName.trim()
        ? `<span class="material-symbols-rounded" style="font-size:18px;line-height:1;color:${iconColor};">${escapeHtml(iconName.trim())}</span>`
        : "";

    return L.divIcon({
        className: "custom-pin-icon",
        html: `
<div style="
    position: relative;
    width: 28px;
    height: 28px;
">
  <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${color};
      border-radius: 9999px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
  ">
    ${iconHtml}
  </div>
  <div style="
      position: absolute;
      left: 50%;
      top: 100%;
      margin-top: -1px;
      width: 12px;
      height: 12px;
      background: ${color};
      transform: translateX(-50%) rotate(45deg);
      border-right: 2px solid white;
      border-bottom: 2px solid white;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.18);
  "></div>
</div>`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -40],
    });
}

function escapeHtml(s: string) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

export function MapPage({
                            items,
                            onOpenObject,
                            markerAppearanceRules,
                            onChangeMarkerAppearanceRules,

                            filters,
                            setFilters,
                        }: {
    items: ArchitectureObject[];
    onOpenObject?: (id: string) => void;
    markerAppearanceRules: MarkerAppearanceRules;
    onChangeMarkerAppearanceRules: (next: MarkerAppearanceRules) => void;

    filters: MapFilters;
    setFilters: (next: MapFilters) => void;
}) {
    const rules = markerAppearanceRules ?? EMPTY_RULES;

    const tagSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.tags)), [items]);
    const architectSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.architects)), [items]);
    const styleSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.styles)), [items]);
    const countrySuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.countries)), [items]);
    const citySuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.cities)), [items]);

    const [filtersOpen, setFiltersOpen] = useState(false);

    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
    const radiusKm = toNumOrNull(filters.radiusKm);

    const filtered = useMemo(() => {
        return items.filter((it) => {
            // Для архитекторов, стилей и тегов используется И (AND)
            if (!matchAllSelected(it.architects, filters.architects)) return false;
            if (!matchAllSelected(it.styles, filters.styles)) return false;
            if (!matchAllSelected(it.tags, filters.tags)) return false;

            // Для стран и городов используется ИЛИ (OR)
            if (!matchAnySelected(it.countries, filters.countries)) return false;
            if (!matchAnySelected(it.cities, filters.cities)) return false;

            if (center && radiusKm !== null) {
                if (!hasCoords(it.coordinates)) return false;
                const d = distanceKm(center, { lat: it.coordinates.lat as number, lng: it.coordinates.lng as number });
                if (d > radiusKm) return false;
            }

            return true;
        });
    }, [items, filters.architects, filters.styles, filters.tags, filters.countries, filters.cities, center, radiusKm]);

    const markers = useMemo(() => filtered.filter((it) => hasCoords(it.coordinates)), [filtered]);

    const defaultCenter: [number, number] = useMemo(() => {
        if (center) return [center.lat, center.lng];
        const first = items.find((x) => hasCoords(x.coordinates));
        if (first) return [first.coordinates.lat as number, first.coordinates.lng as number];
        return [20, 0];
    }, [center, items]);

    const defaultZoom = center ? 12 : items.some((x) => hasCoords(x.coordinates)) ? 11 : 2;

    const activeFiltersCount =
        (filters.architects.length ? 1 : 0) +
        (filters.styles.length ? 1 : 0) +
        (filters.tags.length ? 1 : 0) +
        // Новые фильтры
        (filters.countries.length ? 1 : 0) +
        (filters.cities.length ? 1 : 0) +
        (filters.radiusKm.trim() ? 1 : 0) +
        (center ? 1 : 0);

    return (
        <div className="space-y-3">
            <MapFiltersDialog
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                filters={filters}
                setFilters={setFilters}
                tagSuggestions={tagSuggestions}
                architectSuggestions={architectSuggestions}
                styleSuggestions={styleSuggestions}

                countrySuggestions={countrySuggestions}
                citySuggestions={citySuggestions}
                markerAppearanceRules={markerAppearanceRules}
                setMarkerAppearanceRules={onChangeMarkerAppearanceRules}
            />

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setFiltersOpen(true)}>
                        <SlidersHorizontal size={16} />
                        Фильтры
                        <span className={cn("ml-2 text-xs text-muted-foreground", activeFiltersCount === 0 && "hidden")}>
                            (активно: {activeFiltersCount})
                        </span>
                    </Button>

                    <div className="text-sm text-muted-foreground">
                        Маркеров: {markers.length} / объектов: {filtered.length} / всего: {items.length}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCenter(null)}
                        disabled={!center}
                        title="Убрать центр радиуса"
                    >
                        <X size={16} />
                        Сбросить центр
                    </Button>
                </div>
            </div>

            <div className="rounded-md overflow-hidden border" style={{ height: "calc(100vh - 160px)" }}>
                <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    <ClickToSetCenter onPick={(c) => setCenter(c)} />

                    {center && radiusKm !== null && radiusKm > 0 && (
                        <Circle
                            center={[center.lat, center.lng]}
                            radius={radiusKm * 1000}
                            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12 }}
                        />
                    )}

                    {center && <Marker position={[center.lat, center.lng]} />}

                    {markers.map((it) => {
                        const color = pickMarkerColor(it, rules);
                        const iconName = pickMarkerIconName(it, rules);

                        return (
                            <Marker
                                key={it.id}
                                position={[it.coordinates.lat as number, it.coordinates.lng as number]}
                                icon={makePinIcon(color, iconName)}
                            >
                                <Popup>
                                    <div className="space-y-1">
                                        <div className="font-medium">{it.name || "Без названия"}</div>
                                        {it.address?.trim() && <div className="text-xs text-muted-foreground">{it.address}</div>}

                                        {center && radiusKm !== null && hasCoords(it.coordinates) && (
                                            <div className="text-xs text-muted-foreground">
                                                Расстояние:{" "}
                                                {distanceKm(center, { lat: it.coordinates.lat as number, lng: it.coordinates.lng as number }).toFixed(2)}{" "}
                                                км
                                            </div>
                                        )}

                                        {onOpenObject && (
                                            <div className="pt-2">
                                                <Button type="button" size="sm" onClick={() => onOpenObject(it.id)}>
                                                    Открыть объект
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}