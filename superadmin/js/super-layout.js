var token = localStorage.getItem("token");
var user  = JSON.parse(localStorage.getItem("user"));

if (!token || !user || user.role !== "superadmin") {
  window.location.href = "../auth.html";
}

const currentPage = window.location.pathname.split("/").pop();

function isActive(page) {
  return currentPage === page ? "active" : "";
}

/* ===== SIDEBAR ===== */
document.getElementById("sidebar").innerHTML = `
  <div class="sidebar-brand">
    <div class="sidebar-brand-icon">🌐</div>
    <div class="sidebar-brand-text">
      <h2>LearnHub</h2>
      <p>Super Admin</p>
    </div>
  </div>

  <div class="sidebar-nav">
    <div class="sidebar-nav-label">Management</div>
    <a href="super-dashboard.html" class="${isActive("super-dashboard.html")}">
      <span class="nav-icon">📊</span>
      <span>Dashboard</span>
    </a>
    <a href="super-orgs.html" class="${isActive("super-orgs.html")}">
      <span class="nav-icon">🏢</span>
      <span>Organizations</span>
    </a>
    <a href="super-admins.html" class="${isActive("super-admins.html")}">
      <span class="nav-icon">👤</span>
      <span>Admins</span>
    </a>
    <a href="messages.html" class="${isActive("messages.html")}" id="messagesSidebarLink">
      <span class="nav-icon">✉️</span>
      <span>Contact Requests</span>
      <span id="messagesNotifDot" style="display:none; margin-left:auto; width:8px; height:8px; background:#dc2626; border-radius:50%; flex-shrink:0;"></span>
    </a>
  </div>

  <div class="sidebar-footer">
    <button id="logoutBtnSidebar">
      <span>→</span> Logout
    </button>
  </div>
`;

/* ===== NAVBAR ===== */
document.getElementById("navbar").innerHTML = `
  <div class="navbar-left">
    <button id="sidebarToggle" class="nav-toggle-btn">☰</button>
    <span class="navbar-page-title">Global Management</span>
  </div>

  <div class="navbar-right">
    <div class="theme-pill-toggle" id="themeToggle" title="Toggle Theme">
      <div class="theme-pill-icon" id="themePillIcon">☀️</div>
      <span class="theme-pill-label" id="themePillLabel">DAY MODE</span>
    </div>
    <div class="profile" id="profileDropdownTrigger">
      <div class="profile-info">
        <div class="profile-name">${user.name}</div>
        <div class="profile-email">Super Admin</div>
      </div>
      <div class="avatar">${user.name.charAt(0).toUpperCase()}</div>
      <div class="profile-dropdown">
        <button id="logoutBtn">→ Logout</button>
      </div>
    </div>
  </div>
`;

/* ===== SIDEBAR TOGGLE ===== */
document.getElementById("sidebarToggle").addEventListener("click", () => {
  document.body.classList.toggle("sidebar-collapsed");
});

/* ===== PROFILE DROPDOWN ===== */
const profileTrigger = document.getElementById("profileDropdownTrigger");
profileTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  profileTrigger.classList.toggle("active");
});
document.addEventListener("click", () => {
  profileTrigger.classList.remove("active");
});

/* ===== THEME PILL TOGGLE ===== */
function updateThemePill() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const icon  = document.getElementById("themePillIcon");
  const label = document.getElementById("themePillLabel");
  if (icon)  icon.textContent  = isDark ? "🌙" : "☀️";
  if (label) label.textContent = isDark ? "NIGHT MODE" : "DAY MODE";
}

const themeBtn = document.getElementById("themeToggle");
if (themeBtn) {
  updateThemePill();
  themeBtn.addEventListener("click", () => {
    window.ThemeManager.toggleTheme();
    setTimeout(updateThemePill, 10);
  });
}
window.addEventListener("themeChanged", () => updateThemePill());

/* ===== LOGOUT ===== */
function doLogout() {
  localStorage.clear();
  window.location.href = "../auth.html";
}
document.getElementById("logoutBtn").addEventListener("click", doLogout);
document.getElementById("logoutBtnSidebar").addEventListener("click", doLogout);

/* ===== CHECK FOR PENDING CONTACT REQUESTS ===== */
async function checkNewMessages() {
  try {
    const res = await fetch(`${SUPER_API}/contact-requests`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (res.ok) {
      const data = await res.json();
      const dot = document.getElementById("messagesNotifDot");
      if (dot) {
        dot.style.display = (Array.isArray(data) && data.length > 0) ? "inline-block" : "none";
      }
    }
  } catch (e) {
    const dot = document.getElementById("messagesNotifDot");
    if (dot) dot.style.display = "none";
  }
}
checkNewMessages();
setInterval(checkNewMessages, 30000);
