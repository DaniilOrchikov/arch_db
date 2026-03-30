import { useMemo, useState, useEffect, useCallback } from "react";
import type { Style, ArchitectureObject } from "../lib/types";
import { Button } from "./ui/button";
import { StyleCard } from "./StyleCard";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { updateStyleRelationships } from "../lib/db";

export function StylesPage({
                               workspace,
                               items,
                               styles,
                               onChangeStyles,
                               onOpenObject,
                               openStyleId, // Добавлено: ID открытого стиля
                               onOpenStyle, // Добавлено: обработчик открытия стиля
                           }: {
    workspace: FileSystemDirectoryHandle | null;
    items: ArchitectureObject[];
    styles: Style[];
    onChangeStyles: (next: Style[]) => void;
    onOpenObject: (id: string) => void;
    openStyleId?: string | null; // Добавлено: ID открытого стиля
    onOpenStyle?: (id: string | null) => void; // Добавлено: обработчик открытия стиля
}) {
    // Автоматически обновляем связи при изменении объектов
    useEffect(() => {
        const updatedStyles = updateStyleRelationships(items, styles);
        if (JSON.stringify(updatedStyles) !== JSON.stringify(styles)) {
            onChangeStyles(updatedStyles);
        }
    }, [items, styles, onChangeStyles]);

    // Мапа объектов для быстрого доступа
    const objectsMap = useMemo(() => {
        const map = new Map<string, ArchitectureObject>();
        items.forEach(item => map.set(item.id, item));
        return map;
    }, [items]);

    // Мапа стилей с их объектами
    const stylesWithObjects = useMemo(() => {
        return styles.map(style => ({
            style,
            linkedObjects: style.linkedObjects
                .map(id => objectsMap.get(id))
                .filter((obj): obj is ArchitectureObject => obj !== undefined)
                .sort((a, b) => a.name.localeCompare(b.name)) // Сортируем по названию
        }));
    }, [styles, objectsMap]);

    // Состояние для открытой карточки в неконтролируемом режиме
    const [internalOpenId, setInternalOpenId] = useState<string | null>(null);
    const effectiveOpenId = openStyleId !== undefined ? openStyleId : internalOpenId;
    const setOpenId = useCallback((id: string | null) => {
        if (openStyleId === undefined) {
            setInternalOpenId(id);
        }
        onOpenStyle?.(id);
    }, [openStyleId, onOpenStyle]);

    const openStyle = effectiveOpenId ? styles.find(s => s.id === effectiveOpenId) ?? null : null;

    const collapsedStyles = useMemo(() => {
        if (!openStyle) return stylesWithObjects;
        return stylesWithObjects.filter(({ style }) => style.id !== openStyle.id);
    }, [stylesWithObjects, openStyle]);

    const handleAddStyle = useCallback(() => {
        const id = uuidv4();
        const newStyle: Style = {
            id,
            name: "",
            countries: [],
            cities: [],
            architects: [],
            description: "",
            thoughts: "",
            photos: [],
            completed: false,
            linkedObjects: []
        };
        onChangeStyles([newStyle, ...styles]);
        setOpenId(id);
    }, [styles, onChangeStyles, setOpenId]);

    const handleChangeStyle = useCallback((styleId: string, updates: Partial<Style>) => {
        const updated = styles.map(s => s.id === styleId ? { ...s, ...updates } : s);
        onChangeStyles(updateStyleRelationships(items, updated));
    }, [styles, items, onChangeStyles]);

    const handleDeleteStyle = useCallback((styleId: string) => {
        const next = styles.filter(s => s.id !== styleId);
        onChangeStyles(next);
        if (effectiveOpenId === styleId) {
            setOpenId(null);
        }
    }, [styles, effectiveOpenId, onChangeStyles, setOpenId]);

    // Обработчик переключения карточки стиля
    const handleToggleStyle = useCallback((styleId: string) => {
        const newOpenId = effectiveOpenId === styleId ? null : styleId;
        setOpenId(newOpenId);
    }, [effectiveOpenId, setOpenId]);

    return (
        <div className="space-y-4">
            {/* Верхняя панель */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    Всего стилей: {styles.length}
                </div>

                <Button
                    type="button"
                    onClick={handleAddStyle}
                >
                    <Plus size={16} />
                    Добавить стиль
                </Button>
            </div>

            {/* Открытая карточка стиля */}
            {openStyle && (
                <div className="space-y-3">
                    <StyleCard
                        workspace={workspace}
                        style={openStyle}
                        open={true}
                        onToggle={() => handleToggleStyle(openStyle.id)}
                        onChange={(next) => handleChangeStyle(openStyle.id, next)}
                        onDelete={() => handleDeleteStyle(openStyle.id)}
                        linkedObjects={openStyle.linkedObjects
                            .map(id => objectsMap.get(id))
                            .filter((obj): obj is ArchitectureObject => obj !== undefined)}
                        onOpenObject={onOpenObject}
                    />
                </div>
            )}

            {/* Сетка карточек стилей */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {collapsedStyles.map(({ style, linkedObjects }) => (
                    <StyleCard
                        key={style.id}
                        workspace={workspace}
                        style={style}
                        open={false}
                        onToggle={() => handleToggleStyle(style.id)}
                        onChange={(next) => handleChangeStyle(style.id, next)}
                        onDelete={() => handleDeleteStyle(style.id)}
                        linkedObjects={linkedObjects}
                        onOpenObject={onOpenObject}
                    />
                ))}
            </div>

            {/* Сообщение если стилей нет */}
            {styles.length === 0 && (
                <div className="rounded-md border bg-card p-8 text-center">
                    <div className="text-lg font-medium mb-2">Стили не найдены</div>
                    <div className="text-sm text-muted-foreground mb-4">
                        Создайте первый стиль или добавьте стили в объекты архитектуры
                    </div>
                    <Button
                        onClick={handleAddStyle}
                    >
                        <Plus size={16} className="mr-2" />
                        Создать первый стиль
                    </Button>
                </div>
            )}
        </div>
    );
}
