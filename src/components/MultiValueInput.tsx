import { useMemo, useRef, useState } from "react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { X } from "lucide-react";

function norm(s: string) {
    return s.trim().toLowerCase();
}

export function MultiValueInput({
                                    label,
                                    placeholder,
                                    values,
                                    suggestions,
                                    onChange,
                                }: {
    label: string;
    placeholder?: string;
    values: string[];
    suggestions: string[];
    onChange: (next: string[]) => void;
}) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const filtered = useMemo(() => {
        const nq = norm(q);
        const set = new Set(values.map(norm));
        const base = suggestions
            .filter((s) => !set.has(norm(s)))
            .filter((s) => (nq ? norm(s).includes(nq) : true))
            .slice(0, 8);
        return base;
    }, [q, suggestions, values]);

    function addValue(v: string) {
        const vv = v.trim();
        if (!vv) return;
        const set = new Set(values.map(norm));
        if (set.has(norm(vv))) return;
        onChange([...values, vv]);
        setQ("");
        setOpen(false);
    }

    function removeValue(v: string) {
        onChange(values.filter((x) => norm(x) !== norm(v)));
    }

    return (
        <div
            className="space-y-2"
            ref={rootRef}
            onBlur={(e) => {
                // закрыть dropdown, если фокус ушёл наружу
                const next = e.relatedTarget as Node | null;
                if (next && rootRef.current?.contains(next)) return;
                setOpen(false);
            }}
        >
            <div className="text-sm font-medium">{label}</div>

            <div className="flex flex-wrap gap-2">
                {values.map((v) => (
                    <div key={v} className="flex items-center gap-1">
                        <Badge className="gap-1">
                            <span className="max-w-[220px] truncate">{v}</span>
                            <button
                                type="button"
                                className="ml-1 rounded hover:opacity-80"
                                onClick={() => removeValue(v)}
                                aria-label="remove"
                            >
                                <X size={12} />
                            </button>
                        </Badge>
                    </div>
                ))}
            </div>

            <div className="relative">
                <div className="flex gap-2">
                    <Input
                        value={q}
                        placeholder={placeholder}
                        onFocus={() => setOpen(true)}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setOpen(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addValue(q);
                            }
                            if (e.key === "Escape") setOpen(false);
                        }}
                    />
                    <Button type="button" variant="secondary" onClick={() => addValue(q)}>
                        Добавить
                    </Button>
                </div>

                {open && (filtered.length > 0 || q.trim()) && (
                    <div
                        className={cn(
                            "absolute z-10 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
                        )}
                    >
                        <div className="max-h-56 overflow-auto p-1">
                            {filtered.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => addValue(s)}
                                >
                                    {s}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <div className="px-2 py-2 text-sm text-muted-foreground">
                                    Нет совпадений. Нажмите Enter, чтобы добавить “{q.trim()}”.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}