import {useEffect, useMemo, useRef, useState} from "react";
import type {ArchitectureObject, Photo} from "../lib/types";
import {Card, CardContent, CardHeader, CardTitle} from "./ui/card";
import {Badge} from "./ui/badge";
import {Input} from "./ui/input";
import {Separator} from "./ui/separator";
import {Button} from "./ui/button";
import {cn} from "../lib/utils";
import {ChevronUp, Trash2} from "lucide-react";
import {MultiValueInput} from "./MultiValueInput";
import {PhotoEditor} from "./PhotoEditor";
import {MapPicker} from "./MapPicker";
import { MarkdownField } from "./MarkdownField";
import {readWorkspaceFile} from "../lib/photos";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";


async function resolveThumb(workspace: FileSystemDirectoryHandle | null, p: Photo): Promise<string> {
    if (p.type === "url") return p.value;
    if (!workspace) return "";
    const f = await readWorkspaceFile(workspace, p.value);
    return URL.createObjectURL(f);
}

// Функция для проверки заполненности обязательных полей
function checkRequiredFieldsFilled(item: ArchitectureObject): boolean {
    return (
        item.name.trim() !== "" &&
        item.yearStart !== null &&
        item.yearEnd !== null &&
        item.countries.length > 0 &&
        item.cities.length > 0 &&
        item.styles.length > 0 &&
        item.tags.length > 0 &&
        item.photos.length > 0
    );
}

// Функция для обновления статуса completed на основе заполненности полей
function updateCompletedStatus(item: ArchitectureObject): ArchitectureObject {
    const shouldBeCompleted = checkRequiredFieldsFilled(item);

    // Если статус уже совпадает с требуемым, возвращаем объект без изменений
    if (item.completed === shouldBeCompleted) {
        return item;
    }

    return {
        ...item,
        completed: shouldBeCompleted
    };
}

export function ObjectCard({
                               workspace,
                               item,
                               open,
                               onToggle,
                               onChange,
                               onDelete,
                               tagSuggestions,
                               architectSuggestions,
                               styleSuggestions,

                               countrySuggestions,
                               citySuggestions,
                               hasDuplicateName,
                               onStyleClick, // Добавлено: обработчик клика на стиль
                           }: {
    workspace: FileSystemDirectoryHandle | null;
    item: ArchitectureObject;
    open: boolean;
    onToggle: () => void;
    onChange: (next: ArchitectureObject) => void;
    onDelete: () => void;

    tagSuggestions: string[];
    architectSuggestions: string[];
    styleSuggestions: string[];

    countrySuggestions: string[];
    citySuggestions: string[];
    hasDuplicateName: boolean | (() => boolean);
    onStyleClick?: (styleName: string) => void;
}) {
    const isDuplicate = typeof hasDuplicateName === "function" ? hasDuplicateName() : hasDuplicateName;

    const collapsedTags = useMemo(() => item.tags.slice(0, 5), [item.tags]);

    const titleIsEmpty = !item.name.trim();
    const titleError = isDuplicate ? "Название дублируется (проверьте другие карточки)." : null;

    const [localOpen, setLocalOpen] = useState(open);
    useEffect(() => setLocalOpen(open), [open]);

    const [thumb, setThumb] = useState<string>("");
    const prevThumbRef = useRef<string>("");

    useEffect(() => {
        let alive = true;

        (async () => {
            const first = item.photos?.[0];
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
    }, [item.photos, workspace]);

    // Эффект для автоматического обновления статуса completed при изменении полей
    useEffect(() => {
        const updatedItem = updateCompletedStatus(item);
        if (updatedItem.completed !== item.completed) {
            onChange(updatedItem);
        }
    }, [
        item.name,
        item.yearStart,
        item.yearEnd,
        item.countries.length,
        item.cities.length,
        item.styles.length,
        item.tags.length,
        item.photos.length
    ]);

    const stylePreview = useMemo(() => {
        if (!item.styles.length) return null;
        if (item.styles.length === 1) return item.styles[0];
        return `${item.styles[0]} +${item.styles.length - 1}`;
    }, [item.styles]);

    // Обработчик клика на стиль в свернутом состоянии
    const handleStyleClick = (styleName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onStyleClick) {
            onStyleClick(styleName);
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader
                className={cn(
                    "cursor-pointer select-none p-3",
                    localOpen && "pb-2"
                )}
                onClick={() => {
                    setLocalOpen(!localOpen);
                    onToggle();
                }}
            >
                {!localOpen ? (
                    // Свернутое состояние
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="truncate text-base">
                                {item.name.trim() ? item.name : "Без названия"}
                                {item.completed && ( // Бейдж в заголовке для завершенных объектов
                                    <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-300">
                                        ✓
                                    </Badge>
                                )}
                            </CardTitle>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            {/* Левая часть: теги, стили, архитекторы, страны, города */}
                            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden min-w-0 flex-1">
                                {stylePreview && (
                                    <Badge
                                        className="cursor-pointer hover:bg-primary/80 transition-colors"
                                        onClick={(e) => handleStyleClick(item.styles[0], e)}
                                        title="Нажмите для перехода к стилю"
                                    >
                                        {stylePreview}
                                    </Badge>
                                )}
                                {item.countries.slice(0, 2).map((c) => (
                                    <Badge key={c}>
                                        {c}
                                    </Badge>
                                ))}
                                {item.cities.slice(0, 2).map((c) => (
                                    <Badge key={c}>
                                        {c}
                                    </Badge>
                                ))}
                                {collapsedTags.map((t) => (
                                    <Badge key={t}>
                                        {t}
                                    </Badge>
                                ))}
                                {item.architects.slice(0, 2).map((arch) => (
                                    <Badge
                                        key={arch}
                                    >
                                        {arch}
                                    </Badge>
                                ))}
                                {(item.architects.length > 2 || item.tags.length > 5 || item.countries.length > 2 || item.cities.length > 2) && (
                                    <Badge variant="secondary">
                                        +{Math.max(item.tags.length - 5, 0) +
                                        Math.max(item.architects.length - 2, 0) +
                                        Math.max(item.countries.length - 2, 0) +
                                        Math.max(item.cities.length - 2, 0)}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="h-28 w-30 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                                    {thumb ? (
                                        <img src={thumb} alt="" className="h-full w-full object-cover"/>
                                    ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-muted to-background"/>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="toggle"
                        >
                            <ChevronUp size={18}/>
                        </Button>
                        {item.completed && ( // Бейдж в заголовке для завершенных объектов
                            <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-300">
                                ✓
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            {localOpen && (
                <CardContent className="space-y-4">
                    {/* Компактный блок: название + годы */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                        <div className="md:col-span-4 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Название</div>
                            <Input
                                value={item.name}
                                className={cn(
                                    (titleIsEmpty || isDuplicate) && "border-destructive focus-visible:ring-destructive"
                                )}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const updated = { ...item, name: e.target.value };
                                    const withStatus = updateCompletedStatus(updated);
                                    onChange(withStatus);
                                }}
                                placeholder="Например: Собор Парижской Богоматери"
                            />
                            {(titleIsEmpty || titleError) && (
                                <div className="text-sm text-destructive">
                                    {titleIsEmpty ? "Название желательно указать." : titleError}
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-1 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Начало</div>
                            <Input
                                type="number"
                                value={item.yearStart ?? ""}
                                placeholder="1883"
                                onChange={(e) => {
                                    const updated = {
                                        ...item,
                                        yearStart: e.target.value === "" ? null : Number(e.target.value),
                                    };
                                    const withStatus = updateCompletedStatus(updated);
                                    onChange(withStatus);
                                }}
                            />
                        </div>

                        <div className="md:col-span-1 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Окончание</div>
                            <Input
                                type="number"
                                value={item.yearEnd ?? ""}
                                placeholder="1889"
                                onChange={(e) => {
                                    const updated = {
                                        ...item,
                                        yearEnd: e.target.value === "" ? null : Number(e.target.value),
                                    };
                                    const withStatus = updateCompletedStatus(updated);
                                    onChange(withStatus);
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                        <MultiValueInput
                            dense
                            label="Архитекторы"
                            placeholder="Начните вводить..."
                            values={item.architects}
                            suggestions={architectSuggestions}
                            onChange={(v) => {
                                const updated = { ...item, architects: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />

                        <MultiValueInput
                            dense
                            label="Стили"
                            placeholder="Начните вводить..."
                            values={item.styles}
                            suggestions={styleSuggestions}
                            onChange={(v) => {
                                const updated = { ...item, styles: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                            onItemClick={onStyleClick} // Добавлено: передаем обработчик клика
                        />

                        <MultiValueInput
                            dense
                            label="Теги"
                            placeholder="Начните вводить..."
                            values={item.tags}
                            suggestions={tagSuggestions}
                            onChange={(v) => {
                                const updated = { ...item, tags: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />
                        <MultiValueInput
                            dense
                            label="Страна"
                            placeholder="Начните вводить..."
                            values={item.countries}
                            suggestions={countrySuggestions}
                            onChange={(v) => {
                                const updated = { ...item, countries: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />
                        <MultiValueInput
                            dense
                            label="Город"
                            placeholder="Начните вводить..."
                            values={item.cities}
                            suggestions={citySuggestions}
                            onChange={(v) => {
                                const updated = { ...item, cities: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 size={16}/>
                            Удалить
                        </Button>
                    </div>

                    <Separator/>

                    <div className="space-y-2">
                        <MarkdownField
                            label="Описание"
                            value={item.description}
                            placeholder="Поддерживается Markdown..."
                            onChange={(v) => {
                                const updated = { ...item, description: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />
                    </div>

                    <PhotoEditor
                        workspace={workspace}
                        photos={item.photos}
                        onChange={(p) => {
                            const updated = { ...item, photos: p };
                            const withStatus = updateCompletedStatus(updated);
                            onChange(withStatus);
                        }}
                    />

                    <Separator/>

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Геолокация и карта</div>
                        <MapPicker
                            address={item.address}
                            value={item.coordinates}
                            onChange={(c) => {
                                const updated = { ...item, coordinates: c };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                            onChangeAddress={(address) => {
                                const updated = { ...item, address };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <MarkdownField
                            label="Мысли"
                            value={item.thoughts}
                            placeholder="Поддерживается Markdown..."
                            onChange={(v) => {
                                const updated = { ...item, thoughts: v };
                                const withStatus = updateCompletedStatus(updated);
                                onChange(withStatus);
                            }}
                        />
                    </div>

                    {/* Переключатель статуса завершенности */}
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="completed-status" className="text-sm font-medium">
                                Статус объекта
                            </Label>
                            <div className="text-xs text-muted-foreground">
                                {item.completed ? "Объект завершен ✓" : "Объект не завершен"}
                            </div>
                            {!item.completed && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Для завершения заполните: Название, год начала, год окончания, страну, город, стиль, теги и добавьте хотя бы 1 фото.
                                </div>
                            )}
                        </div>
                        <Switch
                            id="completed-status"
                            checked={item.completed}
                            onCheckedChange={(checked) => onChange({ ...item, completed: checked })}
                            disabled={checkRequiredFieldsFilled(item) && item.completed}
                        />
                    </div>

                </CardContent>
            )}
        </Card>
    );
}