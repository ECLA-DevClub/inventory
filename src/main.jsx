import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { InventoryProvider } from "./context/InventoryContext";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InventoryProvider>
          <App />
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
