import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Coordinates } from "../lib/types";


// ВАЖНО: ?url для Vite, чтобы Leaflet получил корректные URL картинок
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png?url";
import markerIcon from "leaflet/dist/images/marker-icon.png?url";
import markerShadow from "leaflet/dist/images/marker-shadow.png?url";

// Классический фикс для отсутствующих иконок в сборщиках
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function ClickHandler({ onPick }: { onPick: (c: Coordinates) => void }) {
    const map = useMap();
    const isFirstClick = useRef(true);

    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });

            // Если это первый клик (координаты были null), устанавливаем зум 14
            if (isFirstClick.current) {
                map.setView(e.latlng, 14);
                isFirstClick.current = false;
            }
        },
    });

    // Сбрасываем флаг при монтировании
    useEffect(() => {
        isFirstClick.current = true;
    }, []);

    return null;
}

// Компонент для установки начальной позиции карты
function MapInitializer({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            map.setView(center, zoom);
            initialized.current = true;
        }
    }, [center, zoom, map]);

    return null;
}

// Компонент для обновления маркера без изменения вида карты
function MarkerUpdater({ position, previousPosition }: { position: [number, number] | null; previousPosition: [number, number] | null }) {
    const map = useMap();

    useEffect(() => {
        // Если позиция изменилась, плавно перемещаем карту только если это не первый клик
        if (position && previousPosition &&
            (position[0] !== previousPosition[0] || position[1] !== previousPosition[1])) {
            // Сохраняем текущий зум
            const currentZoom = map.getZoom();
            map.flyTo(position, currentZoom, {
                duration: 0.5
            });
        }
    }, [position, previousPosition, map]);

    return null;
}

async function geocodeNominatim(query: string): Promise<Coordinates | null> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const r = await fetch(url.toString(), {
        headers: {
            Accept: "application/json",
        },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

function openYandexMaps(address: string, coordinates: Coordinates | null) {
    let url = "https://yandex.ru/maps/";

    if (coordinates?.lat && coordinates?.lng) {
        // Используем координаты если они заданы
        url += `?ll=${coordinates.lng},${coordinates.lat}&z=15`;
        if (address.trim()) {
            url += `&text=${encodeURIComponent(address.trim())}`;
        }
    } else if (address.trim()) {
        // Используем адрес если координат нет
        url += `?text=${encodeURIComponent(address.trim())}`;
    } else {
        // Ничего не задано - открываем пустую карту
        url += "?ll=37.6173,55.7558&z=10";
    }

    window.open(url, "_blank");
}

function openGoogleMaps(address: string, coordinates: Coordinates | null) {
    let url = "https://www.google.com/maps/";

    if (coordinates?.lat && coordinates?.lng) {
        // Используем координаты если они заданы
        url += `@${coordinates.lat},${coordinates.lng},15z`;
        if (address.trim()) {
            url += `?q=${encodeURIComponent(address.trim())}`;
        } else {
            url += `?q=${coordinates.lat},${coordinates.lng}`;
        }
    } else if (address.trim()) {
        // Используем адрес если координат нет
        url += `search/${encodeURIComponent(address.trim())}`;
    } else {
        // Ничего не задано - открываем пустую карту
        url += "@20,0,2z";
    }

    window.open(url, "_blank");
}

export function MapPicker({
                              address,
                              value,
                              onChange,
                              onChangeAddress,
                          }: {
    address: string;
    value: Coordinates;
    onChange: (v: Coordinates) => void;
    onChangeAddress: (address: string) => void;
}) {
    const has = value.lat != null && value.lng != null;

    const center = useMemo<[number, number]>(() => {
        if (has) return [value.lat as number, value.lng as number];
        return [20, 0];
    }, [has, value.lat, value.lng]);

    const zoom = useMemo(() => {
        return has ? 14 : 2;
    }, [has]);

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Сохраняем предыдущую позицию для сравнения
    const previousPosition = useRef<[number, number] | null>(null);
    const currentPosition = useMemo(() => {
        return has ? [value.lat as number, value.lng as number] : null;
    }, [has, value.lat, value.lng]);

    // Обновляем предыдущую позицию при изменении текущей
    useEffect(() => {
        previousPosition.current = currentPosition;
    }, [currentPosition]);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Левая колонка: текстовые поля (1/3) */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">Адрес</div>
                        <Input
                            value={address}
                            placeholder="Страна, город, улица, дом..."
                            onChange={(e) => {
                                onChangeAddress(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && address.trim()) {
                                    e.preventDefault();
                                    handleGeocode();
                                }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Широта</div>
                            <Input
                                value={value.lat ?? ""}
                                placeholder="например 55.7522"
                                onChange={(e) =>
                                    onChange({
                                        lat: e.target.value === "" ? null : Number(e.target.value),
                                        lng: value.lng,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Долгота</div>
                            <Input
                                value={value.lng ?? ""}
                                placeholder="например 37.6156"
                                onChange={(e) =>
                                    onChange({
                                        lat: value.lat,
                                        lng: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={busy || !address.trim()}
                            onClick={handleGeocode}
                        >
                            {busy ? "Поиск..." : "Найти на карте"}
                        </Button>
                        {err && <div className="text-sm text-destructive">{err}</div>}
                    </div>

                    {/* Кнопки для открытия в сторонних сервисах */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openYandexMaps(address, value)}
                            disabled={!address.trim() && !has}
                            className="flex items-center justify-center gap-1"
                        >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"/>
                            </svg>
                            Яндекс
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openGoogleMaps(address, value)}
                            disabled={!address.trim() && !has}
                            className="flex items-center justify-center gap-1"
                        >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"/>
                            </svg>
                            Google
                        </Button>
                    </div>
                </div>

                {/* Правая колонка: квадратная карта (2/3) */}
                <div className="md:col-span-2">
                    <div className="rounded-md overflow-hidden border aspect-[16/9]">
                        <MapContainer
                            center={center}
                            zoom={zoom}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={true}
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapInitializer center={center} zoom={zoom} />
                            <ClickHandler onPick={onChange} />
                            <MarkerUpdater
                                position={currentPosition}
                                previousPosition={previousPosition.current}
                            />
                            {has && <Marker position={[value.lat as number, value.lng as number]} />}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );

    async function handleGeocode() {
        setBusy(true);
        setErr(null);
        try {
            const c = await geocodeNominatim(address.trim());
            if (!c) setErr("Адрес не найден (Nominatim). Попробуйте уточнить.");
            else onChange(c);
        } finally {
            setBusy(false);
        }
    }
}