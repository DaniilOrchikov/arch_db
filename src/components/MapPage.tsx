import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import type { ArchitectureObject, Coordinates, MarkerColorRules } from "../lib/types";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { SlidersHorizontal, X } from "lucide-react";
import { MapFiltersDialog, type MapFilters } from "./MapFiltersDialog";

// ВАЖНО: ?url для Vite, чтобы Leaflet получил корректные URL картинок
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png?url";
import markerIcon from "leaflet/dist/images/marker-icon.png?url";
import markerShadow from "leaflet/dist/images/marker-shadow.png?url";

const EMPTY_RULES: MarkerColorRules = { tags: {}, styles: {}, architects: {} };

// Фикс иконок Leaflet
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

// AND-фильтр: если selected не пуст — объект должен содержать каждое значение
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

// haversine distance (км)
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371; // km
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

function pickMarkerColor(it: ArchitectureObject, rules?: MarkerColorRules) {
    const r = rules ?? EMPTY_RULES;

    for (const t of it.tags) {
        const c = r.tags[norm(t)];
        if (c) return c;
    }
    for (const s of it.styles) {
        const c = r.styles[norm(s)];
        if (c) return c;
    }
    for (const a of it.architects) {
        const c = r.architects[norm(a)];
        if (c) return c;
    }
    return "#2563eb";
}

function makeDotIcon(color: string) {
    return L.divIcon({
        className: "",
        html: `<div style="
      width: 16px;
      height: 16px;
      border-radius: 9999px;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 1px 6px rgba(0,0,0,0.35);
    "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8],
    });
}

export function MapPage({
                            items,
                            onOpenObject,
                            markerColorRules,
                            onChangeMarkerColorRules,
                        }: {
    items: ArchitectureObject[];
    onOpenObject?: (id: string) => void;
    markerColorRules: MarkerColorRules;
    onChangeMarkerColorRules: (next: MarkerColorRules) => void;
}) {
    const rules = markerColorRules ?? EMPTY_RULES;
    const tagSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.tags)), [items]);
    const architectSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.architects)), [items]);
    const styleSuggestions = useMemo(() => uniqSorted(items.flatMap((i) => i.styles)), [items]);

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState<MapFilters>({
        architects: [],
        styles: [],
        tags: [],
        radiusKm: "",
    });

    // центр радиусного фильтра выбирается кликом по карте
    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

    const radiusKm = toNumOrNull(filters.radiusKm);

    const filtered = useMemo(() => {
        return items.filter((it) => {
            if (!matchAllSelected(it.architects, filters.architects)) return false;
            if (!matchAllSelected(it.styles, filters.styles)) return false;
            if (!matchAllSelected(it.tags, filters.tags)) return false;

            // территориальный фильтр
            if (center && radiusKm !== null) {
                if (!hasCoords(it.coordinates)) return false;
                const d = distanceKm(center, { lat: it.coordinates.lat as number, lng: it.coordinates.lng as number });
                if (d > radiusKm) return false;
            }

            return true;
        });
    }, [items, filters.architects, filters.styles, filters.tags, center, radiusKm]);

    // маркеры показываем только тем, у кого есть координаты
    const markers = useMemo(() => filtered.filter((it) => hasCoords(it.coordinates)), [filtered]);

    const defaultCenter: [number, number] = useMemo(() => {
        // если есть центр — от него; иначе попробуем взять первый объект с координатами; иначе world view
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
                markerColorRules={markerColorRules}
                setMarkerColorRules={onChangeMarkerColorRules}
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

            <div className="rounded-md overflow-hidden border" style={{ height: "calc(100vh - 140px)" }}>
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

                    {markers.map((it) => (
                        <Marker
                            key={it.id}
                            position={[it.coordinates.lat as number, it.coordinates.lng as number]}
                            icon={makeDotIcon(pickMarkerColor(it, rules))}
                        >
                            <Popup>
                                <div className="space-y-1">
                                    <div className="font-medium">{it.name || "Без названия"}</div>
                                    {it.address?.trim() && <div className="text-xs text-muted-foreground">{it.address}</div>}

                                    {center && radiusKm !== null && hasCoords(it.coordinates) && (
                                        <div className="text-xs text-muted-foreground">
                                            Расстояние: {distanceKm(center, { lat: it.coordinates.lat as number, lng: it.coordinates.lng as number }).toFixed(2)} км
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
                    ))}
                </MapContainer>
            </div>

            <div className="text-xs text-muted-foreground">
                Подсказка: клик по карте задаёт центр территориального фильтра. Радиус задаётся в фильтрах.
            </div>
        </div>
    );
}