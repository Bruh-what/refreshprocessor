import React from "react";

// Function to download stats as CSV
const downloadStatsCSV = (stats) => {
  // Prepare data
  const rows = [
    ["Metric", "Value"],
    ["Total Records", stats.totalRecords],
    ["Duplicates Tagged", stats.duplicatesTagged || 0],
    ["Duplicates Removed", stats.duplicatesRemoved],
    ["Merged Records", stats.mergedRecords],
    ["Updated Records", stats.changedRecords],
    ["Real Estate Agents", stats.agents],
    ["Vendors", stats.vendors],
    ["Past Clients", stats.pastClients],
    ["Moved to Leads", stats.contactsMovedToLeads || 0],
    ["Phones Added", stats.phonesAddedCount || 0],
    ["Emails Added", stats.emailsAddedCount || 0],
  ];

  // Convert to CSV format
  const csvContent = rows.map((row) => row.join(",")).join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // Create filename with date and time
  const date = new Date();
  const filename = `contact_processing_stats_${
    date.toISOString().split("T")[0]
  }.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ResultsDisplay = ({
  stats,
  onExport,
  onExportChanged,
  onExportAll,
  onExportWithAnniversary,
  onExportOnlyAnniversary,
}) => {
  if (!stats || stats.totalRecords === 0) return null;

  return (
    <div className="results-section">
      <h2>Processing Results</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalRecords}</h3>
          <p>Total Records</p>
        </div>

        <div className="stat-card">
          <h3>{stats.duplicatesTagged || 0}</h3>
          <p>Duplicates Tagged</p>
        </div>

        <div className="stat-card">
          <h3>{stats.duplicatesRemoved}</h3>
          <p>Duplicates Removed</p>
        </div>

        <div className="stat-card">
          <h3>{stats.mergedRecords}</h3>
          <p>Merged Records</p>
        </div>

        <div className="stat-card">
          <h3>{stats.changedRecords}</h3>
          <p>Updated Records</p>
        </div>

        <div className="stat-card">
          <h3>{stats.agents}</h3>
          <p>Real Estate Agents</p>
        </div>

        <div className="stat-card">
          <h3>{stats.vendors}</h3>
          <p>Vendors</p>
        </div>

        <div className="stat-card">
          <h3>{stats.pastClients}</h3>
          <p>Past Clients</p>
        </div>

        <div className="stat-card">
          <h3>{stats.contactsMovedToLeads || 0}</h3>
          <p>Moved to Leads</p>
        </div>

        <div className="stat-card">
          <h3>{stats.phonesAddedCount || 0}</h3>
          <p>Phones Added</p>
        </div>

        <div className="stat-card">
          <h3>{stats.emailsAddedCount || 0}</h3>
          <p>Emails Added</p>
        </div>
      </div>

      <div className="export-section">
        <h3>Export Options</h3>
        <p>
          Choose what data to export. For CRM import, it's recommended to export
          only changed records to avoid unnecessary updates.
        </p>

        <div className="export-buttons">
          <button
            onClick={onExportChanged}
            disabled={stats.changedRecords === 0}
            style={{
              backgroundColor: stats.changedRecords > 0 ? "#51cf66" : undefined,
              color: stats.changedRecords > 0 ? "white" : undefined,
            }}
          >
            Export Changed Records Only ({stats.changedRecords})
          </button>

          <button
            onClick={onExportWithAnniversary}
            style={{
              backgroundColor: "#4dabf7",
              color: "white",
            }}
          >
            Export Changed + Anniversary Records
          </button>

          <button
            onClick={onExportOnlyAnniversary}
            style={{
              backgroundColor: "#ff922b",
              color: "white",
            }}
          >
            Export Only Anniversary Records
          </button>

          <button onClick={onExportAll}>
            Export All Records ({stats.totalRecords})
          </button>

          <button
            onClick={() => downloadStatsCSV(stats)}
            style={{
              backgroundColor: "#845ef7",
              color: "white",
            }}
          >
            Download Stats CSV
          </button>
        </div>

        <div style={{ marginTop: "1rem", fontSize: "0.9em", opacity: 0.8 }}>
          <p>
            <strong>Changed Records Only:</strong> Only contacts that were
            modified during processing. Does not include Home Anniversary
            records.
          </p>
          <p>
            <strong>Changed + Anniversary Records:</strong> Modified contacts
            plus records with the "CRM Refresh: Home Anniversary" tag.
          </p>
          <p>
            <strong>Only Anniversary Records:</strong> Only records with the
            "CRM Refresh: Home Anniversary" tag.
          </p>
          <p>
            <strong>All Records:</strong> Complete processed dataset with all
            contacts and their classifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
