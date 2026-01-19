// types.ts
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
};

export type MarkerAppearanceRules = {
    tagIcons: Record<string, string>;

    styleColors: Record<string, string>;
};

export type DbFile = {
    version: 3;
    items: ArchitectureObject[];
    markerAppearanceRules: MarkerAppearanceRules;
};