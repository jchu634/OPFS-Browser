import React from "react";
import { createRoot } from "react-dom/client";
import Browser from "webextension-polyfill";
import "@assets/styles/tailwind.css";

const DevtoolsPage = () => (
    <div className="bg-black">
        <h1 className="text-amber-800">Dev Tools Panel</h1>
        <p>Welcome to your custom DevTools panel!</p>
    </div>
);

const root = createRoot(document.getElementById("__root")!);
root.render(<DevtoolsPage />);
Browser.devtools.panels
    .create("Dev Tools", "icon-32.png", "src/pages/devtools/index.html")
    .catch(console.error);
