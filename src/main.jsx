import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

localStorage.setItem("is_app", "true");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);