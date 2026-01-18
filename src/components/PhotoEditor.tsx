import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { readWorkspaceFile, saveImageFileToWorkspace, deleteWorkspaceFile } from "../lib/photos";
import { Trash2, Upload } from "lucide-react";
import { cn } from "../lib/utils";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";

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
    const [url, setUrl] = useState("");
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [resolvedList, setResolvedList] = useState<ResolvedPhoto[]>([]);
    const prevResolvedRef = useRef<ResolvedPhoto[]>([]);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState<number>(0);

    useEffect(() => {
        let alive = true;

        (async () => {
            const res = await Promise.all(photos.map((p) => resolvePhoto(workspace, p)));

            if (!alive) {
                res.forEach((r) => r.revoke?.());
                return;
            }

            prevResolvedRef.current.forEach((r) => r.revoke?.());
            prevResolvedRef.current = res;
            setResolvedList(res);
        })();

        return () => {
            alive = false;
        };
    }, [photos, workspace]);

    useEffect(() => {
        return () => {
            prevResolvedRef.current.forEach((r) => r.revoke?.());
        };
    }, []);

    useEffect(() => {
        // если удалили фото, которое было открыто — поправим индекс/закроем
        if (!photos.length) {
            setViewerOpen(false);
            setActiveIdx(0);
            return;
        }
        if (activeIdx > photos.length - 1) setActiveIdx(photos.length - 1);
    }, [photos.length, activeIdx]);

    const active = useMemo(() => photos[activeIdx], [photos, activeIdx]);
    const activeSrc = resolvedList[activeIdx]?.src ?? "";

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Фотографии</div>

            {/* Pinterest-like лента */}
            <div className="rounded-md border bg-card p-3">
                {photos.length ? (
                    <div className="columns-2 md:columns-3 xl:columns-4 gap-3">
                        {photos.map((p, i) => {
                            const r = resolvedList[i];
                            const src = r?.src ?? "";
                            const key = `${p.type}:${p.value}:${i}`;

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className={cn(
                                        "mb-3 w-full overflow-hidden rounded-md border bg-muted text-left",
                                        "break-inside-avoid",
                                        "hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    )}
                                    onClick={() => {
                                        setActiveIdx(i);
                                        setViewerOpen(true);
                                    }}
                                    aria-label={`open-photo-${i + 1}`}
                                >
                                    {src ? (
                                        <img
                                            src={src}
                                            alt=""
                                            className="w-full h-auto object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="aspect-[4/3] w-full bg-gradient-to-br from-muted to-background" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                        Добавьте фото (файл или URL)
                    </div>
                )}
            </div>

            {/* Fullscreen viewer */}
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="p-0 gap-0 w-screen h-[100dvh] max-w-none sm:rounded-none">
                    {/* a11y (можно скрыть визуально, но пусть будет) */}
                    <DialogTitle className="sr-only">Просмотр фото</DialogTitle>
                    <DialogDescription className="sr-only">
                        Полноэкранный просмотр изображения
                    </DialogDescription>

                    <div className="relative w-full h-[100dvh] bg-black">
                        {/* верхняя панель */}
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 p-3 bg-gradient-to-b from-black/60 to-transparent">
                            <div className="text-xs text-white/80">
                                {photos.length ? `Фото ${activeIdx + 1} из ${photos.length}` : ""}
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                {photos.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={async () => {
                                            const cur = photos[activeIdx];

                                            if (cur?.type === "file" && workspace) {
                                                await deleteWorkspaceFile(workspace, cur.value);
                                            }

                                            const next = photos.filter((_, i) => i !== activeIdx);
                                            onChange(next);

                                            if (next.length === 0) {
                                                setViewerOpen(false);
                                                setActiveIdx(0);
                                            } else {
                                                setActiveIdx((x) => Math.max(0, Math.min(x, next.length - 1)));
                                            }
                                        }}
                                    >
                                        <Trash2 size={16} />
                                        Удалить
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* картинка */}
                        <div className="w-full h-full flex items-center justify-center">
                            {activeSrc ? (
                                <img
                                    src={activeSrc}
                                    alt=""
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : (
                                <div className="text-sm text-white/70">Не удалось загрузить изображение</div>
                            )}
                        </div>

                        {/* низ: подпись/источник (по желанию) */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/60 to-transparent">
                            <div className="text-xs text-white/70 truncate">
                                {active?.type === "file"
                                    ? active.value
                                    : active?.type === "url"
                                        ? active.value
                                        : ""}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Добавление URL / файла — оставляем как было */}
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