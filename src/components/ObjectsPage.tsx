import { useMemo } from "react";
import type { ArchitectureObject } from "../lib/types";
import { Button } from "./ui/button";
import { ObjectCard } from "./ObjectCard";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";

function uniqSorted(values: string[]) {
    const s = new Set(values.map((x) => x.trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function norm(s: string) {
    return s.trim().toLowerCase();
}

export function ObjectsPage({
                                workspace,
                                items,
                                openId,
                                setOpenId,
                                onChangeItems,
                            }: {
    workspace: FileSystemDirectoryHandle | null;
    items: ArchitectureObject[];
    openId: string | null;
    setOpenId: (id: string | null) => void;
    onChangeItems: (next: ArchitectureObject[]) => void;
}) {
    const tagSuggestions = useMemo(
        () => uniqSorted(items.flatMap((i) => i.tags)),
        [items]
    );
    const architectSuggestions = useMemo(
        () => uniqSorted(items.flatMap((i) => i.architects)),
        [items]
    );
    const styleSuggestions = useMemo(
        () => uniqSorted(items.flatMap((i) => i.styles)),
        [items]
    );

    const dupMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const it of items) {
            const k = norm(it.name);
            if (!k) continue;
            m.set(k, (m.get(k) ?? 0) + 1);
        }
        return m;
    }, [items]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Просмотр и создание объектов</div>
                    <div className="text-sm text-muted-foreground">
                        Карточки раскрываются по клику, редактирование — прямо в тексте.
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={() => {
                        const id = uuidv4();
                        const empty: ArchitectureObject = {
                            id,
                            name: "",
                            yearStart: null,
                            yearEnd: null,
                            architects: [],
                            address: "",
                            coordinates: { lat: null, lng: null },
                            styles: [],
                            tags: [],
                            description: "",
                            photos: [],
                            thoughts: "",
                        };
                        onChangeItems([empty, ...items]);
                        setOpenId(id);
                    }}
                >
                    <Plus size={16} />
                    Добавить объект
                </Button>
            </div>

            <div className="space-y-3">
                {items.map((it) => {
                    const isOpen = openId === it.id;
                    const key = norm(it.name);
                    const hasDuplicateName = key ? (dupMap.get(key) ?? 0) > 1 : false;

                    return (
                        <ObjectCard
                            key={it.id}
                            workspace={workspace}
                            item={it}
                            open={isOpen}
                            onToggle={() => setOpenId(isOpen ? null : it.id)}
                            onChange={(next) => {
                                onChangeItems(items.map((x) => (x.id === it.id ? next : x)));
                            }}
                            onDelete={() => {
                                const next = items.filter((x) => x.id !== it.id);
                                onChangeItems(next);
                                if (openId === it.id) setOpenId(null);
                            }}
                            tagSuggestions={tagSuggestions}
                            architectSuggestions={architectSuggestions}
                            styleSuggestions={styleSuggestions}
                            hasDuplicateName={hasDuplicateName}
                        />
                    );
                })}
            </div>
        </div>
    );
}