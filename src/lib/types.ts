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

    styles: string[];
    tags: string[];

    description: string;
    photos: Photo[];

    thoughts: string;
};

export type MarkerColorRules = {
    tags: Record<string, string>;
    styles: Record<string, string>;
    architects: Record<string, string>;
};

export type DbFile = {
    version: 2;
    items: ArchitectureObject[];
    markerColorRules: MarkerColorRules;
};