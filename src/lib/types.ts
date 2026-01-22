// types.ts (дополненный)
export type Photo =
    | { type: "url"; value: string }
    | { type: "file"; value: string };

export type Coordinates = {
    lat: number | null;
    lng: number | null;
};

export type ArchitectureObject = {
    id: string;
    name: string;
    yearStart?: number | null;
    yearEnd: number | null;
    architects: string[];
    address: string;
    coordinates: Coordinates;
    countries: string[];
    cities: string[];
    styles: string[];
    tags: string[];
    description: string;
    photos: Photo[];
    thoughts: string;
    completed: boolean;
};

// Новый тип для стиля
export type Style = {
    id: string;
    name: string; // Уникальное название стиля
    countries: string[]; // Автоматически собирается из объектов
    cities: string[]; // Автоматически собирается из объектов
    architects: string[]; // Автоматически собирается из объектов
    description: string;
    thoughts: string;
    photos: Photo[];
    completed: boolean;
    linkedObjects: string[]; // ID объектов, которые ссылаются на этот стиль
};

export type MarkerAppearanceRules = {
    tagIcons: Record<string, string>;
    styleColors: Record<string, string>;
};

export type DbFile = {
    version: 4; // Изменена версия с 3 на 4
    items: ArchitectureObject[];
    styles: Style[]; // Добавлен массив стилей
    markerAppearanceRules: MarkerAppearanceRules;
};