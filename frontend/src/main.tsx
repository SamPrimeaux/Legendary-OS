import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <main>
      <h1>Legendary OS</h1>
      <p>One operating system for Legendary.</p>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) throw new Error("Missing #root mount element");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
