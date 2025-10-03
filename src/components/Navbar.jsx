import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav
      style={{
        background: "#333",
        color: "white",
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "1.25rem",
              fontWeight: "bold",
            }}
          >
            Real Estate Contact Processor
          </Link>
        </div>
        <div>
          <Link
            to="/"
            style={{
              color: "white",
              textDecoration: "none",
              marginRight: "1rem",
            }}
          >
            Home
          </Link>
          <Link
            to="/import-mapper"
            style={{
              color: "white",
              textDecoration: "none",
              marginRight: "1rem",
            }}
          >
            Import Mapper
          </Link>
          <Link
            to="/csv-formatter"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            CSV Formatter
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
