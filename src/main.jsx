import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import ImportMapperPage from "./pages/ImportMapperPage.jsx";
import CsvFormatter from "./pages/CsvFormatter.jsx";
import SimpleDuplicateTagger from "./components/SimpleDuplicateTagger.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/import-mapper" element={<ImportMapperPage />} />
        <Route path="/csv-formatter" element={<CsvFormatter />} />
        <Route
          path="/simple-duplicate-tagger"
          element={<SimpleDuplicateTagger />}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
