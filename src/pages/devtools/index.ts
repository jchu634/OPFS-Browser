import Browser from "webextension-polyfill";

const CHROMIUM_PANEL_DIR = "src/pages/devtools/panel.html";
const CHROMIUM_ICON_DIR = "icon-32.png";
const FIREFOX_PANEL_DIR = "panel.html";
const FIREFOX_ICON_DIR = "../../../icon-32.png";

let finalPanelContentPath: string;
let finalIconPath: string;

if (navigator.userAgent.includes("Firefox")) {
    finalPanelContentPath = FIREFOX_PANEL_DIR;
    finalIconPath = FIREFOX_ICON_DIR;
} else if (
    navigator.userAgent.includes("Chrome") ||
    navigator.userAgent.includes("Edge")
) {
    finalPanelContentPath = CHROMIUM_PANEL_DIR;
    finalIconPath = CHROMIUM_ICON_DIR;
} else {
    // Fallback for unknown browsers
    console.warn(
        "Unknown browser, defaulting to Chrome-style path for DevTools panel."
    );
    finalPanelContentPath = CHROMIUM_PANEL_DIR;
    finalIconPath = CHROMIUM_ICON_DIR;
}

console.log(
    `[DevTools Loader] Creating panel with path: ${finalPanelContentPath}`
);

Browser.devtools.panels
    .create("OPFS Browser", finalIconPath, finalPanelContentPath)
    .catch((error) => {
        console.error("[DevTools Loader] Error creating panel:", error);
    });
