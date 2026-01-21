import type { AppTab } from "../components/Sidebar";
import type { Filters, SortRule, SortField } from "../components/FiltersSortDialog";
import type { MapFilters } from "../components/MapFiltersDialog";

function getParams(): URLSearchParams {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
}

function replaceParams(next: URLSearchParams) {
    if (typeof window === "undefined") return;
    const qs = next.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
}

function getString(p: URLSearchParams, key: string, fallback: string) {
    const v = p.get(key);
    return v == null ? fallback : v;
}

function setString(p: URLSearchParams, key: string, value: string, emptyMeansDelete = true) {
    const v = value ?? "";
    if (emptyMeansDelete && !v.trim()) p.delete(key);
    else p.set(key, v);
}

function getArray(p: URLSearchParams, key: string) {
    const raw = p.get(key);
    if (!raw) return [];
    return raw
        .split("|")
        .map((x) => decodeURIComponent(x))
        .map((x) => x.trim())
        .filter(Boolean);
}

function setArray(p: URLSearchParams, key: string, values: string[]) {
    const v = (values ?? []).map((x) => x.trim()).filter(Boolean);
    if (!v.length) p.delete(key);
    else p.set(key, v.map((x) => encodeURIComponent(x)).join("|"));
}

function isSortField(x: string): x is SortField {
    return x === "name" || x === "yearStart" || x === "yearEnd";
}

export function parseSortRules(p: URLSearchParams, key: string, fallback: SortRule[]): SortRule[] {
    const raw = p.get(key);
    if (!raw) return fallback;

    // формат: "yearStart:asc,name:desc"
    const parts = raw.split(",").map((x) => x.trim()).filter(Boolean);

    const rules: SortRule[] = [];
    for (let i = 0; i < parts.length; i++) {
        const [fieldRaw, dirRaw] = parts[i].split(":");
        const field = (fieldRaw ?? "").trim();
        const dir = (dirRaw ?? "").trim();

        if (!isSortField(field)) continue;
        if (dir !== "asc" && dir !== "desc") continue;

        rules.push({
            id: `sr-url-${i}-${field}-${dir}`,
            field,
            dir,
        });
    }

    return rules.length ? rules : fallback;
}

export function serializeSortRules(p: URLSearchParams, key: string, rules: SortRule[]) {
    if (!rules?.length) {
        p.delete(key);
        return;
    }
    p.set(
        key,
        rules.map((r) => `${r.field}:${r.dir}`).join(",")
    );
}

export function parseTabFromUrl(fallback: AppTab = "objects"): AppTab {
    const p = getParams();
    const t = p.get("tab");
    return t === "map" || t === "objects" ? t : fallback;
}

export function syncTabToUrl(tab: AppTab) {
    const p = getParams();
    p.set("tab", tab);
    replaceParams(p);
}

export function parseObjectsFiltersFromUrl(): Filters {
    const p = getParams();
    return {
        name: getString(p, "o_name", ""),
        address: getString(p, "o_address", ""),
        description: getString(p, "o_description", ""),
        thoughts: getString(p, "o_thoughts", ""),

        architects: getArray(p, "o_architects"),
        styles: getArray(p, "o_styles"),
        tags: getArray(p, "o_tags"),

        countries: getArray(p, "o_countries"),
        cities: getArray(p, "o_cities"),

        yearStartMin: getString(p, "o_ysMin", ""),
        yearStartMax: getString(p, "o_ysMax", ""),
        yearEndMin: getString(p, "o_yeMin", ""),
        yearEndMax: getString(p, "o_yeMax", ""),
        completed: (getString(p, "o_completed", "all") as "all" | "completed" | "uncompleted") || "all", // Добавлено
    };
}

export function syncObjectsFiltersToUrl(filters: Filters) {
    const p = getParams();

    setString(p, "o_name", filters.name);
    setString(p, "o_address", filters.address);
    setString(p, "o_description", filters.description);
    setString(p, "o_thoughts", filters.thoughts);

    setArray(p, "o_architects", filters.architects);
    setArray(p, "o_styles", filters.styles);
    setArray(p, "o_tags", filters.tags);

    setArray(p, "o_countries", filters.countries);
    setArray(p, "o_cities", filters.cities);

    setString(p, "o_ysMin", filters.yearStartMin);
    setString(p, "o_ysMax", filters.yearStartMax);
    setString(p, "o_yeMin", filters.yearEndMin);
    setString(p, "o_yeMax", filters.yearEndMax);

    // Добавлено: синхронизация фильтра статуса
    if (filters.completed && filters.completed !== "all") {
        p.set("o_completed", filters.completed);
    } else {
        p.delete("o_completed");
    }

    replaceParams(p);
}

export function parseObjectsSortRulesFromUrl(fallback: SortRule[]): SortRule[] {
    const p = getParams();
    return parseSortRules(p, "o_sort", fallback);
}

export function syncObjectsSortRulesToUrl(rules: SortRule[]) {
    const p = getParams();
    serializeSortRules(p, "o_sort", rules);
    replaceParams(p);
}

export function parseMapFiltersFromUrl(): MapFilters {
    const p = getParams();
    return {
        architects: getArray(p, "m_architects"),
        styles: getArray(p, "m_styles"),
        tags: getArray(p, "m_tags"),
        countries: getArray(p, "m_countries"),
        cities: getArray(p, "m_cities"),
        radiusKm: getString(p, "m_radiusKm", ""),
    };
}

export function syncMapFiltersToUrl(filters: MapFilters) {
    const p = getParams();

    setArray(p, "m_architects", filters.architects);
    setArray(p, "m_styles", filters.styles);
    setArray(p, "m_tags", filters.tags);

    setArray(p, "m_countries", filters.countries);
    setArray(p, "m_cities", filters.cities);

    setString(p, "m_radiusKm", filters.radiusKm);

    replaceParams(p);
}