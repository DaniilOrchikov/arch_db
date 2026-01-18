import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export function MarkdownField({
                                  label,
                                  value,
                                  placeholder,
                                  onChange,
                                  className,
                              }: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
    className?: string;
}) {
    const [mode, setMode] = useState<"edit" | "preview">("preview");

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{label}</div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={mode === "edit" ? "secondary" : "outline"}
                        onClick={() => setMode("edit")}
                    >
                        Редактирование
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={mode === "preview" ? "secondary" : "outline"}
                        onClick={() => setMode("preview")}
                    >
                        Просмотр
                    </Button>
                </div>
            </div>

            {mode === "edit" ? (
                <Textarea
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <div className="rounded-md border bg-card p-3">
                    {value.trim() ? (
                        <article className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                        </article>
                    ) : (
                        <div className="text-sm text-muted-foreground">Пусто</div>
                    )}
                </div>
            )}
        </div>
    );
}