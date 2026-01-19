import type { DbFile, MarkerColorRules } from "./types";

export const DB_FILENAME = "db.json";
export const IMAGES_DIRNAME = "images";

export function emptyMarkerColorRules(): MarkerColorRules {
    return { tags: {}, styles: {}, architects: {} };
}

export function emptyDb(): DbFile {
    return { version: 2, items: [], markerColorRules: emptyMarkerColorRules() };
}

export async function ensureImagesDir(workspace: FileSystemDirectoryHandle) {
    await workspace.getDirectoryHandle(IMAGES_DIRNAME, { create: true });
}

export async function readDb(workspace: FileSystemDirectoryHandle): Promise<DbFile> {
    try {
        const fileHandle = await workspace.getFileHandle(DB_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text) as any;

        // миграция v1 -> v2
        if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
            const migrated: DbFile = {
                version: 2,
                items: parsed.items,
                markerColorRules: emptyMarkerColorRules(),
            };
            await writeDb(workspace, migrated);
            return migrated;
        }

        if (
            !parsed ||
            parsed.version !== 2 ||
            !Array.isArray(parsed.items) ||
            !parsed.markerColorRules
        ) {
            return emptyDb();
        }

        // нормализуем на случай частично отсутствующих полей
        const db: DbFile = {
            version: 2,
            items: parsed.items,
            markerColorRules: {
                tags: parsed.markerColorRules.tags ?? {},
                styles: parsed.markerColorRules.styles ?? {},
                architects: parsed.markerColorRules.architects ?? {},
            },
        };

        return db;
    } catch {
        const db = emptyDb();
        await writeDb(workspace, db);
        return db;
    }
}

export async function writeDb(workspace: FileSystemDirectoryHandle, db: DbFile) {
    const fileHandle = await workspace.getFileHandle(DB_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(db, null, 2));
    await writable.close();
}