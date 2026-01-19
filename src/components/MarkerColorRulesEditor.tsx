import { useMemo, useState } from "react";
import type { MarkerAppearanceRules } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

type Kind = "tagIcons" | "styleColors";

function norm(s: string) {
    return s.trim().toLowerCase();
}

export function MarkerColorRulesEditor({
                                           rules,
                                           setRules,
                                           tagSuggestions,
                                           styleSuggestions,
                                       }: {
    rules?: MarkerAppearanceRules;
    setRules: (next: MarkerAppearanceRules) => void;
    tagSuggestions: string[];
    styleSuggestions: string[];
}) {
    const safeRules: MarkerAppearanceRules = rules ?? { tagIcons: {}, styleColors: {} };

    const [kind, setKind] = useState<Kind>("tagIcons");
    const [key, setKey] = useState("");
    const [color, setColor] = useState("#2563eb");
    const [iconName, setIconName] = useState("home");

    const suggestions = useMemo(() => {
        return kind === "tagIcons" ? tagSuggestions : styleSuggestions;
    }, [kind, tagSuggestions, styleSuggestions]);

    const entries = useMemo(() => {
        const m = safeRules[kind];
        return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
    }, [safeRules, kind]);

    function addOrUpdate() {
        const k = norm(key);
        if (!k) return;

        const newRules = { ...safeRules };

        if (kind === "styleColors") {
            newRules.styleColors = { ...safeRules.styleColors, [k]: color };
        } else {
            const icon = iconName.trim();
            if (!icon) return;

            newRules.tagIcons = { ...safeRules.tagIcons, [k]: icon };
        }

        setRules(newRules);
        setKey("");
    }

    function remove(k: string) {
        const newRules = { ...safeRules };
        const kindMap = newRules[kind];
        delete kindMap[k];

        if (kind === "styleColors") {
            newRules.styleColors = { ...kindMap };
        } else {
            newRules.tagIcons = { ...kindMap };
        }

        setRules(newRules);
    }

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Внешний вид маркеров</div>

            <div className="flex gap-2">
                <Button type="button" variant={kind === "tagIcons" ? "default" : "outline"} onClick={() => setKind("tagIcons")}>
                    Теги (иконка)
                </Button>
                <Button
                    type="button"
                    variant={kind === "styleColors" ? "default" : "outline"}
                    onClick={() => setKind("styleColors")}
                >
                    Стили (цвет)
                </Button>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <div className="flex-1">
                    <Input value={key} placeholder={kind === "tagIcons" ? "Тег" : "Стиль"} onChange={(e) => setKey(e.target.value)} list={`suggestions-${kind}`} />
                    <datalist id={`suggestions-${kind}`}>
                        {suggestions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>

                {kind === "styleColors" ? (
                    <div className="flex items-center gap-2">
                        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-14 p-1" title="Цвет" />
                        <Button type="button" onClick={addOrUpdate}>
                            Добавить/обновить
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Input value={iconName} onChange={(e) => setIconName(e.target.value)} placeholder="icon name (например home)" />
                        <div className="rounded-md border px-2 py-1 text-sm flex items-center gap-2">
              <span className="material-symbols-rounded" style={{ fontSize: 18, lineHeight: 1 }}>
                {iconName.trim() || "help"}
              </span>
                            <span className="text-muted-foreground">preview</span>
                        </div>
                        <Button type="button" onClick={addOrUpdate}>
                            Добавить/обновить
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
                {entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Правил пока нет.</div>
                ) : (
                    entries.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {kind === "styleColors" ? (
                                    <div style={{ width: 14, height: 14, borderRadius: 9999, background: v as string, border: "1px solid rgba(0,0,0,0.15)" }} />
                                ) : (
                                    <span className="material-symbols-rounded" style={{ fontSize: 18, lineHeight: 1 }}>
                    {v as string}
                  </span>
                                )}
                                <div className="text-sm">{k}</div>
                                <div className="text-xs text-muted-foreground">{String(v)}</div>
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