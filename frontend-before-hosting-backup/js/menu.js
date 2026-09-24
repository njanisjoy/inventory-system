/* ======================================================
   MENU.JS — Inventory System
   Menyesuaikan tampilan sidebar dan tombol aksi
   berdasarkan role user yang sedang login.

   Bergantung pada window.__session yang di-set oleh session.js.
   Jalankan SETELAH session.js dan SEBELUM script halaman.

   ATURAN VISIBILITAS:
   ┌─────────────────────┬──────────┬─────────┬─────────┬────────┐
   │ Menu / Fitur        │ adm_utma │ admin_2 │ admin_3 │ gudang │
   ├─────────────────────┼──────────┼─────────┼─────────┼────────┤
   │ Dashboard           │    ✓     │    ✓    │    ✓    │   ✓    │
   │ Stok                │    ✓     │    ✓    │    ✓    │   ✓    │
   │ Barang Masuk        │    ✓     │    ✓    │    ✓    │   ✗    │
   │ Produk (lihat)      │    ✓     │    ✓    │    ✓    │   ✓    │
   │ Satuan              │    ✓     │    ✗    │    ✗    │   ✗    │
   │ Supplier            │    ✓     │    ✓    │    ✓    │   ✓    │
   │ Material Issue      │    ✓     │    ✗    │    ✗    │   ✓    │
   │ Outbound            │    ✓     │    ✓    │    ✓    │   ✗    │
   │ Laporan             │    ✓     │    ✓    │    ✓    │   ✓    │
   ├─────────────────────┼──────────┼─────────┼─────────┼────────┤
   │ Tombol Tambah/Edit  │          │         │         │        │
   │ Produk              │    ✓     │    ✗    │    ✗    │   ✗    │
   │ Satuan (add/edit)   │    ✓     │    ✗    │    ✗    │   ✗    │
   │ Supplier (add/edit) │    ✓     │    ✗    │    ✗    │   ✗    │
   └─────────────────────┴──────────┴─────────┴─────────┴────────┘
   ====================================================== */

(function () {

    // Ambil role dari session yang sudah di-set session.js
    const session = window.__session;

    if (!session || !session.payload) {
        // session.js belum jalan atau token invalid — sudah ditangani di sana
        return;
    }

    const role = session.payload.role;


    // ======================================================
    // KONFIGURASI VISIBILITAS MENU PER ROLE
    // Key = href atribut menu-item, Value = array role yang boleh melihat
    // ======================================================

    const MENU_ACCESS = {
        "./dashboard.html":      ["admin_utama", "admin_2", "admin_3", "gudang"],
        "./stock.html":          ["admin_utama", "admin_2", "admin_3", "gudang"],
        "./stock-in.html":       ["admin_utama"],
        "./products.html":       ["admin_utama", "admin_2", "admin_3", "gudang"],
        "./kategori.html":       ["admin_utama"],
        "./units.html":          ["admin_utama"],
        "./lokasi.html":         ["admin_utama"],
        "./suppliers.html":      ["admin_utama", "admin_2", "admin_3", "gudang"],
        "./material-issue.html": ["admin_utama", "gudang"],
        "./outbound.html":       ["admin_utama", "admin_2", "admin_3"],
        "./laporan.html":        ["admin_utama", "admin_2", "admin_3", "gudang"]
    };


    // ======================================================
    // TERAPKAN VISIBILITAS MENU SIDEBAR
    // ======================================================

    function applyMenuVisibility() {
        const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");

        menuItems.forEach(item => {
            const href = item.getAttribute("href");
            if (!href) return;

            const allowedRoles = MENU_ACCESS[href];

            // Jika tidak ada di konfigurasi atau role tidak ada di daftar
            if (!allowedRoles || !allowedRoles.includes(role)) {
                item.style.display = "none";
            }
        });
    }


    // ======================================================
    // TERAPKAN VISIBILITAS TOMBOL AKSI
    // Sembunyikan tombol tambah/edit untuk role yang tidak boleh.
    // Backend tetap memblokir dengan 403 — ini hanya UI convenience.
    // ======================================================

    // Tombol yang hanya boleh dilihat admin_utama
    const ADMIN_ONLY_BUTTONS = [
        "#addProductButton",    // products.html — Tambah Produk
        "#addUnitButton",       // units.html — Tambah Satuan
        "#addSupplierButton",   // suppliers.html — Tambah Supplier
        "#addKategoriButton",   // kategori.html — Tambah Kategori
        "#addLokasiButton"      // lokasi.html — Tambah Lokasi
    ];

    // Tombol edit di tabel (class-based, di-generate oleh JS)
    // Ditangani via MutationObserver di bawah

    function applyButtonVisibility() {
        if (role === "admin_utama") return; // admin_utama lihat semua

        ADMIN_ONLY_BUTTONS.forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) btn.style.display = "none";
        });

        // Untuk halaman yang tidak boleh sama sekali:
        // sembunyikan tombol .edit-button di tabel
        const restrictedEditPages = ["products.html", "units.html", "suppliers.html", "kategori.html", "lokasi.html"];
        const currentPage = window.location.pathname.split("/").pop();

        if (
            restrictedEditPages.includes(currentPage) &&
            role !== "admin_utama"
        ) {
            hideEditButtons();
            watchForNewEditButtons();
        }
    }

    function hideEditButtons() {
        document.querySelectorAll(".edit-button").forEach(btn => {
            btn.style.display = "none";
        });
    }

    // MutationObserver: tabel di-render oleh JS secara async,
    // jadi kita perlu watch DOM dan sembunyikan tombol yang baru muncul
    function watchForNewEditButtons() {
        const observer = new MutationObserver(() => {
            hideEditButtons();
        });

        // Observasi body untuk perubahan subtree (tabel di-render setelah load)
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }


    // ======================================================
    // TAMPILKAN ROLE DI TOPBAR (opsional, membantu debugging)
    // ======================================================

    function showRoleBadge() {
        const userInfoEl = document.querySelector(".user-info");
        if (!userInfoEl) return;

        const ROLE_LABELS = {
            admin_utama: "Admin Utama",
            admin_2:     "Admin 2",
            admin_3:     "Admin 3",
            gudang:      "Gudang"
        };

        const label = ROLE_LABELS[role] || role;

        const badge = document.createElement("span");
        badge.textContent = label;
        Object.assign(badge.style, {
            display:       "inline-block",
            marginLeft:    "8px",
            padding:       "2px 8px",
            borderRadius:  "12px",
            fontSize:      "11px",
            fontWeight:    "700",
            background:    "#f0f0f0",
            color:         "#555",
            verticalAlign: "middle"
        });

        userInfoEl.appendChild(badge);
    }


    // ======================================================
    // JALANKAN SAAT DOM SIAP
    // ======================================================

    function init() {
        applyMenuVisibility();
        applyButtonVisibility();
        showRoleBadge();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
