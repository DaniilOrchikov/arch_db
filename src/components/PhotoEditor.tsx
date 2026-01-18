import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { readWorkspaceFile, saveImageFileToWorkspace } from "../lib/photos";
import { ChevronLeft, ChevronRight, Trash2, ArrowLeft, ArrowRight, Upload } from "lucide-react";

type ResolvedPhoto = { src: string; revoke?: () => void };

async function resolvePhoto(
    workspace: FileSystemDirectoryHandle | null,
    p: Photo
): Promise<ResolvedPhoto> {
    if (p.type === "url") return { src: p.value };
    if (!workspace) return { src: "" };
    const f = await readWorkspaceFile(workspace, p.value);
    const url = URL.createObjectURL(f);
    return { src: url, revoke: () => URL.revokeObjectURL(url) };
}

export function PhotoEditor({
                                workspace,
                                photos,
                                onChange,
                            }: {
    workspace: FileSystemDirectoryHandle | null;
    photos: Photo[];
    onChange: (next: Photo[]) => void;
}) {
    const [idx, setIdx] = useState(0);
    const [url, setUrl] = useState("");
    const [resolved, setResolved] = useState<ResolvedPhoto | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!photos.length) {
                if (resolved?.revoke) resolved.revoke();
                setResolved(null);
                return;
            }
            const p = photos[Math.min(idx, photos.length - 1)];
            const r = await resolvePhoto(workspace, p);
            if (!alive) {
                r.revoke?.();
                return;
            }
            if (resolved?.revoke) resolved.revoke();
            setResolved(r);
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, photos, workspace]);

    useEffect(() => {
        if (idx > photos.length - 1) setIdx(Math.max(0, photos.length - 1));
    }, [idx, photos.length]);

    const canPrev = idx > 0;
    const canNext = idx < photos.length - 1;

    const current = useMemo(() => photos[idx], [photos, idx]);

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Фотографии</div>

            <div className="rounded-md border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b">
                    <div className="text-sm text-muted-foreground">
                        {photos.length ? `Фото ${idx + 1} из ${photos.length}` : "Нет фотографий"}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!photos.length || !canPrev}
                            onClick={() => setIdx((x) => Math.max(0, x - 1))}
                            aria-label="prev"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!photos.length || !canNext}
                            onClick={() => setIdx((x) => Math.min(photos.length - 1, x + 1))}
                            aria-label="next"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>

                <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                    {photos.length && resolved?.src ? (
                        <img
                            src={resolved.src}
                            alt=""
                            className="h-full w-full object-contain bg-black/5"
                        />
                    ) : (
                        <div className="text-sm text-muted-foreground">Добавьте фото (файл или URL)</div>
                    )}
                </div>

                {photos.length > 0 && (
                    <div className="p-2 border-t flex flex-wrap gap-2 items-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => {
                                const next = [...photos];
                                const t = next[idx - 1];
                                next[idx - 1] = next[idx];
                                next[idx] = t;
                                onChange(next);
                                setIdx((x) => x - 1);
                            }}
                        >
                            <ArrowLeft size={16} />
                            Влево
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={idx === photos.length - 1}
                            onClick={() => {
                                const next = [...photos];
                                const t = next[idx + 1];
                                next[idx + 1] = next[idx];
                                next[idx] = t;
                                onChange(next);
                                setIdx((x) => x + 1);
                            }}
                        >
                            <ArrowRight size={16} />
                            Вправо
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                const next = photos.filter((_, i) => i !== idx);
                                onChange(next);
                                setIdx((x) => Math.max(0, Math.min(x, next.length - 1)));
                            }}
                        >
                            <Trash2 size={16} />
                            Удалить
                        </Button>

                        <div className="ml-auto text-xs text-muted-foreground">
                            {current?.type === "file" ? current.value : current?.type === "url" ? "URL" : ""}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2">
                <div className="flex gap-2">
                    <Input
                        value={url}
                        placeholder="Вставьте URL картинки и нажмите Добавить"
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                const u = url.trim();
                                if (!u) return;
                                onChange([...photos, { type: "url", value: u }]);
                                setUrl("");
                                setIdx(photos.length);
                            }
                        }}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            const u = url.trim();
                            if (!u) return;
                            onChange([...photos, { type: "url", value: u }]);
                            setUrl("");
                            setIdx(photos.length);
                        }}
                    >
                        Добавить URL
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;

                            if (!workspace) {
                                alert("Сначала выберите папку базы данных (workspace).");
                                return;
                            }

                            const rel = await saveImageFileToWorkspace(workspace, f);
                            onChange([...photos, { type: "file", value: rel }]);
                            setIdx(photos.length);
                            e.currentTarget.value = "";
                        }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                        <Upload size={16} />
                        Добавить файл (в папку images)
                    </Button>
                </div>
            </div>
        </div>
    );
}