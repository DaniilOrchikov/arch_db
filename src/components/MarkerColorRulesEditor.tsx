import { useMemo, useState } from "react";
import type { MarkerColorRules } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

type Kind = "tags" | "styles" | "architects";

function norm(s: string) {
    return s.trim().toLowerCase();
}

export function MarkerColorRulesEditor({
                                           rules,
                                           setRules,
                                           tagSuggestions,
                                           styleSuggestions,
                                           architectSuggestions,
                                       }: {
    rules?: MarkerColorRules;
    setRules: (next: MarkerColorRules) => void;
    tagSuggestions: string[];
    styleSuggestions: string[];
    architectSuggestions: string[];
}) {
    const safeRules: MarkerColorRules = rules ?? { tags: {}, styles: {}, architects: {} };
    const [kind, setKind] = useState<Kind>("tags");
    const [key, setKey] = useState("");
    const [color, setColor] = useState("#2563eb");

    const suggestions = useMemo(() => {
        if (kind === "tags") return tagSuggestions;
        if (kind === "styles") return styleSuggestions;
        return architectSuggestions;
    }, [kind, tagSuggestions, styleSuggestions, architectSuggestions]);

    const entries = useMemo(() => {
        const m = safeRules[kind];
        return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
    }, [rules, kind]);

    function addOrUpdate() {
        const k = norm(key);
        if (!k) return;
        setRules({
            ...safeRules,
            [kind]: {
                ...safeRules[kind],
                [k]: color,
            },
        });
        setKey("");
    }

    function remove(k: string) {
        const next = { ...safeRules[kind] };
        delete next[k];
        setRules({ ...safeRules, [kind]: next });
    }

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Цвета маркеров</div>

            <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={kind === "tags" ? "default" : "outline"}
                        onClick={() => setKind("tags")}
                    >
                        Теги
                    </Button>
                    <Button
                        type="button"
                        variant={kind === "styles" ? "default" : "outline"}
                        onClick={() => setKind("styles")}
                    >
                        Стили
                    </Button>
                    <Button
                        type="button"
                        variant={kind === "architects" ? "default" : "outline"}
                        onClick={() => setKind("architects")}
                    >
                        Архитекторы
                    </Button>
                </div>

                <div className="flex-1">
                    <Input
                        value={key}
                        placeholder={`Значение (${kind})`}
                        onChange={(e) => setKey(e.target.value)}
                        list={`suggestions-${kind}`}
                    />
                    <datalist id={`suggestions-${kind}`}>
                        {suggestions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-14 p-1"
                        title="Цвет"
                    />
                    <Button type="button" onClick={addOrUpdate}>
                        Добавить/обновить
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                {entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Правил пока нет.</div>
                ) : (
                    entries.map(([k, c]) => (
                        <div key={k} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div
                                    style={{ width: 14, height: 14, borderRadius: 9999, background: c, border: "1px solid rgba(0,0,0,0.15)" }}
                                />
                                <div className="text-sm">{k}</div>
                                <div className="text-xs text-muted-foreground">{c}</div>
                            </div>
                            <Button type="button" variant="secondary" onClick={() => remove(k)}>
                                Удалить
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}