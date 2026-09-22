import BpmnModeler from "bpmn-js/lib/Modeler";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "bpmn-js/dist/assets/bpmn-js.css";

import { mountApp } from "./ui/app.js";

mountApp({
  deps: {
    createModeler: (container: HTMLElement) => new BpmnModeler({ container }),
  },
});
