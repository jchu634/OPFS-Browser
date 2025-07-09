import React from "react";
import { createRoot } from "react-dom/client";
import "@assets/styles/tailwind.css";

const DevtoolsPage = () => (
    <div className="bg-black">
        <h1 className="text-amber-800">Dev Tools Panel</h1>
        <p>Welcome to your custom DevTools panel!</p>
        <p>THIS IS A TEST</p>
    </div>
);

const root = createRoot(document.getElementById("__root")!);
root.render(<DevtoolsPage />);
