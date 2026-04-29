/**
 * Theme Manager
 * Handles Light, Dark, and System theme switching.
 */

(function() {
  const STORAGE_KEY = 'portal_theme';
  const html = document.documentElement;

  // 1. Initial Apply
  const savedTheme = localStorage.getItem(STORAGE_KEY) || 'system';
  applyTheme(savedTheme);

  // 2. Listen for System Changes
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkQuery.addEventListener('change', () => {
    if (localStorage.getItem(STORAGE_KEY) === 'system' || !localStorage.getItem(STORAGE_KEY)) {
      applyTheme('system');
    }
  });

  function applyTheme(theme) {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }

  // 3. Global Theme API
  window.ThemeManager = {
    setTheme: (theme) => {
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
      // Dispatch event for components that need to react
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    },
    getTheme: () => {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    },
    toggleTheme: () => {
      const current = localStorage.getItem(STORAGE_KEY) || 'system';
      const next = current === 'light' ? 'dark' : 'light';
      window.ThemeManager.setTheme(next);
    }
  };
})();
