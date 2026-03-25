import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import App from "./App.jsx";
import ImportMapperPage from "./pages/ImportMapperPage.jsx";
import CsvFormatter from "./pages/CsvFormatter.jsx";
import SimpleDuplicateTagger from "./components/SimpleDuplicateTagger.jsx";
import ContactCategorizer from "./components/ContactCategorizer.jsx";
import GPTClassifier from "./components/GPTClassifier.jsx";
import PhoneConsolidator from "./components/PhoneConsolidator.jsx";
import LeadTagger from "./components/LeadTagger.jsx";
import MergedBro from "./components/MergedBro.jsx";
import Demo from "./pages/Demo.jsx";
import Onboarded from "./pages/Onboarded.jsx";
import FormatTests from "./pages/FormatTests.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Standalone pages without navbar */}
        <Route path="/onboarded" element={<Onboarded />} />

        {/* Pages with navbar and layout */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/import-mapper" element={<ImportMapperPage />} />
                <Route path="/csv-formatter" element={<CsvFormatter />} />
                <Route
                  path="/simple-duplicate-tagger"
                  element={<SimpleDuplicateTagger />}
                />
                <Route
                  path="/contact-categorizer"
                  element={<ContactCategorizer />}
                />
                <Route path="/gpt-classifier" element={<GPTClassifier />} />
                <Route
                  path="/phone-consolidator"
                  element={<PhoneConsolidator />}
                />
                <Route path="/lead-tagger" element={<LeadTagger />} />
                <Route path="/merged-bro" element={<MergedBro />} />
                <Route path="/format-tests" element={<FormatTests />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
