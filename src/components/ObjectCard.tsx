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


async function resolveThumb(workspace: FileSystemDirectoryHandle | null, p: Photo): Promise<string> {
    if (p.type === "url") return p.value;
    if (!workspace) return "";
    const f = await readWorkspaceFile(workspace, p.value);
    return URL.createObjectURL(f);
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
                               hasDuplicateName,
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
    hasDuplicateName: boolean | (() => boolean);
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

    const stylePreview = useMemo(() => {
        if (!item.styles.length) return null;
        if (item.styles.length === 1) return item.styles[0];
        return `${item.styles[0]} +${item.styles.length - 1}`;
    }, [item.styles]);

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
                            </CardTitle>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            {/* Левая часть: теги, стили, архитекторы */}
                            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden min-w-0 flex-1">
                                {stylePreview && (
                                    <Badge>{stylePreview}</Badge>
                                )}
                                {collapsedTags.map((t) => (
                                    <Badge key={t}>
                                        {t}
                                    </Badge>
                                ))}
                                {item.architects.slice(0, 2).map((arch) => (
                                    <Badge
                                        key={arch}
                                        variant="outline"
                                    >
                                        {arch}
                                    </Badge>
                                ))}
                                {(item.architects.length > 2 || item.tags.length > 5) && (
                                    <Badge variant="secondary">
                                        +{Math.max(item.tags.length - 5, 0) + Math.max(item.architects.length - 2, 0)}
                                    </Badge>
                                )}
                            </div>

                            {/* Правая часть: миниатюра и стрелочка */}
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
                                onChange={(e) => onChange({...item, name: e.target.value})}
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
                                onChange={(e) =>
                                    onChange({
                                        ...item,
                                        yearStart: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="md:col-span-1 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Окончание</div>
                            <Input
                                type="number"
                                value={item.yearEnd ?? ""}
                                placeholder="1889"
                                onChange={(e) =>
                                    onChange({
                                        ...item,
                                        yearEnd: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Компактный блок: архитекторы/стили/теги */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <MultiValueInput
                            dense
                            label="Архитекторы"
                            placeholder="Начните вводить..."
                            values={item.architects}
                            suggestions={architectSuggestions}
                            onChange={(v) => onChange({...item, architects: v})}
                        />

                        <MultiValueInput
                            dense
                            label="Стили"
                            placeholder="Начните вводить..."
                            values={item.styles}
                            suggestions={styleSuggestions}
                            onChange={(v) => onChange({...item, styles: v})}
                        />

                        <MultiValueInput
                            dense
                            label="Теги"
                            placeholder="Начните вводить..."
                            values={item.tags}
                            suggestions={tagSuggestions}
                            onChange={(v) => onChange({...item, tags: v})}
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
                            onChange={(v) => onChange({ ...item, description: v })}
                        />
                    </div>

                    <PhotoEditor
                        workspace={workspace}
                        photos={item.photos}
                        onChange={(p) => onChange({...item, photos: p})}
                    />

                    <Separator/>

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Геолокация и карта</div>
                        <MapPicker
                            address={item.address}
                            value={item.coordinates}
                            onChange={(c) => onChange({...item, coordinates: c})}
                            onChangeAddress={(address) => onChange({...item, address})}
                        />
                    </div>

                    <div className="space-y-2">
                        <MarkdownField
                            label="Мысли"
                            value={item.thoughts}
                            placeholder="Поддерживается Markdown..."
                            onChange={(v) => onChange({ ...item, thoughts: v })}
                        />
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Все изменения сохраняются автоматически в `db.json` (workspace).
                    </div>
                </CardContent>
            )}
        </Card>
    );
}