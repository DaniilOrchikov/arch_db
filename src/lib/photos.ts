import { IMAGES_DIRNAME } from "./db";
import { v4 as uuidv4 } from "uuid";

function getExt(filename: string) {
    const i = filename.lastIndexOf(".");
    if (i === -1) return "";
    return filename.slice(i).toLowerCase();
}

export async function saveImageFileToWorkspace(
    workspace: FileSystemDirectoryHandle,
    file: File
): Promise<string> {
    const imagesDir = await workspace.getDirectoryHandle(IMAGES_DIRNAME, { create: true });
    const ext = getExt(file.name) || ".jpg";
    const safeName = `${uuidv4()}${ext}`;
    const fh = await imagesDir.getFileHandle(safeName, { create: true });
    const writable = await fh.createWritable();
    await writable.write(file);
    await writable.close();
    return `${IMAGES_DIRNAME}/${safeName}`;
}

export async function readWorkspaceFile(
    workspace: FileSystemDirectoryHandle,
    relativePath: string
): Promise<File> {
    // relativePath: images/xxx.jpg
    const [dir, name] = relativePath.split("/");
    if (!dir || !name) {
        throw new Error("Bad relativePath");
    }
    const d = await workspace.getDirectoryHandle(dir);
    const fh = await d.getFileHandle(name);
    return await fh.getFile();
}

export async function deleteWorkspaceFile(
    workspace: FileSystemDirectoryHandle,
    relativePath: string
) {
    const [dir, name] = relativePath.split("/");
    if (!dir || !name) throw new Error("Bad relativePath");
    const d = await workspace.getDirectoryHandle(dir);
    await d.removeEntry(name);
}