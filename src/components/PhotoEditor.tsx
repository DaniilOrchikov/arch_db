import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { readWorkspaceFile, saveImageFileToWorkspace, deleteWorkspaceFile } from "../lib/photos";
import { Trash2, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

type ResolvedPhoto = { src: string; revoke?: () => void };

async function resolvePhoto(workspace: FileSystemDirectoryHandle | null, p: Photo): Promise<ResolvedPhoto> {
    if (p.type === "url") return { src: p.value };
    if (!workspace) return { src: "" };
    const f = await readWorkspaceFile(workspace, p.value);
    const url = URL.createObjectURL(f);
    return { src: url, revoke: () => URL.revokeObjectURL(url) };
}

function extractUrlFromDataTransfer(dt: DataTransfer): string | null {
    const uriList = dt.getData("text/uri-list")?.trim();
    if (uriList) {
        const first = uriList.split("\n").map((x) => x.trim()).find((x) => x && !x.startsWith("#"));
        if (first && /^https?:\/\//i.test(first)) return first;
    }

    const plain = dt.getData("text/plain")?.trim();
    if (plain && /^https?:\/\//i.test(plain)) return plain;

    return null;
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

    const [dragOver, setDragOver] = useState(false);

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

    const safeActiveIdx = useMemo(() => {
        if (photos.length === 0) return 0;
        return Math.min(activeIdx, photos.length - 1);
    }, [activeIdx, photos.length]);
    const isViewerOpen = viewerOpen && photos.length > 0;
    const active = useMemo(() => photos[safeActiveIdx], [photos, safeActiveIdx]);
    const activeSrc = resolvedList[safeActiveIdx]?.src ?? "";

    async function addFiles(files: File[]) {
        if (!files.length) return;

        if (!workspace) {
            alert("Сначала выберите папку базы данных (workspace).");
            return;
        }

        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (!imageFiles.length) return;

        const rels = await Promise.all(imageFiles.map((f) => saveImageFileToWorkspace(workspace, f)));
        onChange([...photos, ...rels.map((rel) => ({ type: "file" as const, value: rel }))]);
    }

    function addUrl(u: string) {
        const nextUrl = u.trim();
        if (!nextUrl) return;
        onChange([...photos, { type: "url", value: nextUrl }]);
    }

    const goToPrev = () => {
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    };

    const goToNext = () => {
        setActiveIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    };

    // Обработчик клавиатуры для навигации
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isViewerOpen) return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                goToPrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                goToNext();
            } else if (e.key === "Escape") {
                setViewerOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isViewerOpen, goToNext, goToPrev]);

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Фотографии</div>

            {/* Dropzone */}
            <div
                className={cn(
                    "rounded-md border bg-card p-3",
                    "transition-colors",
                    dragOver && "border-primary ring-2 ring-primary/20"
                )}
                onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                }}
                onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);

                    const dt = e.dataTransfer;

                    // 1) Files
                    const files = Array.from(dt.files ?? []);
                    if (files.length) {
                        await addFiles(files);
                        return;
                    }

                    // 2) URL from browser drag
                    const u = extractUrlFromDataTransfer(dt);
                    if (u) {
                        addUrl(u); // сохраняем только URL, без скачивания
                    }
                }}
            >
                {/* Pinterest-like лента */}
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
                                        <img src={src} alt="" className="w-full h-auto object-cover" loading="lazy" />
                                    ) : (
                                        <div className="aspect-[4/3] w-full bg-gradient-to-br from-muted to-background" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                        Перетащите сюда файлы изображений или ссылку на картинку (URL). Также можно добавить через поля ниже.
                    </div>
                )}
            </div>

            {/* Fullscreen viewer */}
            <Dialog open={isViewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="p-0 gap-0 w-screen h-[100dvh] max-w-none sm:rounded-none">
                    <DialogTitle className="sr-only">Просмотр фото</DialogTitle>
                    <DialogDescription className="sr-only">Полноэкранный просмотр изображения</DialogDescription>

                    <div className="relative w-full h-[100dvh] bg-black">
                        {/* top bar */}
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 p-3 bg-gradient-to-b from-black/60 to-transparent">
                            <div className="text-xs text-white/80">
                                {photos.length ? `Фото ${safeActiveIdx + 1} из ${photos.length}` : ""}
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                {photos.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={async () => {
                                            const cur = photos[safeActiveIdx];

                                            if (cur?.type === "file" && workspace) {
                                                await deleteWorkspaceFile(workspace, cur.value);
                                            }

                                            const next = photos.filter((_, i) => i !== safeActiveIdx);
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

                        {/* Стрелка влево */}
                        {photos.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white"
                                onClick={goToPrev}
                                aria-label="Предыдущее фото"
                            >
                                <ChevronLeft size={24} />
                            </Button>
                        )}

                        {/* image */}
                        <div className="w-full h-full flex items-center justify-center">
                            {activeSrc ? (
                                <img src={activeSrc} alt="" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-sm text-white/70">Не удалось загрузить изображение</div>
                            )}
                        </div>

                        {/* Стрелка вправо */}
                        {photos.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white"
                                onClick={goToNext}
                                aria-label="Следующее фото"
                            >
                                <ChevronRight size={24} />
                            </Button>
                        )}

                        {/* bottom info */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/60 to-transparent">
                            <div className="text-xs text-white/70 truncate">
                                {active?.type === "file" ? active.value : active?.type === "url" ? active.value : ""}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Добавление URL / файла */}
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
                                addUrl(u);
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
                            addUrl(u);
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
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (!files.length) return;
                            await addFiles(files);
                            e.currentTarget.value = "";
                        }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                        <Upload size={16} />
                        Добавить файлы (в папку images)
                    </Button>
                </div>
            </div>
        </div>
    );
}
