import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {useMemo, useState, useEffect, useCallback, useRef, type SetStateAction} from "react";
import {MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap} from "react-leaflet";
import type {ArchitectureObject} from "../lib/types";
import {Button} from "./ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "./ui/card";
import {Badge} from "./ui/badge";
import {Separator} from "./ui/separator";
import {Dialog, DialogContent} from "./ui/dialog";
import {Maximize2, ExternalLink, Navigation} from "lucide-react";
import {readWorkspaceFile} from "../lib/photos";
import { parseGeoGuessrFromUrl, syncGeoGuessrToUrl } from "../lib/urlState";


// Fix for leaflet icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png?url";
import markerIcon from "leaflet/dist/images/marker-icon.png?url";
import markerShadow from "leaflet/dist/images/marker-shadow.png?url";

type IconDefaultWithGetIconUrl = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as IconDefaultWithGetIconUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Создаем иконки в виде точек
const createDotIcon = (color: string) => {
    return L.divIcon({
        className: "custom-dot-icon",
        html: `
            <div style="
                position: relative;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: 16px;
                    height: 16px;
                    background: ${color};
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                "></div>
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                "></div>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
    });
};

// Синяя точка для догадки пользователя
const userDotIcon = createDotIcon("#3b82f6");

// Красная точка для правильного местоположения
const correctDotIcon = createDotIcon("#ef4444");

function FitBounds({bounds}: { bounds: L.LatLngBounds | null }) {
    const map = useMap();

    useEffect(() => {
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, {padding: [50, 50]});
        }
    }, [bounds, map]);

    return null;
}

// Компонент для обработки кликов по карте
function ClickHandler({onClick, disabled}: {
    onClick: (latlng: { lat: number; lng: number }) => void;
    disabled: boolean
}) {
    useMapEvents({
        click(e) {
            if (!disabled) {
                onClick({lat: e.latlng.lat, lng: e.latlng.lng});
            }
        },
    });
    return null;
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

async function resolvePhoto(workspace: FileSystemDirectoryHandle | null, photo: {
    type: string;
    value: string
}): Promise<string> {
    if (photo.type === "url") return photo.value;
    if (!workspace) return "";
    try {
        const file = await readWorkspaceFile(workspace, photo.value);
        return URL.createObjectURL(file);
    } catch {
        return "";
    }
}

export function GeoGuessrPage({
                                  workspace,
                                  items,
                                  onOpenObject,
                              }: {
    workspace: FileSystemDirectoryHandle | null;
    items: ArchitectureObject[];
    onOpenObject?: (id: string) => void;
}) {
    const [gameStarted, setGameStarted] = useState(false);
    const [currentObject, setCurrentObject] = useState<ArchitectureObject | null>(null);
    const [userGuess, setUserGuess] = useState<{ lat: number; lng: number } | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

    const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
    const savedViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);

    const didCenterOnStartRef = useRef(false);

    // Новые состояния для отслеживания показанных объектов
    const [usedObjectIds, setUsedObjectIds] = useState<Set<string>>(new Set());
    const [eligibleObjects, setEligibleObjects] = useState<ArchitectureObject[]>([]);
    const [availableCount, setAvailableCount] = useState(0);

    // Добавляем состояние для отслеживания инициализации из URL
    const [isInitializedFromUrl, setIsInitializedFromUrl] = useState(false);
    // Состояние для отслеживания загрузки фото
    const [isPhotoLoading, setIsPhotoLoading] = useState(false);

    // Эффект для восстановления состояния из URL при загрузке
    useEffect(() => {
        if (isInitializedFromUrl) return;

        const savedState = parseGeoGuessrFromUrl();

        if (savedState.gameStarted) {
            setGameStarted(true);

            // Восстанавливаем использованные ID
            if (savedState.usedObjectIds.length > 0) {
                setUsedObjectIds(new Set(savedState.usedObjectIds));
            }

            // Восстанавливаем текущий объект
            if (savedState.currentObject) {
                // Проверяем, что объект все еще валиден (есть координаты и фото)
                if (
                    savedState.currentObject.coordinates?.lat &&
                    savedState.currentObject.coordinates?.lng &&
                    savedState.currentObject.photos?.length > 0
                ) {
                    setCurrentObject(savedState.currentObject);
                }
            }

            // Восстанавливаем предположение пользователя
            if (savedState.userGuess) {
                const [lat, lng] = savedState.userGuess.split(',').map(Number);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setUserGuess({ lat, lng });
                }
            }

            // Восстанавливаем состояние результата
            setShowResult(savedState.showResult);

            // Восстанавливаем границы карты
            if (savedState.bounds) {
                const [lat1, lng1, lat2, lng2] = savedState.bounds.split(',').map(Number);
                if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
                    const bounds = L.latLngBounds([lat1, lng1], [lat2, lng2]);
                    if (bounds.isValid()) {
                        setBounds(bounds);
                    }
                }
            }
        }

        setIsInitializedFromUrl(true);
    }, [isInitializedFromUrl]);

    // Эффект для загрузки фото при изменении currentObject или workspace
    useEffect(() => {
        const loadPhoto = async () => {
            if (!currentObject || !currentObject.photos[0]) {
                setPhotoUrl("");
                return;
            }

            setIsPhotoLoading(true);
            try {
                const url = await resolvePhoto(workspace, currentObject.photos[0]);
                setPhotoUrl(url);
            } catch (error) {
                console.error("Failed to load photo:", error);
                setPhotoUrl("");
            } finally {
                setIsPhotoLoading(false);
            }
        };

        loadPhoto();

        // Очистка при размонтировании или изменении фото
        return () => {
            if (photoUrl && photoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(photoUrl);
            }
        };
    }, [currentObject?.id, workspace]);

    // Эффект для синхронизации состояния с URL
    useEffect(() => {
        if (!isInitializedFromUrl) return;

        const state = {
            gameStarted,
            currentObject,
            userGuess: userGuess ? `${userGuess.lat},${userGuess.lng}` : null,
            showResult,
            usedObjectIds: Array.from(usedObjectIds),
            bounds: bounds ?
                `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}` :
                null,
        };

        syncGeoGuessrToUrl(state);
    }, [gameStarted, currentObject, userGuess, showResult, usedObjectIds, bounds, isInitializedFromUrl]);

    useEffect(() => {
        if (!leafletMap) return;

        if (photoDialogOpen) {
            savedViewRef.current = {
                center: leafletMap.getCenter(),
                zoom: leafletMap.getZoom(),
            };
            return;
        }

        if (!photoDialogOpen && savedViewRef.current) {
            const {center, zoom} = savedViewRef.current;

            requestAnimationFrame(() => {
                leafletMap.invalidateSize();

                requestAnimationFrame(() => {
                    leafletMap.invalidateSize();
                    leafletMap.setView(center, zoom, {animate: false});
                });
            });
        }
    }, [photoDialogOpen, leafletMap]);

    useEffect(() => {
        didCenterOnStartRef.current = false;
    }, [currentObject?.id]);

    // Фильтруем доступные объекты при изменении items
    useEffect(() => {
        const filtered = items.filter(item =>
            item.completed && item.coordinates.lat != null && item.coordinates.lng != null &&
            item.photos.length > 0
        );
        setEligibleObjects(filtered);
        setAvailableCount(filtered.length);
    }, [items]);

    // Получение случайного объекта без повторений
    const getRandomObject = useCallback((): ArchitectureObject | null => {
        if (eligibleObjects.length === 0) return null;

        // Фильтруем объекты, которые еще не были показаны
        const unusedObjects = eligibleObjects.filter(obj => !usedObjectIds.has(obj.id));

        if (unusedObjects.length === 0) {
            // Если все объекты были показаны, очищаем историю и начинаем заново
            setUsedObjectIds(new Set());
            return eligibleObjects[Math.floor(Math.random() * eligibleObjects.length)];
        }

        const randomIndex = Math.floor(Math.random() * unusedObjects.length);
        const selectedObject = unusedObjects[randomIndex];

        return selectedObject;
    }, [eligibleObjects, usedObjectIds]);

    // Инициализация первого объекта при старте игры
    useEffect(() => {
        if (gameStarted && !currentObject && isInitializedFromUrl) {
            const obj = getRandomObject();
            if (obj) {
                // Добавляем ID в использованные перед установкой объекта
                setUsedObjectIds(prev => new Set(prev).add(obj.id));
                setCurrentObject(obj);
            }
        }
    }, [gameStarted, currentObject, getRandomObject, isInitializedFromUrl]);

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        if (showResult) return;
        setUserGuess(latlng);
    };

    const handleConfirmGuess = () => {
        if (!userGuess || !currentObject || !currentObject.coordinates.lat || !currentObject.coordinates.lng) return;

        setShowResult(true);

        // Создаем границы для отображения обоих маркеров
        const userLatLng = L.latLng(userGuess.lat, userGuess.lng);
        const correctLatLng = L.latLng(currentObject.coordinates.lat, currentObject.coordinates.lng);
        const newBounds = L.latLngBounds(userLatLng, correctLatLng);
        setBounds(newBounds);
    };

    const handleNext = () => {
        // Очищаем предыдущий object URL
        if (photoUrl && photoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoUrl);
        }

        setUserGuess(null);
        setShowResult(false);
        setBounds(null);
        setPhotoUrl("");

        const newObj = getRandomObject();
        if (!newObj) {
            // Нет больше доступных объектов
            setCurrentObject(null);
            return;
        }

        // Добавляем ID в использованные перед установкой объекта
        setUsedObjectIds(prev => new Set(prev).add(newObj.id));
        setCurrentObject(newObj);
    };

    // Количество оставшихся объектов
    const remainingObjectsCount = useMemo(() => {
        return eligibleObjects.length - usedObjectIds.size;
    }, [eligibleObjects.length, usedObjectIds.size]);

    const distance = useMemo(() => {
        if (!userGuess || !currentObject || !currentObject.coordinates.lat || !currentObject.coordinates.lng) return 0;
        return distanceKm(userGuess, {lat: currentObject.coordinates.lat, lng: currentObject.coordinates.lng});
    }, [userGuess, currentObject]);

    // Нейтральный центр карты (океан) и минимальный зум
    const defaultCenter: [number, number] = useMemo(() => {
        return [20, 0];
    }, []);

    // Calculate default zoom - минимальный зум при старте
    const defaultZoom = useMemo(() => {
        if (userGuess || showResult) return 3;
        return 2;
    }, [userGuess, showResult]);

    // Линия между догадкой и правильным местоположением
    const lineCoordinates = useMemo(() => {
        if (!showResult || !userGuess || !currentObject?.coordinates.lat || !currentObject?.coordinates.lng) {
            return [];
        }
        return [
            [userGuess.lat, userGuess.lng] as [number, number],
            [currentObject.coordinates.lat, currentObject.coordinates.lng] as [number, number]
        ];
    }, [showResult, userGuess, currentObject]);

    // Позиции для текста с расстоянием (середина линии)
    const distanceLabelPosition = useMemo(() => {
        if (lineCoordinates.length < 2) return null;

        const [userLat, userLng] = lineCoordinates[0];
        const [correctLat, correctLng] = lineCoordinates[1];

        return {
            lat: (userLat + correctLat) / 2,
            lng: (userLng + correctLng) / 2
        };
    }, [lineCoordinates]);

    // Компонент для центрирования карты при старте игры
    function CenterMapOnStart({center, zoom}: { center: [number, number]; zoom: number }) {
        const map = useMap();

        useEffect(() => {
            if (!gameStarted) return;
            if (userGuess || showResult) return;

            if (!didCenterOnStartRef.current) {
                didCenterOnStartRef.current = true;
                map.setView(center, zoom, {animate: false});
            }
        }, [map, center, zoom, gameStarted, userGuess, showResult]);

        return null;
    }

    // Функция сброса игры
    const resetGame = () => {
        setGameStarted(false);
        setCurrentObject(null);
        setUserGuess(null);
        setShowResult(false);
        setBounds(null);
        setUsedObjectIds(new Set());
        if (photoUrl && photoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoUrl);
        }
        setPhotoUrl("");

        // Очищаем состояние в URL
        syncGeoGuessrToUrl({
            gameStarted: false,
            currentObject: null,
            userGuess: null,
            showResult: false,
            usedObjectIds: [],
            bounds: null,
        });
    };

    if (!gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-6">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-bold">Угадай здание</h1>
                    <p className="text-muted-foreground max-w-md">
                        Тест на знание архитектуры! Посмотрите на здание и найдите его на карте.
                    </p>
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm">
                            <span className="font-semibold">Доступно объектов для игры:</span> {availableCount}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Используются только завершенные объекты с координатами и фотографиями
                        </p>
                        {usedObjectIds.size > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                                В предыдущей игре было показано: {usedObjectIds.size} объектов
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    size="lg"
                    onClick={() => setGameStarted(true)}
                    disabled={availableCount === 0}
                >
                    {availableCount === 0 ? "Нет доступных объектов" : "Начать игру"}
                </Button>
            </div>
        );
    }

    if (!currentObject) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
                <p className="text-muted-foreground">
                    {remainingObjectsCount === 0
                        ? "Все доступные объекты были показаны!"
                        : "Нет доступных объектов для игры"}
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={resetGame}>
                        Вернуться назад
                    </Button>
                    {remainingObjectsCount > 0 && (
                        <Button onClick={handleNext}>
                            Продолжить с новым набором
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const correctCoords = currentObject.coordinates.lat && currentObject.coordinates.lng
        ? {lat: currentObject.coordinates.lat, lng: currentObject.coordinates.lng}
        : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={resetGame}
                    >
                        Завершить игру
                    </Button>
                    {showResult && (
                        <div className="text-sm bg-primary/10 px-3 py-1 rounded-md">
                            Расстояние: <span className="font-bold">{distance.toFixed(2)} км</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Угадайте, где находится это здание на карте
                    </div>
                    <div className="text-sm bg-muted px-3 py-1 rounded-md">
                        Осталось: <span className="font-bold">{remainingObjectsCount}</span> из <span
                        className="font-bold">{eligibleObjects.length}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Левая колонка - карточка объекта */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>{currentObject.name || "Без названия"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Фотография */}
                            <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
                                {isPhotoLoading ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-muted-foreground">Загрузка фото...</p>
                                    </div>
                                ) : photoUrl ? (
                                    <>
                                        <img
                                            src={photoUrl}
                                            alt={currentObject.name}
                                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setPhotoDialogOpen(true)}
                                        />
                                        <button
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-md transition-colors"
                                            onClick={() => setPhotoDialogOpen(true)}
                                            aria-label="Увеличить фото"
                                        >
                                            <Maximize2 size={16}/>
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-muted-foreground">Нет фотографии</p>
                                    </div>
                                )}
                            </div>

                            {/* Дополнительная информация (показывается после ответа) */}
                            {showResult && (
                                <div className="space-y-3">
                                    <Separator/>
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Информация о здании:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {currentObject.countries.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Страна</div>
                                                    <div className="font-medium">{currentObject.countries[0]}</div>
                                                </div>
                                            )}
                                            {currentObject.cities.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Город</div>
                                                    <div className="font-medium">{currentObject.cities[0]}</div>
                                                </div>
                                            )}
                                        </div>
                                        {currentObject.address && (
                                            <div>
                                                <div className="text-xs text-muted-foreground">Адрес</div>
                                                <div className="font-medium">{currentObject.address}</div>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-1">
                                            {currentObject.styles.slice(0, 3).map(style => (
                                                <Badge key={style} variant="secondary">{style}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {onOpenObject && (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => onOpenObject(currentObject.id)}
                                        >
                                            <ExternalLink size={16} className="mr-2"/>
                                            Открыть карточку объекта
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Кнопка подтверждения/следующего */}
                            <div className="pt-2">
                                {!showResult ? (
                                    <Button
                                        className="w-full"
                                        onClick={handleConfirmGuess}
                                        disabled={!userGuess}
                                    >
                                        <Navigation size={16} className="mr-2"/>
                                        Подтвердить выбор
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={handleNext}
                                    >
                                        Следующее здание
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Правая колонка - карта */}
                <div className="lg:col-span-3">
                    <div className="rounded-md overflow-hidden border" style={{height: "calc(100vh - 200px)"}}>
                        <MapContainer
                            center={defaultCenter}
                            zoom={defaultZoom}
                            whenReady={(e: { target: SetStateAction<L.Map | null>; }) => setLeafletMap(e.target)}
                            style={{ height: "100%", width: "100%", cursor: showResult ? "default" : "crosshair" }}
                            className="z-0"
                        >
                            <TileLayer
                                url="https://tile.openstreetmap.jp/styles/maptiler-basic-ja/{z}/{x}/{y}.png"
                            />

                            {/* Центрируем карту при старте игры */}
                            <CenterMapOnStart center={defaultCenter} zoom={defaultZoom} />

                            {/* Обработчик кликов */}
                            <ClickHandler
                                onClick={handleMapClick}
                                disabled={showResult}
                            />

                            {/* Fit bounds when showing results */}
                            {showResult && bounds && <FitBounds bounds={bounds} />}

                            {/* Маркер пользователя (синяя точка) */}
                            {userGuess && (
                                <Marker
                                    position={[userGuess.lat, userGuess.lng]}
                                    icon={userDotIcon}
                                />
                            )}

                            {/* Правильный маркер (красная точка) */}
                            {showResult && correctCoords && (
                                <Marker
                                    position={[correctCoords.lat, correctCoords.lng]}
                                    icon={correctDotIcon}
                                />
                            )}

                            {/* Линия между точками */}
                            {showResult && lineCoordinates.length >= 2 && (
                                <Polyline
                                    positions={lineCoordinates}
                                    pathOptions={{
                                        color: "#6b7280",
                                        weight: 3,
                                        opacity: 0.7,
                                        dashArray: "10, 10"
                                    }}
                                />
                            )}

                            {/* Текст с расстоянием в середине линии */}
                            {showResult && distanceLabelPosition && (
                                <div className="leaflet-top leaflet-right">
                                    <div className="leaflet-control leaflet-bar bg-white dark:bg-gray-800 px-3 py-2 rounded-md shadow-md text-sm font-medium">
                                        Расстояние: {distance.toFixed(2)} км
                                    </div>
                                </div>
                            )}
                        </MapContainer>
                    </div>
                </div>
            </div>

            {/* Диалог для полноэкранного просмотра фото */}
            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                <DialogContent className="max-w-4xl p-0 gap-0">
                    <div className="relative w-full h-[80vh] bg-black">
                        {photoUrl && (
                            <img src={photoUrl} alt={currentObject.name} className="w-full h-full object-contain" />
                        )}
                        <Button
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                            onClick={() => setPhotoDialogOpen(false)}
                        >
                            Закрыть
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
