/* ======================================================
   THEME.JS — Dark / Light Mode Toggle
   Inject tombol toggle ke topbar, simpan di localStorage.
   Jalankan SEBELUM script lain agar tidak ada flash.
   ====================================================== */

(function () {

    const STORAGE_KEY = "inv_theme";

    // Terapkan theme sesegera mungkin (sebelum render)
    function applyTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    }

    // Baca preferensi tersimpan
    const saved = localStorage.getItem(STORAGE_KEY) || "light";
    applyTheme(saved);

    // Inject tombol toggle ke topbar setelah DOM siap
    function injectToggle() {
        const topbar = document.querySelector(".topbar");
        if (!topbar || document.getElementById("themeToggleBtn")) return;

        const btn = document.createElement("button");
        btn.id        = "themeToggleBtn";
        btn.type      = "button";
        btn.className = "theme-toggle";
        btn.title     = "Ganti tema";
        btn.setAttribute("aria-label", "Toggle dark mode");

        const isDark = document.body.classList.contains("dark-mode");
        btn.textContent = isDark ? "☀️" : "🌙";

        btn.addEventListener("click", () => {
            const nowDark = document.body.classList.toggle("dark-mode");
            localStorage.setItem(STORAGE_KEY, nowDark ? "dark" : "light");
            btn.textContent = nowDark ? "☀️" : "🌙";
        });

        // Sisipkan di ujung kanan topbar (setelah semua elemen)
        topbar.appendChild(btn);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectToggle);
    } else {
        injectToggle();
    }

})();
