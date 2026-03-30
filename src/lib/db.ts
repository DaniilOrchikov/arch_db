import type { ArchitectureObject, DbFile, MarkerAppearanceRules, Style } from "./types";
import { v4 as uuidv4 } from "uuid";

export const DB_FILENAME = "db.json";
export const IMAGES_DIRNAME = "images";

export function emptyMarkerAppearanceRules(): MarkerAppearanceRules {
    return { tagIcons: {}, styleColors: {} };
}

export function emptyStyle(): Style {
    return {
        id: '',
        name: '',
        countries: [],
        cities: [],
        architects: [],
        description: '',
        thoughts: '',
        photos: [],
        completed: false,
        linkedObjects: []
    };
}

export function emptyDb(): DbFile {
    return {
        version: 4,
        items: [],
        styles: [],
        markerAppearanceRules: emptyMarkerAppearanceRules()
    };
}

export async function ensureImagesDir(workspace: FileSystemDirectoryHandle) {
    await workspace.getDirectoryHandle(IMAGES_DIRNAME, { create: true });
}

export async function readDb(workspace: FileSystemDirectoryHandle): Promise<DbFile> {
    try {
        const fileHandle = await workspace.getFileHandle(DB_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<DbFile>;

        if (!parsed || parsed.version !== 4 || !Array.isArray(parsed.items) || !parsed.markerAppearanceRules) {
            return emptyDb();
        }

        const db: DbFile = {
            version: 4,
            items: parsed.items.map((item) => ({
                ...item,
                countries: item.countries ?? [],
                cities: item.cities ?? [],
                completed: item.completed ?? false,
                favorite: item.favorite ?? false,
            })),
            styles: parsed.styles?.map((style) => ({
                ...style,
                countries: style.countries ?? [],
                cities: style.cities ?? [],
                architects: style.architects ?? [],
                photos: style.photos ?? [],
                linkedObjects: style.linkedObjects ?? [],
            })) || [],
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

// Функция для обновления связей стилей на основе объектов
export function updateStyleRelationships(items: ArchitectureObject[], styles: Style[]): Style[] {
    const styleMap = new Map<string, Style>();

    // Инициализируем мапу стилей
    styles.forEach(style => {
        styleMap.set(style.name, {
            ...style,
            countries: [],
            cities: [],
            architects: [],
            linkedObjects: []
        });
    });

    // Обходим все объекты и собираем данные для стилей
    items.forEach(item => {
        item.styles.forEach(styleName => {
            if (!styleMap.has(styleName)) {
                // Создаем новый стиль, если его нет
                styleMap.set(styleName, {
                    id: uuidv4(),
                    name: styleName,
                    countries: [],
                    cities: [],
                    architects: [],
                    description: '',
                    thoughts: '',
                    photos: [],
                    completed: false,
                    linkedObjects: []
                });
            }

            const style = styleMap.get(styleName)!;

            // Добавляем ID объекта
            if (!style.linkedObjects.includes(item.id)) {
                style.linkedObjects.push(item.id);
            }

            // Добавляем страны
            item.countries.forEach(country => {
                if (!style.countries.includes(country)) {
                    style.countries.push(country);
                }
            });

            // Добавляем города
            item.cities.forEach(city => {
                if (!style.cities.includes(city)) {
                    style.cities.push(city);
                }
            });

            // Добавляем архитекторов
            item.architects.forEach(architect => {
                if (!style.architects.includes(architect)) {
                    style.architects.push(architect);
                }
            });

            styleMap.set(styleName, style);
        });
    });

    // Удаляем стили, на которые нет ссылок
    const result: Style[] = [];
    styleMap.forEach((style, name) => {
        // Проверяем, есть ли хотя бы один объект с этим стилем
        const hasLinkedObjects = items.some(item =>
            item.styles.includes(name)
        );

        if (hasLinkedObjects) {
            result.push(style);
        }
    });

    return result;
}
