/**
 * Cockpit APT - Root React component.
 *
 * This is a minimal implementation for Task 01 infrastructure validation.
 * Full UI implementation will be done in Task 04.
 */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { searchPackages } from "./lib/apt-wrapper";
import type { Package } from "./lib/types";
import "@patternfly/patternfly/patternfly.css";

function App() {
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (query.length < 2) {
      setError("Query must be at least 2 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchPackages(query);
      setPackages(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Cockpit APT</h1>
      <p style={{ color: "#666" }}>Package Manager - Infrastructure Test</p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search packages..."
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            width: "300px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || query.length < 2}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
            marginBottom: "20px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {packages.length > 0 && (
        <div>
          <p style={{ marginBottom: "10px" }}>
            <strong>Found {packages.length} packages</strong>
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ddd",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={headerStyle}>Package</th>
                <th style={headerStyle}>Version</th>
                <th style={headerStyle}>Section</th>
                <th style={headerStyle}>Status</th>
                <th style={headerStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.name} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={cellStyle}>
                    <strong>{pkg.name}</strong>
                  </td>
                  <td style={cellStyle}>{pkg.version}</td>
                  <td style={cellStyle}>{pkg.section}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "3px",
                        fontSize: "12px",
                        backgroundColor: pkg.installed ? "#d4edda" : "#f8f9fa",
                        color: pkg.installed ? "#155724" : "#6c757d",
                      }}
                    >
                      {pkg.installed ? "Installed" : "Available"}
                    </span>
                  </td>
                  <td style={cellStyle}>{pkg.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && packages.length === 0 && query && !error && (
        <p style={{ color: "#666", marginTop: "20px" }}>
          No packages found matching &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  fontWeight: "bold",
};

const cellStyle: React.CSSProperties = {
  padding: "10px",
  verticalAlign: "top",
};

// Initialize React app
const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
