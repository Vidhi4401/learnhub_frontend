// =============================================
// MOBILE SIDEBAR TOGGLE - LearnHub
// =============================================
(function () {
  'use strict';

  function initMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtns = document.querySelectorAll('.nav-toggle-btn');
    if (!sidebar) return;

    // Create overlay element
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    function isMobile() { return window.innerWidth <= 900; }

    function openSidebar() {
      document.body.classList.add('sidebar-open');
      document.body.classList.remove('sidebar-collapsed');
      overlay.classList.add('active');
    }

    function closeSidebar() {
      document.body.classList.remove('sidebar-open');
      overlay.classList.remove('active');
    }

    function desktopToggle() {
      document.body.classList.toggle('sidebar-collapsed');
    }

    toggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isMobile()) {
          if (document.body.classList.contains('sidebar-open')) {
            closeSidebar();
          } else {
            openSidebar();
          }
        } else {
          desktopToggle();
        }
      });
    });

    // Close when overlay clicked
    overlay.addEventListener('click', closeSidebar);

    // Close when sidebar link clicked on mobile
    sidebar.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (isMobile()) closeSidebar();
      });
    });

    // Handle resize
    window.addEventListener('resize', function () {
      if (!isMobile()) {
        closeSidebar();
        overlay.classList.remove('active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileSidebar);
  } else {
    initMobileSidebar();
  }
})();
