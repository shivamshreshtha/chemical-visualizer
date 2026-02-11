import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ✅ Step 3 uses .env
const API_BASE = import.meta.env.VITE_API_BASE;


// safer number parsing
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function authHeaders(token) {
  const t = (token || "").trim();
  return {
    Authorization: `Token ${t}`,
    Accept: "application/json",
  };
}

export default function App() {
  // ✅ Step 2: token from localStorage on load
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  // ✅ login inputs
  const [username, setUsername] = useState("Shivam_Shreshtha");
  const [password, setPassword] = useState("");

  // upload + data
  const [file, setFile] = useState(null);
  const [uploadData, setUploadData] = useState(null);
  const [history, setHistory] = useState([]);

  // status
  const [status, setStatus] = useState({ type: "idle", msg: "" });

  // busy flags
  const [busy, setBusy] = useState({
    login: false,
    test: false,
    upload: false,
    history: false,
    pdfLatest: false,
  });

  // auto-load history when token becomes available
  useEffect(() => {
    if (token) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // charts (colorful)
  const barData = useMemo(() => {
    const preview = uploadData?.preview;
    if (!Array.isArray(preview) || preview.length === 0) return null;

    const labels = preview.map((r) => String(r?.[0] ?? ""));
    const values = preview.map((r) => toNum(r?.[2]));

    return {
      labels,
      datasets: [
        {
          label: "Flowrate",
          data: values,
          backgroundColor: "rgba(13,110,253,0.65)",
          borderColor: "rgba(13,110,253,1)",
          borderWidth: 1,
        },
      ],
    };
  }, [uploadData]);

  const pieData = useMemo(() => {
    const dist = uploadData?.equipment_distribution || {};
    const labels = Object.keys(dist);
    const values = Object.values(dist).map((v) => toNum(v));
    if (!labels.length) return null;

    const COLORS = [
      "rgba(255, 99, 132, 0.75)",
      "rgba(54, 162, 235, 0.75)",
      "rgba(255, 206, 86, 0.75)",
      "rgba(75, 192, 192, 0.75)",
      "rgba(153, 102, 255, 0.75)",
      "rgba(255, 159, 64, 0.75)",
      "rgba(99, 255, 132, 0.75)",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Equipment Types",
          data: values,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: labels.map((_, i) => COLORS[i % COLORS.length].replace("0.75", "1")),
          borderWidth: 1,
        },
      ],
    };
  }, [uploadData]);

  const barOptions = { responsive: true, maintainAspectRatio: false };
  const pieOptions = { responsive: true, maintainAspectRatio: false };

  function setStatusMsg(type, msg) {
    setStatus({ type, msg });
  }

  // ✅ Step 2: Login -> /api/auth/token/
  async function login() {
    if (!username.trim() || !password) return alert("Enter username + password");

    setBusy((b) => ({ ...b, login: true }));
    setStatusMsg("info", "Logging in...");

    try {
      const res = await axios.post(`${API_BASE}/auth/token/`, new URLSearchParams({
        username: username.trim(),
        password: password,
      }));

      const newToken = res?.data?.token;
      if (!newToken) {
        setStatusMsg("bad", "Login failed: no token returned");
        return;
      }

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setPassword(""); // clear password for safety
      setStatusMsg("ok", "✅ Logged in. Token saved.");
    } catch (err) {
      const code = err?.response?.status;
      const detail = err?.response?.data?.detail;
      setStatusMsg("bad", `❌ Login failed (${code || "no response"}): ${detail || ""}`.trim());
      console.error(err);
    } finally {
      setBusy((b) => ({ ...b, login: false }));
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUploadData(null);
    setHistory([]);
    setStatusMsg("info", "Logged out. Token cleared.");
  }

  async function testToken() {
    if (!token.trim()) return alert("Login first");

    setBusy((b) => ({ ...b, test: true }));
    setStatusMsg("info", "Testing token...");

    try {
      await axios.get(`${API_BASE}/history/`, {
        headers: authHeaders(token),
      });
      setStatusMsg("ok", "✅ Token OK. Backend reachable.");
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) setStatusMsg("bad", "❌ 401 Unauthorized. Please login again.");
      else setStatusMsg("bad", `❌ Token test failed (${code || "no response"})`);
      console.error(err);
    } finally {
      setBusy((b) => ({ ...b, test: false }));
    }
  }

  async function loadHistory() {
    if (!token.trim()) return;

    setBusy((b) => ({ ...b, history: true }));
    setStatusMsg("info", "Loading history...");

    try {
      const res = await axios.get(`${API_BASE}/history/`, {
        headers: authHeaders(token),
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setHistory(list.slice(0, 5));
      setStatusMsg("ok", "✅ History loaded.");
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) setStatusMsg("bad", "❌ 401 Unauthorized. Please login again.");
      else setStatusMsg("bad", `❌ History failed (${code || "no response"})`);
      console.error(err);
    } finally {
      setBusy((b) => ({ ...b, history: false }));
    }
  }

  async function uploadCSV() {
    if (!token.trim()) return alert("Login first");
    if (!file) return alert("Choose a CSV file");

    setBusy((b) => ({ ...b, upload: true }));
    setStatusMsg("info", "Uploading CSV...");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/upload/`, form, {
        headers: {
          ...authHeaders(token),
          // don't set Content-Type manually
        },
      });

      setUploadData(res.data);
      setStatusMsg("ok", "✅ Upload OK. Table + charts updated.");
      await loadHistory();
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) setStatusMsg("bad", "❌ 401 Unauthorized. Please login again.");
      else {
        const detail = err?.response?.data?.detail || err?.response?.data?.error;
        setStatusMsg("bad", `❌ Upload failed (${code || "no response"}): ${detail || ""}`.trim());
      }
      console.error(err);
    } finally {
      setBusy((b) => ({ ...b, upload: false }));
    }
  }

  async function downloadPDF(id) {
    if (!token.trim()) return alert("Login first");
    if (!id) return alert("No dataset id");

    setStatusMsg("info", `Downloading PDF for id=${id}...`);

    try {
      const res = await axios.get(`${API_BASE}/report/${id}/`, {
        headers: authHeaders(token),
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      setStatusMsg("ok", `✅ PDF downloaded: report_${id}.pdf`);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) setStatusMsg("bad", "❌ 401 Unauthorized. Please login again.");
      else setStatusMsg("bad", `❌ PDF download failed (${code || "no response"})`);
      console.error(err);
    }
  }

  // ✅ Step 5 optional: download latest pdf if endpoint exists
  async function downloadLatestPDF() {
    if (!token.trim()) return alert("Login first");

    setBusy((b) => ({ ...b, pdfLatest: true }));
    setStatusMsg("info", "Downloading latest PDF...");

    try {
      const res = await axios.get(`${API_BASE}/report/latest/`, {
        headers: authHeaders(token),
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `equipment_report_latest.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      setStatusMsg("ok", "✅ Latest PDF downloaded.");
    } catch (err) {
      const code = err?.response?.status;
      setStatusMsg("bad", `❌ Latest PDF failed (${code || "no response"})`);
      console.error(err);
    } finally {
      setBusy((b) => ({ ...b, pdfLatest: false }));
    }
  }

  const StatusPill = () => {
    if (!status.msg) return null;

    const bg =
      status.type === "ok" ? "#e9f8ee" : status.type === "bad" ? "#ffecec" : "#eef4ff";
    const color =
      status.type === "ok" ? "#0a7a2f" : status.type === "bad" ? "#c00" : "#0b5ed7";

    return (
      <div style={{
        background: bg,
        color,
        padding: "10px 12px",
        borderRadius: 10,
        marginTop: 12,
        fontWeight: 600
      }}>
        {status.msg}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", padding: 24, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>

        {/* ✅ Center heading */}
        <h1 style={{ textAlign: "center", margin: 0 }}>Chemical Equipment Visualizer</h1>

        <div style={{ background: "white", borderRadius: 14, padding: 18, marginTop: 14, boxShadow: "0 0 10px rgba(0,0,0,0.08)" }}>

          {/* LOGIN BOX */}
          {!token ? (
            <div style={{ display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Login</h3>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />

              <button
                onClick={login}
                disabled={busy.login}
                style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#0d6efd", color: "white", cursor: "pointer" }}
              >
                {busy.login ? "Logging in..." : "Login"}
              </button>

              <StatusPill />
            </div>
          ) : (
            <>
              {/* TOP ACTIONS */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={testToken}
                  disabled={busy.test}
                  style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#0d6efd", color: "white", cursor: "pointer" }}
                >
                  {busy.test ? "Testing..." : "Test Token"}
                </button>

                <button
                  onClick={loadHistory}
                  disabled={busy.history}
                  style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#0d6efd", color: "white", cursor: "pointer" }}
                >
                  {busy.history ? "Loading..." : "Refresh History"}
                </button>

                <button
                  onClick={downloadLatestPDF}
                  disabled={busy.pdfLatest}
                  style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#198754", color: "white", cursor: "pointer" }}
                >
                  {busy.pdfLatest ? "Downloading..." : "Download Latest PDF"}
                </button>

                <button
                  onClick={logout}
                  style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#dc3545", color: "white", cursor: "pointer" }}
                >
                  Logout
                </button>
              </div>

              {/* FILE PICKER */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ padding: 8 }}
                />
                <button
                  onClick={uploadCSV}
                  disabled={busy.upload}
                  style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#28a745", color: "white", cursor: "pointer" }}
                >
                  {busy.upload ? "Uploading..." : "Upload CSV"}
                </button>

                {/* ✅ Step 5: selected file name */}
                <div style={{ color: "#666", fontSize: 13 }}>
                  {file ? <>Selected: <b>{file.name}</b></> : "No file selected"}
                </div>
              </div>

              <StatusPill />

              {/* HISTORY */}
              <div style={{ marginTop: 16, background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Last 5 Uploads</h3>

                {!history?.length ? (
                  <div style={{ color: "#666" }}>No history yet. Upload CSV or click “Refresh History”.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {history.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          background: "white",
                          border: "1px solid #eee",
                          borderRadius: 10,
                          padding: 10,
                        }}
                      >
                        <div>
                          <b>ID:</b> {item.id} &nbsp;|&nbsp; <b>File:</b> {item.filename} &nbsp;|&nbsp; <b>Rows:</b> {item.rows}
                          <div style={{ color: "#666", fontSize: 13 }}>{item.created_at}</div>
                        </div>

                        {/* ✅ clear download button */}
                        <button
                          onClick={() => downloadPDF(item.id)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: 0,
                            background: "#0d6efd",
                            color: "white",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Download PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TABLE + STATS */}
              {uploadData && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 6 }}>Rows: {uploadData.rows}</h3>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {(uploadData.columns || []).map((c) => (
                            <th key={c} style={{ border: "1px solid #ddd", padding: 8, background: "#007bff", color: "white" }}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {(uploadData.preview || []).map((row, idx) => (
                          <tr key={idx}>
                            {(row || []).map((cell, j) => (
                              <td key={j} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {uploadData.averages && (
                    <>
                      <h3 style={{ marginTop: 14 }}>Averages</h3>
                      <ul>
                        <li>Flowrate: {toNum(uploadData.averages.flowrate).toFixed(2)}</li>
                        <li>Pressure: {toNum(uploadData.averages.pressure).toFixed(2)}</li>
                        <li>Temperature: {toNum(uploadData.averages.temperature).toFixed(2)}</li>
                      </ul>
                    </>
                  )}

                  {uploadData.equipment_distribution && (
                    <>
                      <h3>Equipment Distribution</h3>
                      <ul>
                        {Object.entries(uploadData.equipment_distribution).map(([k, v]) => (
                          <li key={k}>{k}: {v}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* CHARTS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginTop: 16 }}>
                <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 12, height: 360 }}>
                  <h3 style={{ marginTop: 0, textAlign: "center" }}>Flowrate (Bar)</h3>
                  {barData ? <Bar data={barData} options={barOptions} /> : <div style={{ color: "#666", textAlign: "center" }}>Upload CSV to see bar chart</div>}
                </div>

                <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 12, height: 360 }}>
                  <h3 style={{ marginTop: 0, textAlign: "center" }}>Equipment Types (Pie)</h3>
                  {pieData ? <Pie data={pieData} options={pieOptions} /> : <div style={{ color: "#666", textAlign: "center" }}>Upload CSV to see pie chart</div>}
                </div>
              </div>

              <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                Note: Browser me directly <b>/api/history</b> open karoge to 401 normal hai (token header missing).
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
