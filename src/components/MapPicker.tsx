import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Coordinates } from "../lib/types";

// Фикс иконок leaflet для бандлеров
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function ClickHandler({ onPick }: { onPick: (c: Coordinates) => void }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

async function geocodeNominatim(query: string): Promise<Coordinates | null> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const r = await fetch(url.toString(), {
        headers: {
            "Accept": "application/json",
        },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{ lat: string; lon: string }>;
    if (!data?.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

export function MapPicker({
                              address,
                              value,
                              onChange,
                          }: {
    address: string;
    value: Coordinates;
    onChange: (v: Coordinates) => void;
}) {
    const has = value.lat != null && value.lng != null;

    const center = useMemo<[number, number]>(() => {
        if (has) return [value.lat as number, value.lng as number];
        return [20, 0]; // нейтрально
    }, [has, value.lat, value.lng]);

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // небольшой “подпрыгивающий” ререндер контейнера при смене центра
    const [mapKey, setMapKey] = useState(0);
    useEffect(() => setMapKey((x) => x + 1), [center[0], center[1]]);

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Широта</div>
                    <Input
                        value={value.lat ?? ""}
                        placeholder="например 55.7522"
                        onChange={(e) =>
                            onChange({ lat: e.target.value === "" ? null : Number(e.target.value), lng: value.lng })
                        }
                    />
                </div>
                <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Долгота</div>
                    <Input
                        value={value.lng ?? ""}
                        placeholder="например 37.6156"
                        onChange={(e) =>
                            onChange({ lat: value.lat, lng: e.target.value === "" ? null : Number(e.target.value) })
                        }
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !address.trim()}
                    onClick={async () => {
                        setBusy(true);
                        setErr(null);
                        try {
                            const c = await geocodeNominatim(address.trim());
                            if (!c) {
                                setErr("Адрес не найден (Nominatim). Попробуйте уточнить.");
                            } else {
                                onChange(c);
                            }
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Найти по адресу
                </Button>
                {err && <div className="text-sm text-destructive">{err}</div>}
            </div>

            <div className="rounded-md overflow-hidden border">
                <MapContainer
                    key={mapKey}
                    center={center}
                    zoom={has ? 14 : 2}
                    style={{ height: 260, width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickHandler onPick={onChange} />
                    {has && <Marker position={[value.lat as number, value.lng as number]} />}
                </MapContainer>
            </div>

            <div className="text-xs text-muted-foreground">
                Выберите точку кликом по карте — координаты сохранятся автоматически.
            </div>
        </div>
    );
}