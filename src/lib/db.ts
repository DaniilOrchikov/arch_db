import type { DbFile } from "./types";

export const DB_FILENAME = "db.json";
export const IMAGES_DIRNAME = "images";

export function emptyDb(): DbFile {
    return { version: 1, items: [] };
}

export async function ensureImagesDir(workspace: FileSystemDirectoryHandle) {
    await workspace.getDirectoryHandle(IMAGES_DIRNAME, { create: true });
}

export async function readDb(workspace: FileSystemDirectoryHandle): Promise<DbFile> {
    try {
        const fileHandle = await workspace.getFileHandle(DB_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text) as DbFile;
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
            return emptyDb();
        }
        return parsed;
    } catch {
        // Если файла нет — создаём пустой
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