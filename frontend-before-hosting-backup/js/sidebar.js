/* ======================================================
   SIDEBAR.JS — Mobile drawer toggle
   Bergantung pada: .sidebar, .sidebar-backdrop, .hamburger-btn
   di DOM. Semua elemen ini diinjeksikan oleh script ini sendiri
   jika belum ada, sehingga tidak perlu mengubah HTML.
   ====================================================== */

(function () {

    // ======================================================
    // INJECT HAMBURGER BUTTON KE TOPBAR (jika belum ada)
    // ======================================================

    function injectHamburger() {
        if (document.getElementById('hamburgerBtn')) return;

        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        const btn = document.createElement('button');
        btn.id        = 'hamburgerBtn';
        btn.type      = 'button';
        btn.className = 'hamburger-btn';
        btn.setAttribute('aria-label', 'Buka menu');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>`;

        // Sisipkan sebagai anak pertama topbar
        topbar.insertBefore(btn, topbar.firstChild);
    }


    // ======================================================
    // INJECT BACKDROP (jika belum ada)
    // ======================================================

    function injectBackdrop() {
        if (document.getElementById('sidebarBackdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.id        = 'sidebarBackdrop';
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
    }


    // ======================================================
    // TOGGLE SIDEBAR
    // ======================================================

    function openSidebar() {
        const sidebar  = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar)  sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        const sidebar  = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar)  sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }


    // ======================================================
    // BIND EVENTS
    // ======================================================

    function bindEvents() {
        const btn      = document.getElementById('hamburgerBtn');
        const backdrop = document.getElementById('sidebarBackdrop');
        const sidebar  = document.querySelector('.sidebar');

        if (btn) {
            btn.addEventListener('click', openSidebar);
        }

        if (backdrop) {
            backdrop.addEventListener('click', closeSidebar);
        }

        // Tutup sidebar saat menu item diklik (mobile navigation)
        if (sidebar) {
            sidebar.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    // Hanya tutup jika dalam mode mobile (sidebar overlay)
                    if (window.innerWidth <= 700) {
                        closeSidebar();
                    }
                });
            });
        }

        // Tutup dengan tombol Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeSidebar();
        });

        // Tutup jika resize ke desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 700) {
                closeSidebar();
            }
        });
    }


    // ======================================================
    // INIT
    // ======================================================

    function init() {
        injectHamburger();
        injectBackdrop();
        bindEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
