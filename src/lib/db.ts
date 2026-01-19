import type { DbFile, MarkerAppearanceRules } from "./types";

export const DB_FILENAME = "db.json";
export const IMAGES_DIRNAME = "images";

export function emptyMarkerAppearanceRules(): MarkerAppearanceRules {
    return { tagIcons: {}, styleColors: {} };
}

export function emptyDb(): DbFile {
    return { version: 3, items: [], markerAppearanceRules: emptyMarkerAppearanceRules() };
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

        // v1 -> v3
        if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
            const migrated: DbFile = {
                version: 3,
                items: parsed.items.map((item: any) => ({
                    ...item,
                    countries: [],
                    cities: [],
                })),
                markerAppearanceRules: emptyMarkerAppearanceRules(),
            };
            await writeDb(workspace, migrated);
            return migrated;
        }

        // v2 -> v3 (markerColorRules.styles -> styleColors)
        if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
            const migrated: DbFile = {
                version: 3,
                items: parsed.items.map((item: any) => ({
                    ...item,
                    countries: item.countries || [],
                    cities: item.cities || [],
                })),
                markerAppearanceRules: {
                    tagIcons: {},
                    styleColors: parsed.markerColorRules?.styles ?? {},
                },
            };
            await writeDb(workspace, migrated);
            return migrated;
        }

        if (!parsed || parsed.version !== 3 || !Array.isArray(parsed.items) || !parsed.markerAppearanceRules) {
            return emptyDb();
        }

        const db: DbFile = {
            version: 3,
            items: parsed.items.map((item: any) => ({
                ...item,
                countries: item.countries || [],
                cities: item.cities || [],
            })),
            markerAppearanceRules: {
                tagIcons: parsed.markerAppearanceRules.tagIcons ?? {},
                styleColors: parsed.markerAppearanceRules.styleColors ?? {},
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