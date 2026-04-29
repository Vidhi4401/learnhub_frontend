// certificates.js
// token and user are already declared in student-layout.js



// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadCertificates);
} else {
  loadCertificates();
}

async function loadCertificates() {
  const container = document.getElementById("certsContainer");
  if (!container) return;

  // Use the token from student-layout.js (which uses 'var token')
  if (typeof token === 'undefined' || !token) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem; color: #ef4444;">
        <p>Session expired or invalid. Please login again.</p>
        <a href="../auth.html" style="color: #3b82f6; text-decoration: underline;">Go to Login</a>
      </div>`;
    return;
  }

  try {
    const res = await fetch(`${CERT_API}/student/certificates`, {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${res.status}`);
    }

    const certs = await res.json();

    if (!Array.isArray(certs) || certs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 5rem 2rem; background: var(--white); border-radius: 16px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎓</div>
          <h3 style="margin: 0; color: var(--ink);">No certificates yet</h3>
          <p style="color: var(--muted); margin-top: 8px;">Complete courses and their requirements to earn certificates.</p>
        </div>`;
      return;
    }

    const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' }) : "—";

    container.innerHTML = certs.map(c => {
      const isIssued = !!c.issued;
      const courseTitle = c.course_title || "Untitled Course";
      const statusText = isIssued ? "✅ Issued" : (c.status === "rejected" ? "✕ Rejected" : "⏳ Pending");
      const statusBg = isIssued ? "#dcfce7" : (c.status === "rejected" ? "#fee2e2" : "#fef3c7");
      const statusColor = isIssued ? "#166534" : (c.status === "rejected" ? "#991b1b" : "#92400e");

      return `
        <div class="cert-card">
          <div class="cert-info">
            <h3>📄 ${courseTitle}</h3>
            <p>${isIssued ? `Earned on ${fmtDate(c.issued_at)}` : `Requested on ${fmtDate(c.request_date)}`}</p>
          </div>
          <div class="cert-actions">
            <span class="badge" style="background: ${statusBg}; color: ${statusColor};">${statusText}</span>
            ${isIssued ? `
              <button class="btn-view" onclick="viewCert(${c.id})">👁️ View</button>
              <button class="btn-download" onclick="downloadCert(${c.id}, '${courseTitle.replace(/'/g, "\\'")}')">
                ⬇️ Download PDF
              </button>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Certificates load error:", err);
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem; color: #ef4444; background: var(--white); border-radius: 16px; border: 1px solid #fee2e2;">
        <p style="font-weight:bold; margin-bottom: 8px;">Unable to load certificates</p>
        <p style="font-size: 14px; color: var(--muted); margin-bottom: 16px;">${err.message || "An unexpected error occurred."}</p>
        <button onclick="loadCertificates()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
          Try Again
        </button>
      </div>`;
  }
}

async function downloadCert(certId, courseTitle) {
  try {
    const res = await fetch(`${CERT_API}/student/certificates/${certId}/download`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) {
      alert("Certificate not available for download.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Certificate_${courseTitle.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed. Please try again.");
  }
}

async function viewCert(certId) {
  try {
    const res = await fetch(`${CERT_API}/student/certificates/${certId}/download`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) {
      alert("Certificate not available.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (err) {
    console.error("View error:", err);
    alert("Could not open certificate.");
  }
}
