import { useEffect, useMemo, useState } from "react";
import type { ArchitectureObject } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { MultiValueInput } from "./MultiValueInput";
import { PhotoEditor } from "./PhotoEditor";
import { MapPicker } from "./MapPicker";
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
    hasDuplicateName: boolean;
}) {
    const collapsedTags = useMemo(() => item.tags.slice(0, 5), [item.tags]);

    const titleIsEmpty = !item.name.trim();
    const titleError = hasDuplicateName
        ? "Название дублируется (проверьте другие карточки)."
        : null;

    const [localOpen, setLocalOpen] = useState(open);
    useEffect(() => setLocalOpen(open), [open]);

    return (
        <Card className="overflow-hidden">
            <CardHeader
                className={cn(
                    "cursor-pointer select-none",
                    localOpen ? "bg-card" : "bg-card"
                )}
                onClick={() => {
                    setLocalOpen(!localOpen);
                    onToggle();
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="truncate">
                            {item.name.trim() ? item.name : "Без названия"}
                        </CardTitle>

                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                            {item.styles.slice(0, 2).map((s) => (
                                <Badge key={s}>{s}</Badge>
                            ))}
                            {collapsedTags.map((t) => (
                                <Badge key={t} className="bg-muted text-foreground">
                                    {t}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" aria-label="toggle">
                            {localOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {localOpen && (
                <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                            <div className="text-sm font-medium">Название</div>
                            <Input
                                value={item.name}
                                className={cn(
                                    (titleIsEmpty || hasDuplicateName) && "border-destructive focus-visible:ring-destructive"
                                )}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onChange({ ...item, name: e.target.value })}
                                placeholder="Например: Собор Парижской Богоматери"
                            />
                            {titleIsEmpty && (
                                <div className="text-sm text-destructive">
                                    Название желательно указать (и оно участвует в проверке дублей).
                                </div>
                            )}
                            {titleError && <div className="text-sm text-destructive">{titleError}</div>}
                        </div>

                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 size={16} />
                            Удалить
                        </Button>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="text-sm font-medium">Год начала строительства (необязательно)</div>
                            <Input
                                type="number"
                                value={item.yearStart ?? ""}
                                placeholder="например 1883"
                                onChange={(e) =>
                                    onChange({
                                        ...item,
                                        yearStart: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="text-sm font-medium">Год окончания строительства</div>
                            <Input
                                type="number"
                                value={item.yearEnd ?? ""}
                                placeholder="например 1889"
                                onChange={(e) =>
                                    onChange({
                                        ...item,
                                        yearEnd: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    <Separator />

                    <MultiValueInput
                        label="Архитектор(ы)"
                        placeholder="Начните вводить имя..."
                        values={item.architects}
                        suggestions={architectSuggestions}
                        onChange={(v) => onChange({ ...item, architects: v })}
                    />

                    <Separator />

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Адрес</div>
                        <Input
                            value={item.address}
                            placeholder="Страна, город, улица, дом..."
                            onChange={(e) => onChange({ ...item, address: e.target.value })}
                        />
                    </div>

                    <MapPicker
                        address={item.address}
                        value={item.coordinates}
                        onChange={(c) => onChange({ ...item, coordinates: c })}
                    />

                    <Separator />

                    <MultiValueInput
                        label="Архитектурные стили"
                        placeholder="Начните вводить стиль..."
                        values={item.styles}
                        suggestions={styleSuggestions}
                        onChange={(v) => onChange({ ...item, styles: v })}
                    />

                    <Separator />

                    <MultiValueInput
                        label="Теги"
                        placeholder="Начните вводить тег..."
                        values={item.tags}
                        suggestions={tagSuggestions}
                        onChange={(v) => onChange({ ...item, tags: v })}
                    />

                    <Separator />

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Описание</div>
                        <Textarea
                            value={item.description}
                            placeholder="Неограниченный текст..."
                            onChange={(e) => onChange({ ...item, description: e.target.value })}
                        />
                    </div>

                    <PhotoEditor
                        workspace={workspace}
                        photos={item.photos}
                        onChange={(p) => onChange({ ...item, photos: p })}
                    />

                    <Separator />

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Мысли</div>
                        <Textarea
                            value={item.thoughts}
                            placeholder="Неограниченный текст..."
                            onChange={(e) => onChange({ ...item, thoughts: e.target.value })}
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