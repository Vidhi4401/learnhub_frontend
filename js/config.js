// =============================================
// API CONFIGURATION - LearnHub Frontend
// =============================================
// To switch between local and production:
// Change ENVIRONMENT to "local" or "production"

const ENVIRONMENT = "production";

const _BASE_URLS = {
  local:      "http://127.0.0.1:8000",
  production: "https://learnhub-backend-om6j.onrender.com"
};

const BASE_URL  = _BASE_URLS[ENVIRONMENT];
const API_BASE  = BASE_URL + "/api/v1";

// Pre-built API root constants (mirrors what each file previously declared)
const API             = API_BASE;
const API_URL         = API_BASE;
const API_BASE_FILTER = API_BASE;
const CERT_API        = API_BASE;
const SUPER_API       = API_BASE + "/superadmin";

// Helper: resolve a relative file path returned by the backend
// (e.g. "media/uploads/logo.png") into an absolute URL
function getFileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return BASE_URL + "/" + path;
}
