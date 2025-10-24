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
    Upload,
    BugIcon,
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
    const [opfsContents, setOpfsContents] = useState<EntryInfo[]>([]);
    const [debugEnabled, setDebugEnabled] = useState<boolean>(false);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [pollingInterval, setPollingInterval] = useState<number>(10);

    // --- OPFS Listing ---
    const loadDirectoryContents = async (path: string = "") => {
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
        } catch (evalError: any) {
            console.error(
                `Error initiating eval for directory loading: ${evalError.message}`
            );
        }
    };

    const refreshOpfsContents = async () => {
        await loadDirectoryContents("");
    };

    // --- Download File ---
    const handleDownload = async (filePath: string) => {
        if (!filePath.trim()) {
            console.log("No file path provided for download.");
            return;
        }
        console.log(`Attempting to download '${filePath}'...`);

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
        } catch (evalError: any) {
            console.error(`Error initiating download: ${evalError.message}`);
        }
    };

    // --- Upload File ---
    const handleUpload = async (file: File, uploadPath: string) => {
        if (!file) {
            console.error("No file provided for upload.");
            return;
        }
        if (!uploadPath.trim()) {
            console.error("No upload path provided.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>) => {
            function byteArrayToBase64(xs: Uint8Array): string {
                if ('toBase64' in xs) {
                    return (xs as any).toBase64();
                }
                return btoa(Array.from(xs).map(x => String.fromCharCode(x)).join(''));
            }

            const fileContentArrayBuffer = e.target?.result as ArrayBuffer;
            const base64Content = byteArrayToBase64(new Uint8Array(fileContentArrayBuffer));
            console.log(`Uploading '${file.name}' to '${uploadPath}'...`);

            const uploadFileToPage = async (
                path: string,
                contentBase64: string
            ) => {
                function base64ToByteArray(s: string): Uint8Array<ArrayBuffer> {
                    if ('fromBase64' in Uint8Array) {
                        return (Uint8Array as any).fromBase64(s);
                    }
                    return new Uint8Array(atob(s).split('').map(x => x.charCodeAt(0)));
                }

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
                    const byteArray = base64ToByteArray(contentBase64);
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
                if (!isException && evalResult.status !== "error") {
                    // Refresh only the parent directory to show the new file
                    const pathParts = uploadPath.split("/");
                    const parentPath = pathParts.slice(0, -1).join("/");
                    setTimeout(() => {
                        loadDirectoryContents(parentPath);
                    }, 500);
                }
            } catch (evalError: any) {
                console.error(`Error initiating upload: ${evalError.message}`);
            }
        };

        reader.onerror = () => {
            console.error(`Error reading file for upload: ${reader.error}`);
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Upload to Root ---
    const handleUploadToRoot = () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const uploadPath = file.name; // Root path is just the filename
                if (debugEnabled) {
                    console.log(
                        `File selected: ${file.name}. Starting upload to root...`
                    );
                }

                setTimeout(() => {
                    handleUpload(file, uploadPath);
                }, 100);
            }
        };
        fileInput.click();
    };

    // --- Delete Entry ---
    const handleDelete = async (
        deletePath: string,
        deleteRecursive: boolean
    ) => {
        if (!deletePath.trim()) {
            console.error("No entry path provided for deletion.");
            return;
        }
        if (debugEnabled) {
            console.log(
                `Attempting to delete '${deletePath}' (recursive: ${deleteRecursive})...`
            );
        }

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
                console.error(
                    `Delete failed: ${
                        isException
                            ? "Exception in page. See page console."
                            : evalResult.message
                    }`
                );
            } else {
                if (debugEnabled) {
                    console.log({
                        message: evalResult.message,
                        type: "success",
                    });
                }

                // Remove the deleted path from expandedPaths
                setExpandedPaths((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(deletePath);
                    return newSet;
                });

                // Refresh only the parent directory to show the changes
                const pathParts = deletePath.split("/");
                const parentPath = pathParts.slice(0, -1).join("/");
                setTimeout(() => {
                    loadDirectoryContents(parentPath);
                }, 500);
            }
        } catch (evalError: any) {
            console.error(`Error initiating delete: ${evalError.message}`);
        }
    };

    // --- Directory content insertion helper ---
    const insertDirectoryContents = (path: string, contents: EntryInfo[]) => {
        const updateEntry = (entries: EntryInfo[]): EntryInfo[] => {
            return entries.map((entry) => {
                if (entry.path === path && entry.kind === "directory") {
                    // When inserting contents, also set expanded based on expandedPaths
                    const isExpanded = expandedPaths.has(entry.path);
                    return {
                        ...entry,
                        children: contents,
                        loaded: true,
                        expanded: isExpanded,
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
                // For root, apply expanded state from expandedPaths
                return contents.map((entry) =>
                    entry.kind === "directory"
                        ? { ...entry, expanded: expandedPaths.has(entry.path) }
                        : entry
                );
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
                if (debugEnabled) {
                    console.log(
                        "Received OPFS_CONTENTS_RESULT_DOM_BRIDGE:",
                        result
                    );
                }

                if (result.status === "success") {
                    if (result.path === "") {
                        // Root directory load
                        if (debugEnabled) {
                            console.log(
                                "Loading root directory contents:",
                                result.contents
                            );
                        }

                        // Apply expanded state to root entries
                        setOpfsContents(
                            result.contents && result.contents.length > 0
                                ? result.contents.map((entry: EntryInfo) =>
                                      entry.kind === "directory" &&
                                      expandedPaths.has(entry.path)
                                          ? { ...entry, expanded: true }
                                          : entry
                                  )
                                : []
                        );
                    } else {
                        // Subdirectory load
                        if (debugEnabled) {
                            console.log(
                                "Loading subdirectory contents for path:",
                                result.path,
                                "contents:",
                                result.contents
                            );
                        }

                        insertDirectoryContents(result.path, result.contents);
                    }
                    if (debugEnabled) {
                        console.log("OPFS list refreshed.");
                    }
                } else {
                    console.error(`Error refreshing list: ${result.message}`);
                }
            }
        };
        runtime.onMessage.addListener(listener);
        return () => {
            runtime.onMessage.removeListener(listener);
        };
    }, [expandedPaths, debugEnabled]); // Add expandedPaths to dependencies

    // Initial refresh on mount
    useEffect(() => {
        refreshOpfsContents();
    }, []);

    // Effect to reload expanded directories when opfsContents changes
    useEffect(() => {
        // It checks if any of the currently expanded paths are not yet 'loaded'
        // and triggers a load for them. This helps re-expand folders after a full refresh.
        const directoriesToLoad = Array.from(expandedPaths).filter((path) => {
            // Find the corresponding entry in opfsContents
            // This is a simplified search; a more robust solution might traverse the tree.
            let found = false;
            const findAndCheck = (entries: EntryInfo[]): boolean => {
                for (const entry of entries) {
                    if (entry.path === path && entry.kind === "directory") {
                        found = true;
                        return !entry.loaded;
                    }
                    if (entry.children && findAndCheck(entry.children)) {
                        return true;
                    }
                }
                return false;
            };
            return findAndCheck(opfsContents);
        });

        directoriesToLoad.forEach((path) => {
            loadDirectoryContents(path);
        });
    }, [opfsContents, expandedPaths]); // Depend on opfsContents and expandedPaths

    // --- Polling page for changes ---
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (pollingInterval > 0) {
            // Set up interval only if pollingInterval is greater than 0
            intervalId = setInterval(() => {
                console.log(
                    `Polling OPFS contents (interval: ${pollingInterval}s)...`
                );
                refreshOpfsContents();
            }, pollingInterval * 1000); // Convert seconds to milliseconds
        }

        // Cleanup function
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [pollingInterval]);

    // --- Tree Component ---
    const toggleDirectory = async (path: string) => {
        setOpfsContents((prevContents) => {
            const updateEntry = (entries: EntryInfo[]): EntryInfo[] => {
                return entries.map((entry) => {
                    if (entry.path === path && entry.kind === "directory") {
                        const newExpandedState = !entry.expanded;
                        // Update expandedPaths set
                        setExpandedPaths((prev) => {
                            const newSet = new Set(prev);
                            if (newExpandedState) {
                                newSet.add(path);
                            } else {
                                newSet.delete(path);
                            }
                            return newSet;
                        });

                        if (newExpandedState && !entry.loaded) {
                            // If expanding and not loaded, trigger content load
                            loadDirectoryContents(path);
                        }
                        return { ...entry, expanded: newExpandedState };
                    }
                    if (entry.children) {
                        return {
                            ...entry,
                            children: updateEntry(entry.children),
                        };
                    }
                    return entry;
                });
            };
            return updateEntry(prevContents);
        });
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
                    if (debugEnabled) {
                        console.log(
                            `File selected: ${file.name}. Starting upload...`
                        );
                    }

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
                className="mb-4 pb-2 border-b border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center"
            >
                <h1 className="text-white text-xl font-bold mb-2 sm:mb-0">
                    Origin Private File System Browser
                </h1>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-end sm:items-center">
                    <div className="flex items-center space-x-2">
                        <label
                            htmlFor="pollingInterval"
                            className="text-gray-300 text-sm"
                        >
                            Polling Interval (Seconds):
                        </label>
                        <input
                            id="pollingInterval"
                            type="number"
                            min="0"
                            value={pollingInterval}
                            onChange={(e) =>
                                setPollingInterval(parseInt(e.target.value))
                            }
                            className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Set the auto-refresh interval in seconds (0 to disable)"
                        />
                    </div>

                    <button
                        className="bg-amber-700 p-2 rounded flex space-x-2 cursor-pointer hover:bg-amber-600 transition-colors"
                        onClick={refreshOpfsContents}
                        title="Manually refresh the file system view"
                    >
                        <p className="h-max align-middle font-bold">REFRESH</p>
                        <RefreshCcw />
                    </button>
                    {debugEnabled ? (
                        <button
                            className="bg-green-400 p-2 rounded flex space-x-2 text-black hover:bg-green-300 transition-colors"
                            onClick={() => setDebugEnabled(false)}
                            title="Disable debug mode"
                        >
                            <BugIcon />
                        </button>
                    ) : (
                        <button
                            className="bg-red-700 p-2 rounded flex space-x-2 hover:bg-red-600 transition-colors"
                            onClick={() => setDebugEnabled(true)}
                            title="Enable debug mode"
                        >
                            <BugIcon />
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4 pb-2 border-b border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center">
                <h2 className="mt-6 text-lg">Contents:</h2>
                <button
                    className="bg-green-700 p-2 rounded flex space-x-2 hover:bg-green-600 transition-colors"
                    onClick={handleUploadToRoot}
                    title="Upload file to root directory"
                >
                    <p className="h-max align-middle font-bold">
                        UPLOAD TO ROOT
                    </p>
                    <Upload />
                </button>
            </div>

            <div
                id="result"
                className="border border-gray-700 p-2 bg-gray-800 mt-2 font-mono max-h-140 overflow-y-auto"
            >
                {opfsContents.length === 0
                    ? 'There are no OPFS files detected. Click "REFRESH" to try detect files.'
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
