import { get, set } from "idb-keyval";

const KEY = "archdb-workspace-handle-v1";

export async function loadWorkspaceHandle(): Promise<FileSystemDirectoryHandle | null> {
    const handle = (await get(KEY)) as FileSystemDirectoryHandle | undefined;
    return handle ?? null;
}

export async function saveWorkspaceHandle(handle: FileSystemDirectoryHandle) {
    await set(KEY, handle);
}

export async function ensureReadWritePermission(
    handle: FileSystemDirectoryHandle
): Promise<boolean> {
    const opts: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
    const q = await handle.queryPermission(opts);
    if (q === "granted") return true;
    const r = await handle.requestPermission(opts);
    return r === "granted";
}