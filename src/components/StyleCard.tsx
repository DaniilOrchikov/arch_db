// StyleCard.tsx (обновленный)
import { useEffect, useMemo, useRef, useState } from "react";
import type { Style, Photo, ArchitectureObject } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { ChevronUp, Trash2, ExternalLink, MapPin, Tag, Flag } from "lucide-react";
import { PhotoEditor } from "./PhotoEditor";
import { MarkdownField } from "./MarkdownField";
import { readWorkspaceFile } from "../lib/photos";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

async function resolveThumb(workspace: FileSystemDirectoryHandle | null, p: Photo): Promise<string> {
    if (p.type === "url") return p.value.trim();
    if (!workspace) return "";
    const f = await readWorkspaceFile(workspace, p.value);
    return URL.createObjectURL(f);
}

// Компонент для миниатюры объекта
function ObjectThumbnail({
                             workspace,
                             photo,
                             className
                         }: {
    workspace: FileSystemDirectoryHandle | null;
    photo: Photo | undefined;
    className?: string;
}) {
    const [src, setSrc] = useState<string>("");
    const prevSrcRef = useRef<string>("");

    useEffect(() => {
        let alive = true;

        (async () => {
            if (!photo) {
                if (prevSrcRef.current.startsWith("blob:")) URL.revokeObjectURL(prevSrcRef.current);
                prevSrcRef.current = "";
                setSrc("");
                return;
            }

            const url = await resolveThumb(workspace, photo);
            if (!alive) {
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
                return;
            }

            if (prevSrcRef.current && prevSrcRef.current.startsWith("blob:")) {
                URL.revokeObjectURL(prevSrcRef.current);
            }
            prevSrcRef.current = url;
            setSrc(url);
        })();

        return () => {
            alive = false;
        };
    }, [photo, workspace]);

    useEffect(() => {
        return () => {
            if (prevSrcRef.current && prevSrcRef.current.startsWith("blob:")) {
                URL.revokeObjectURL(prevSrcRef.current);
            }
        };
    }, []);

    if (!src) {
        return (
            <div className={cn("bg-gradient-to-br from-muted to-background flex items-center justify-center", className)}>
                <div className="text-muted-foreground text-xs">Нет фото</div>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt=""
            className={cn("object-cover", className)}
        />
    );
}

export function StyleCard({
                              workspace,
                              style,
                              open,
                              onToggle,
                              onChange,
                              onDelete,
                              linkedObjects,
                              onOpenObject,
                          }: {
    workspace: FileSystemDirectoryHandle | null;
    style: Style;
    open: boolean;
    onToggle: () => void;
    onChange: (next: Style) => void;
    onDelete: () => void;
    linkedObjects: ArchitectureObject[];
    onOpenObject: (id: string) => void;
}) {
    const [thumb, setThumb] = useState<string>("");
    const prevThumbRef = useRef<string>("");

    useEffect(() => {
        let alive = true;

        (async () => {
            const first = style.photos?.[0];
            if (!first) {
                if (prevThumbRef.current.startsWith("blob:")) URL.revokeObjectURL(prevThumbRef.current);
                prevThumbRef.current = "";
                setThumb("");
                return;
            }

            const src = await resolveThumb(workspace, first);

            if (!alive) {
                if (src.startsWith("blob:")) URL.revokeObjectURL(src);
                return;
            }

            if (prevThumbRef.current && prevThumbRef.current.startsWith("blob:")) {
                URL.revokeObjectURL(prevThumbRef.current);
            }
            prevThumbRef.current = src;
            setThumb(src);
        })();

        return () => {
            alive = false;
        };
    }, [style.photos, workspace]);

    // Автоматически заполняемые поля (только для чтения)
    const countriesPreview = useMemo(() => {
        if (!style.countries.length) return "Нет данных";
        if (style.countries.length === 1) return style.countries[0];
        return `${style.countries[0]} +${style.countries.length - 1}`;
    }, [style.countries]);

    const citiesPreview = useMemo(() => {
        if (!style.cities.length) return "Нет данных";
        if (style.cities.length === 1) return style.cities[0];
        return `${style.cities[0]} +${style.cities.length - 1}`;
    }, [style.cities]);

    const architectsPreview = useMemo(() => {
        if (!style.architects.length) return "Нет данных";
        if (style.architects.length === 1) return style.architects[0];
        return `${style.architects[0]} +${style.architects.length - 1}`;
    }, [style.architects]);

    return (
        <Card className="overflow-hidden">
            <CardHeader
                className={cn(
                    "cursor-pointer select-none p-3",
                    open && "pb-2"
                )}
                onClick={onToggle}
            >
                {!open ? (
                    // Свернутое состояние
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="truncate text-base">
                                {style.name || "Без названия"}
                                {style.completed && (
                                    <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-300">
                                        ✓
                                    </Badge>
                                )}
                            </CardTitle>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            {/* Левая часть: автоматически заполняемые поля */}
                            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden min-w-0 flex-1">
                                {countriesPreview !== "Нет данных" && (
                                    <Badge title={style.countries.join(", ")}>
                                        {countriesPreview}
                                    </Badge>
                                )}
                                {citiesPreview !== "Нет данных" && (
                                    <Badge title={style.cities.join(", ")}>
                                        {citiesPreview}
                                    </Badge>
                                )}
                                {architectsPreview !== "Нет данных" && (
                                    <Badge title={style.architects.join(", ")}>
                                        {architectsPreview}
                                    </Badge>
                                )}
                                <Badge variant="secondary">
                                    {linkedObjects.length} объектов
                                </Badge>
                            </div>

                            {/* Правая часть: миниатюра */}
                            <div className="h-28 w-30 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                                {thumb ? (
                                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-muted to-background" />
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="toggle"
                            >
                                <ChevronUp size={18} />
                            </Button>
                            <CardTitle className="truncate text-base">
                                {style.name || "Без названия"}
                            </CardTitle>
                        </div>
                    </div>
                )}
            </CardHeader>

            {open && (
                <CardContent className="space-y-4">
                    {/* Название стиля */}
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Название стиля</div>
                        <Input
                            value={style.name}
                            onChange={(e) => onChange({ ...style, name: e.target.value })}
                            placeholder="Например: Модерн"
                        />
                    </div>

                    {/* Автоматически заполняемые поля (только для чтения) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Страны</div>
                            <div className="rounded-md border bg-muted/50 p-2 text-sm">
                                {style.countries.length > 0 ? style.countries.join(", ") : "Нет данных"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Автоматически заполняется из объектов
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Города</div>
                            <div className="rounded-md border bg-muted/50 p-2 text-sm">
                                {style.cities.length > 0 ? style.cities.join(", ") : "Нет данных"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Автоматически заполняется из объектов
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Архитекторы</div>
                            <div className="rounded-md border bg-muted/50 p-2 text-sm">
                                {style.architects.length > 0 ? style.architects.join(", ") : "Нет данных"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Автоматически заполняется из объектов
                            </div>
                        </div>
                    </div>

                    {/* Описание и мысли */}
                    <div className="space-y-3">
                        <MarkdownField
                            label="Описание стиля"
                            value={style.description}
                            placeholder="Опишите основные характеристики стиля..."
                            onChange={(v) => onChange({ ...style, description: v })}
                        />

                        <MarkdownField
                            label="Мысли о стиле"
                            value={style.thoughts}
                            placeholder="Ваши личные заметки о стиле..."
                            onChange={(v) => onChange({ ...style, thoughts: v })}
                        />
                    </div>

                    {/* Фотографии стиля */}
                    <PhotoEditor
                        workspace={workspace}
                        photos={style.photos}
                        onChange={(p) => onChange({ ...style, photos: p })}
                    />

                    <Separator />

                    {/* Связанные объекты */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Объекты этого стиля ({linkedObjects.length})</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {linkedObjects.length > 0 ? (
                                linkedObjects.map((obj) => (
                                    <div
                                        key={obj.id}
                                        className="flex items-center gap-3 p-2 rounded-md border hover:bg-accent/50 cursor-pointer group min-w-0"
                                        onClick={() => onOpenObject(obj.id)}
                                    >
                                        {/* Миниатюра объекта */}
                                        <div className="h-16 w-16 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                                            <ObjectThumbnail
                                                workspace={workspace}
                                                photo={obj.photos?.[0]}
                                                className="h-full w-full"
                                            />
                                        </div>

                                        {/* Информация об объекте */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate text-sm mb-1">
                                                {obj.name || "Без названия"}
                                                {obj.completed && (
                                                    <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600 border-green-300">
                                                        ✓
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Страна и город */}
                                            <div className="flex items-center gap-2 mb-1">
                                                {obj.countries.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Flag size={10} />
                                                        <span className="truncate max-w-[100px]">
                                                            {obj.countries[0]}
                                                            {obj.countries.length > 1 && ` +${obj.countries.length - 1}`}
                                                        </span>
                                                    </div>
                                                )}

                                                {obj.cities.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin size={10} />
                                                        <span className="truncate max-w-[100px]">
                                                            {obj.cities[0]}
                                                            {obj.cities.length > 1 && ` +${obj.cities.length - 1}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Теги */}
                                            {obj.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {obj.tags.slice(0, 3).map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="secondary"
                                                            className="text-xs px-1.5 py-0 h-5"
                                                        >
                                                            <Tag size={8} className="mr-1" />
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {obj.tags.length > 3 && (
                                                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                                            +{obj.tags.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Иконка ссылки */}
                                        <ExternalLink
                                            size={16}
                                            className="text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground p-2">
                                    Нет объектов с этим стилем
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Статус и удаление */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="style-completed-status" className="text-sm font-medium">
                                    Статус стиля
                                </Label>
                                <div className="text-xs text-muted-foreground">
                                    {style.completed ? "Изучение завершено ✓" : "В процессе изучения"}
                                </div>
                            </div>
                            <Switch
                                id="style-completed-status"
                                checked={style.completed}
                                onCheckedChange={(checked) => onChange({ ...style, completed: checked })}
                            />
                        </div>

                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={onDelete}
                        >
                            <Trash2 size={16} />
                            Удалить стиль
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
