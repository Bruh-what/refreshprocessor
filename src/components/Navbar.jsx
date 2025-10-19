import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav
      style={{
        background: "#333",
        color: "white",
        padding: "0.75rem 1rem",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            Processor
          </Link>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Link
            to="/"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Home
          </Link>
          <Link
            to="/import-mapper"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Import Mapper
          </Link>
          <Link
            to="/csv-formatter"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            CSV Formatter
          </Link>
          <Link
            to="/simple-duplicate-tagger"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Simple Duplicate Tagger
          </Link>
          <Link
            to="/contact-categorizer"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Contact Categorizer
          </Link>
          <Link
            to="/gpt-classifier"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            GPT Classifier
          </Link>
          <Link
            to="/phone-consolidator"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Phone Consolidator
          </Link>
          <Link
            to="/lead-tagger"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Lead Tagger
          </Link>
          <Link
            to="/merged-bro"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Merged Bro
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
