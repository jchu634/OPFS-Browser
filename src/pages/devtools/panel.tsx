import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    RefreshCcw,
    ChevronRight,
    ChevronDown,
    File,
    Folder,
    Trash2,
    ArrowDownToLine,
    ArrowUpToLine,
} from "lucide-react";
import "@assets/styles/tailwind.css";

type StatusType = "success" | "error" | "info";

type EntryInfo = {
    name: string;
    kind: "file" | "directory";
    size?: string;
    path: string;
    loaded?: boolean;
    expanded?: boolean;
    children?: EntryInfo[];
};

export default function DevtoolsPage() {
    // State for OPFS contents and UI
    const [status, setStatus] = useState<{ message: string; type: StatusType }>(
        {
            message: "Ready.",
            type: "info",
        }
    );
    const [opfsContents, setOpfsContents] = useState<EntryInfo[]>([]);

    // --- OPFS Listing ---
    const loadDirectoryContents = async (path: string = "") => {
        setStatus({
            message: `Loading contents of ${path || "root"}...`,
            type: "info",
        });

        const getDirectoryContentsAndBridgeToDOM = async (
            directoryPath: string
        ) => {
            try {
                const parts = directoryPath
                    .split("/")
                    .filter((p) => p.length > 0);
                let currentHandle: any = await (
                    navigator.storage as any
                ).getDirectory();

                // Navigate to the target directory
                for (const part of parts) {
                    currentHandle = await currentHandle.getDirectoryHandle(
                        part
                    );
                }

                const entries: EntryInfo[] = [];
                const handleEntries = await currentHandle.values();

                for await (const entry of handleEntries as any) {
                    const entryPath = directoryPath
                        ? `${directoryPath}/${entry.name}`
                        : entry.name;

                    if (entry.kind === "directory") {
                        entries.push({
                            name: entry.name,
                            kind: "directory",
                            path: entryPath,
                            loaded: false,
                            expanded: false,
                            children: [],
                        });
                    } else {
                        let size: string | undefined = undefined;
                        try {
                            const file = await entry.getFile();
                            size = (file.size / 1024).toFixed(2) + " KB";
                        } catch {
                            size = undefined;
                        }
                        entries.push({
                            name: entry.name,
                            kind: "file",
                            path: entryPath,
                            size,
                        });
                    }
                }

                let dataElement = document.getElementById("opfs-debug-data");
                if (!dataElement) {
                    dataElement = document.createElement(
                        "script"
                    ) as HTMLScriptElement;
                    dataElement.id = "opfs-debug-data";
                    (dataElement as HTMLScriptElement).type =
                        "application/json";
                    document.head.appendChild(dataElement);
                }
                dataElement.textContent = JSON.stringify({
                    status: "success",
                    message: "Successfully retrieved directory contents.",
                    contents: entries,
                    path: directoryPath,
                });
                window.dispatchEvent(new CustomEvent("OPFSDebugDataReady"));
                return {
                    status: "success",
                    message: "Directory contents loaded",
                    contents: entries,
                };
            } catch (error: any) {
                let dataElement = document.getElementById("opfs-debug-data");
                if (!dataElement) {
                    dataElement = document.createElement(
                        "script"
                    ) as HTMLScriptElement;
                    dataElement.id = "opfs-debug-data";
                    (dataElement as HTMLScriptElement).type =
                        "application/json";
                    document.head.appendChild(dataElement);
                }
                dataElement.textContent = JSON.stringify({
                    status: "error",
                    message: `Failed to load directory contents: ${error.message}`,
                    contents: [],
                    path: directoryPath,
                });
                window.dispatchEvent(new CustomEvent("OPFSDebugDataReady"));
                return {
                    status: "error",
                    message: `Failed to load directory contents: ${error.message}`,
                    contents: [],
                };
            }
        };

        try {
            // @ts-ignore browser global
            const [evalResult, isException]: [any, boolean] = await (
                browser as any
            ).devtools.inspectedWindow.eval(
                `(${getDirectoryContentsAndBridgeToDOM.toString()})('${path}')`
            );
            if (isException) {
                setStatus({
                    message:
                        "Error: Eval failed to load directory contents. Check page console.",
                    type: "error",
                });
            } else {
                setStatus({
                    message:
                        "Eval initiated for directory loading. Awaiting content script response...",
                    type: "info",
                });
            }
        } catch (evalError: any) {
            setStatus({
                message: `Error initiating eval for directory loading: ${evalError.message}`,
                type: "error",
            });
        }
    };

    const refreshOpfsContents = async () => {
        await loadDirectoryContents("");
    };

    // --- Download File ---
    const handleDownload = async (filePath: string) => {
        if (!filePath.trim()) {
            setStatus({
                message: "No file path provided for download.",
                type: "error",
            });
            return;
        }
        setStatus({
            message: `Attempting to download '${filePath}'...`,
            type: "info",
        });

        const downloadFileFromPage = async (path: string) => {
            try {
                const parts = path.split("/");
                let currentHandle: any = await (
                    navigator.storage as any
                ).getDirectory();
                let fileHandle: any;

                for (let i = 0; i < parts.length; i++) {
                    if (i === parts.length - 1) {
                        fileHandle = await currentHandle.getFileHandle(
                            parts[i]
                        );
                    } else {
                        currentHandle = await currentHandle.getDirectoryHandle(
                            parts[i]
                        );
                    }
                }

                if (!fileHandle) {
                    throw new Error("File handle not found after traversal.");
                }

                const file = await fileHandle.getFile();
                const arrayBuffer = await file.arrayBuffer();

                // Create a download link to download
                const blob = new Blob([arrayBuffer]);
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                return {
                    status: "success",
                    message: `File '${file.name}' downloaded successfully.`,
                };
            } catch (error: any) {
                return {
                    status: "error",
                    message: `Failed to download file: ${error.message}`,
                };
            }
        };

        try {
            // @ts-ignore browser global
            const [evalResult, isException]: [any, boolean] = await (
                browser as any
            ).devtools.inspectedWindow.eval(
                `(${downloadFileFromPage.toString()})('${filePath}')`
            );
            if (isException || evalResult.status === "error") {
                setStatus({
                    message: `Download failed: ${
                        isException
                            ? "Exception in page. See page console."
                            : evalResult.message
                    }`,
                    type: "error",
                });
            } else {
                setStatus({ message: evalResult.message, type: "success" });
            }
        } catch (evalError: any) {
            setStatus({
                message: `Error initiating download: ${evalError.message}`,
                type: "error",
            });
        }
    };

    // --- Upload File ---
    const handleUpload = async (file: File, uploadPath: string) => {
        if (!file) {
            setStatus({
                message: "No file provided for upload.",
                type: "error",
            });
            return;
        }
        if (!uploadPath.trim()) {
            setStatus({
                message: "No upload path provided.",
                type: "error",
            });
            return;
        }
        setStatus({
            message: `Reading '${file.name}' for upload to '${uploadPath}'...`,
            type: "info",
        });

        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>) => {
            const fileContentArrayBuffer = e.target?.result as ArrayBuffer;
            const base64Content = btoa(
                String.fromCharCode(...new Uint8Array(fileContentArrayBuffer))
            );
            setStatus({
                message: `Uploading '${file.name}' to '${uploadPath}'...`,
                type: "info",
            });

            const uploadFileToPage = async (
                path: string,
                contentBase64: string
            ) => {
                try {
                    const parts = path.split("/");
                    let currentHandle: any = await (
                        navigator.storage as any
                    ).getDirectory();
                    let fileName = parts[parts.length - 1];
                    let directoryPath = parts.slice(0, -1);
                    for (const part of directoryPath) {
                        currentHandle = await currentHandle.getDirectoryHandle(
                            part,
                            { create: true }
                        );
                    }
                    const fileHandle = await currentHandle.getFileHandle(
                        fileName,
                        { create: true }
                    );
                    const writable = await fileHandle.createWritable();
                    const byteCharacters = atob(contentBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray]);
                    await writable.write(blob);
                    await writable.close();
                    return {
                        status: "success",
                        message: `File uploaded: ${path}`,
                    };
                } catch (error: any) {
                    return {
                        status: "error",
                        message: `Failed to upload: ${error.message}`,
                    };
                }
            };

            try {
                // @ts-ignore browser global
                const [evalResult, isException]: [any, boolean] = await (
                    browser as any
                ).devtools.inspectedWindow.eval(
                    `(${uploadFileToPage.toString()})('${uploadPath}', '${base64Content}')`
                );
                if (isException || evalResult.status === "error") {
                    setStatus({
                        message: `Upload failed: ${
                            isException
                                ? "Exception in page. See page console."
                                : evalResult.message
                        }`,
                        type: "error",
                    });
                } else {
                    setStatus({ message: evalResult.message, type: "success" });
                    // Refresh only the parent directory to show the new file
                    const pathParts = uploadPath.split("/");
                    const parentPath = pathParts.slice(0, -1).join("/");
                    setTimeout(() => {
                        loadDirectoryContents(parentPath);
                    }, 500);
                }
            } catch (evalError: any) {
                setStatus({
                    message: `Error initiating upload: ${evalError.message}`,
                    type: "error",
                });
            }
        };

        reader.onerror = () => {
            setStatus({
                message: `Error reading file for upload: ${reader.error}`,
                type: "error",
            });
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Delete Entry ---
    const handleDelete = async (
        deletePath: string,
        deleteRecursive: boolean
    ) => {
        if (!deletePath.trim()) {
            setStatus({
                message: "No entry path provided for deletion.",
                type: "error",
            });
            return;
        }
        setStatus({
            message: `Attempting to delete '${deletePath}' (recursive: ${deleteRecursive})...`,
            type: "info",
        });

        const deleteEntryFromPage = async (
            path: string,
            recursiveOption: boolean
        ) => {
            try {
                const parts = path.split("/");
                let currentHandle: any = await (
                    navigator.storage as any
                ).getDirectory();
                let parentHandle: any;
                let entryName: string;
                if (parts.length === 1) {
                    parentHandle = currentHandle;
                    entryName = parts[0];
                } else {
                    for (let i = 0; i < parts.length - 1; i++) {
                        currentHandle = await currentHandle.getDirectoryHandle(
                            parts[i]
                        );
                    }
                    parentHandle = currentHandle;
                    entryName = parts[parts.length - 1];
                }
                await parentHandle.removeEntry(entryName, {
                    recursive: recursiveOption,
                });
                return {
                    status: "success",
                    message: `Successfully deleted: ${path}`,
                };
            } catch (error: any) {
                return {
                    status: "error",
                    message: `Failed to delete: ${error.message}`,
                };
            }
        };

        try {
            const [evalResult, isException]: [any, boolean] = await (
                browser as any
            ).devtools.inspectedWindow.eval(
                `(${deleteEntryFromPage.toString()})('${deletePath}', ${deleteRecursive})`
            );
            if (isException || evalResult.status === "error") {
                setStatus({
                    message: `Delete failed: ${
                        isException
                            ? "Exception in page. See page console."
                            : evalResult.message
                    }`,
                    type: "error",
                });
            } else {
                setStatus({ message: evalResult.message, type: "success" });
                // Refresh only the parent directory to show the changes
                const pathParts = deletePath.split("/");
                const parentPath = pathParts.slice(0, -1).join("/");
                setTimeout(() => {
                    loadDirectoryContents(parentPath);
                }, 500);
            }
        } catch (evalError: any) {
            setStatus({
                message: `Error initiating delete: ${evalError.message}`,
                type: "error",
            });
        }
    };

    // --- Directory content insertion helper ---
    const insertDirectoryContents = (path: string, contents: EntryInfo[]) => {
        const updateEntry = (entries: EntryInfo[]): EntryInfo[] => {
            return entries.map((entry) => {
                if (entry.path === path && entry.kind === "directory") {
                    return {
                        ...entry,
                        children: contents,
                        loaded: true,
                        expanded: true,
                    };
                }
                if (entry.children) {
                    return { ...entry, children: updateEntry(entry.children) };
                }
                return entry;
            });
        };

        setOpfsContents((prevContents) => {
            // If path is empty (root), replace the entire contents
            if (path === "") {
                return contents;
            }
            // Otherwise, update the specific directory
            return updateEntry(prevContents);
        });
    };

    // --- Listen for browser.runtime messages ---
    useEffect(() => {
        const runtime = (browser as any)?.runtime;
        if (!runtime) return;
        const listener = (message: any) => {
            const tabId = (browser as any).devtools.inspectedWindow.tabId;
            if (
                message.type === "OPFS_CONTENTS_RESULT_DOM_BRIDGE" &&
                message.tabId === tabId
            ) {
                const result = message.result;
                console.log(
                    "Received OPFS_CONTENTS_RESULT_DOM_BRIDGE:",
                    result
                );
                if (result.status === "success") {
                    if (result.path === "") {
                        // Root directory load
                        console.log(
                            "Loading root directory contents:",
                            result.contents
                        );
                        setOpfsContents(
                            result.contents && result.contents.length > 0
                                ? result.contents
                                : []
                        );
                    } else {
                        // Subdirectory load
                        console.log(
                            "Loading subdirectory contents for path:",
                            result.path,
                            "contents:",
                            result.contents
                        );
                        insertDirectoryContents(result.path, result.contents);
                    }
                    setStatus({
                        message: "OPFS list refreshed.",
                        type: "success",
                    });
                    console.log(result.contents);
                } else {
                    setStatus({
                        message: `Error refreshing list: ${result.message}`,
                        type: "error",
                    });
                }
            }
        };
        runtime.onMessage.addListener(listener);
        return () => {
            runtime.onMessage.removeListener(listener);
        };
    }, []);

    // Initial refresh on mount
    useEffect(() => {
        refreshOpfsContents();
    }, []);

    // --- Tree Component ---
    const toggleDirectory = async (path: string) => {
        const updateEntry = (entries: EntryInfo[]): EntryInfo[] => {
            return entries.map((entry) => {
                if (entry.path === path && entry.kind === "directory") {
                    if (entry.expanded) {
                        // Collapse directory
                        return { ...entry, expanded: false };
                    } else {
                        // Expand directory - load contents if not loaded
                        if (!entry.loaded) {
                            loadDirectoryContents(path);
                        }
                        return { ...entry, expanded: true };
                    }
                }
                if (entry.children) {
                    return { ...entry, children: updateEntry(entry.children) };
                }
                return entry;
            });
        };

        setOpfsContents((prevContents) => updateEntry(prevContents));
    };

    const TreeItem = ({
        entry,
        depth = 0,
    }: {
        entry: EntryInfo;
        depth?: number;
    }) => {
        const isDirectory = entry.kind === "directory";
        const hasChildren = entry.children && entry.children.length > 0;

        const handleDownloadClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            handleDownload(entry.path);
        };

        const handleUploadClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            // Create a hidden file input and trigger it
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.onchange = (event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (file) {
                    let uploadPath: string;
                    // Set upload path based on whether it's a directory or file
                    if (isDirectory) {
                        uploadPath = `${entry.path}/${file.name}`;
                    } else {
                        // For files, replace the filename with the selected file
                        const pathParts = entry.path.split("/");
                        pathParts[pathParts.length - 1] = file.name;
                        uploadPath = pathParts.join("/");
                    }

                    setStatus({
                        message: `File selected: ${file.name}. Starting upload...`,
                        type: "info",
                    });

                    // Auto-trigger upload
                    setTimeout(() => {
                        handleUpload(file, uploadPath);
                    }, 100);
                }
            };
            fileInput.click();
        };

        const handleDeleteClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            handleDelete(entry.path, isDirectory);
        };

        return (
            <div style={{ marginLeft: `${depth * 20}px` }}>
                <div
                    className={`flex items-center py-1 px-2 hover:bg-gray-800 cursor-pointer ${
                        isDirectory ? "text-blue-300" : "text-gray-200"
                    }`}
                    onClick={() => isDirectory && toggleDirectory(entry.path)}
                >
                    {isDirectory && (
                        <span className="mr-2">
                            {entry.expanded ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                        </span>
                    )}
                    <span className="mr-2">
                        {isDirectory ? (
                            <Folder size={16} />
                        ) : (
                            <File size={16} />
                        )}
                    </span>
                    <span className="flex-1">{entry.name}</span>
                    {entry.size && (
                        <div>
                            <span className="text-gray-400 text-sm">
                                {entry.size}
                            </span>
                        </div>
                    )}
                    <div className="pl-4 flex space-x-2">
                        {entry.kind === "directory" && (
                            <button
                                className="bg-amber-800 rounded-lg flex p-2 items-center text-white hover:bg-amber-700 transition-colors"
                                onClick={handleUploadClick}
                                title="Upload file to this directory"
                            >
                                <ArrowUpToLine size={16} />
                            </button>
                        )}
                        {entry.kind === "file" && (
                            <button
                                className="bg-blue-600 rounded-lg flex p-2 items-center text-white hover:bg-blue-500 transition-colors"
                                onClick={handleDownloadClick}
                                title="Download this file"
                            >
                                <ArrowDownToLine size={16} />
                            </button>
                        )}

                        <button
                            className="bg-red-800 rounded-lg flex p-2 text-white hover:bg-red-700 transition-colors"
                            onClick={handleDeleteClick}
                            title={`Delete this ${entry.kind}`}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                {isDirectory && entry.expanded && hasChildren && (
                    <div>
                        {entry.children!.map((child, idx) => (
                            <TreeItem
                                key={`${child.path}-${idx}`}
                                entry={child}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // --- UI ---
    return (
        <div className="bg-neutral-900 text-white min-h-screen p-4">
            <div
                id="controls"
                className="mb-4 pb-2 border-b border-gray-700 flex justify-between"
            >
                <h1 className="text-white text-xl font-bold mb-2">
                    Origin Private File System Browser
                </h1>
                <div></div>
                {/* Status Screen, too distracting
                    <div
                    id="status"
                    className={` p-2 rounded ${
                        status.type === "success"
                            ? "bg-green-900 text-green-300"
                            : status.type === "error"
                            ? "bg-red-900 text-red-300"
                            : "bg-blue-900 text-blue-300"
                    }`}
                >
                    {status.message}
                </div> */}
                <button
                    className="bg-amber-700 p-2 rounded flex space-x-2"
                    onClick={refreshOpfsContents}
                >
                    <p className="h-max align-middle font-bold">RESET</p>
                    <RefreshCcw />
                </button>
            </div>

            <h2 className="mt-6 text-lg">Contents:</h2>
            <div
                id="result"
                className="border border-gray-700 p-2 bg-gray-800 mt-2 font-mono max-h-140 overflow-y-auto"
            >
                {opfsContents.length === 0
                    ? 'Click "RESET" to load contents.'
                    : opfsContents.map((entry, idx) => (
                          <TreeItem
                              key={`${entry.path}-${idx}`}
                              entry={entry}
                          />
                      ))}
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById("__root")!);
root.render(<DevtoolsPage />);
