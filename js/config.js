// // =============================================
// // API CONFIGURATION - LearnHub Frontend
// // =============================================
// // To switch between local and production:
// // Change ENVIRONMENT to "local" or "production"

// const ENVIRONMENT = "production";

// const _BASE_URLS = {
//   local:      "http://127.0.0.1:8000",
//   production: "https://learnhub-backend-om6j.onrender.com"
// };

// const BASE_URL  = _BASE_URLS[ENVIRONMENT];
// const API_BASE  = BASE_URL + "/api/v1";

// // Pre-built API root constants (mirrors what each file previously declared)
// const API             = API_BASE;
// const API_URL         = API_BASE;
// const API_BASE_FILTER = API_BASE;
// const CERT_API        = API_BASE;
// const SUPER_API       = API_BASE + "/superadmin";

// // Helper: resolve a relative file path returned by the backend
// // (e.g. "media/uploads/logo.png") into an absolute URL
// function getFileUrl(path) {
//   if (!path) return null;
//   if (path.startsWith("http")) return path;
//   return BASE_URL + "/" + path;
// }
// ============================================================
//  API Configuration — change this ONE line when you deploy
// ============================================================
const API_BASE = "https://learnhub-backend-om6j.onrender.com";

// For local development:
// const API_BASE = "http://127.0.0.1:8000";
// ============================================================


// ============================================================
//  Session Management — Auto logout on token expiry
// ============================================================

// Map each portal's dashboard to its login page
const PORTAL_LOGIN_MAP = {
  '/admin/'       : '/auth.html',
  '/teacher/'     : '/auth.html',
  '/student/'     : '/auth.html',
  '/superadmin/'  : '/superadmin/super-login.html',
};

function getLoginPage() {
  const path = window.location.pathname;
  for (const prefix in PORTAL_LOGIN_MAP) {
    if (path.includes(prefix)) return PORTAL_LOGIN_MAP[prefix];
  }
  return '/auth.html';
}

function isTokenExpired(token) {
  try {
    // JWT payload is the middle part, base64 encoded
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true; // if can't parse, treat as expired
  }
}

function checkSession() {
  const token = localStorage.getItem('access_token');
  const loginPage = getLoginPage();

  // If on login page already, skip check
  if (window.location.pathname.includes('auth.html') ||
      window.location.pathname.includes('super-login.html') ||
      window.location.pathname === '/' ||
      window.location.pathname.includes('index.html')) {
    return;
  }

  // No token — redirect to login
  if (!token) {
    window.location.href = loginPage;
    return;
  }

  // Token expired — clear and redirect
  if (isTokenExpired(token)) {
    localStorage.clear();
    sessionStorage.clear();
    alert("Your session has expired. Please login again.");
    window.location.href = loginPage;
    return;
  }

  // Token valid — set a timer for when it WILL expire
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const msUntilExpiry = (payload.exp - now) * 1000;

    if (msUntilExpiry > 0) {
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        alert("Your session has expired. Please login again.");
        window.location.href = loginPage;
      }, msUntilExpiry);
    }
  } catch(e) {}
}

// Global fetch wrapper — catches 401 from any API call
const _originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await _originalFetch(...args);

  if (response.status === 401) {
    const loginPage = getLoginPage();
    // Don't redirect if already on login page
    if (!window.location.pathname.includes('auth.html') &&
        !window.location.pathname.includes('super-login.html')) {
      localStorage.clear();
      sessionStorage.clear();
      alert("Your session has expired. Please login again.");
      window.location.href = loginPage;
    }
  }

  return response;
};

// Run session check on every page load
document.addEventListener('DOMContentLoaded', checkSession);
// ============================================================