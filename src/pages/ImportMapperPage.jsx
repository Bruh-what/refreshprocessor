import React from "react";
import ImportMapper from "../components/ImportMapper";
import Navbar from "../components/Navbar";

const ImportMapperPage = () => {
  return (
    <>
      <Navbar />
      <div style={{ padding: "1rem" }}>
        <ImportMapper />
      </div>
    </>
  );
};

export default ImportMapperPage;
