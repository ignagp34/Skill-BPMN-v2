import { createRoot } from "react-dom/client";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "bpmn-js/dist/assets/bpmn-js.css";

import "./styles/design.css";
import "./styles/app.css";

import { App } from "./ui/AppShell.js";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("Missing #root element in index.html");
}
createRoot(container).render(<App />);
