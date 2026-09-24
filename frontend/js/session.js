/* ======================================================
   SESSION.JS — Inventory System
   Manajemen sesi terpusat:
   - Cek token saat halaman load
   - Auto-logout saat token expired (dari exp di JWT payload)
   - Warning 5 menit sebelum expired
   - Intercept semua fetch: 401/403 → logout otomatis
   - Helper: sessionFetch() sebagai pengganti fetch() biasa
   ====================================================== */

(function () {

    // ======================================================
    // PARSE JWT PAYLOAD TANPA LIBRARY
    // ======================================================

    function parseJwt(token) {
        try {
            const base64 = token.split(".")[1];
            // Base64url → Base64
            const padded  = base64.replace(/-/g, "+").replace(/_/g, "/");
            const decoded = atob(padded);
            return JSON.parse(decoded);
        } catch (_) {
            return null;
        }
    }


    // ======================================================
    // LOGOUT — bersihkan storage dan redirect ke login
    // ======================================================

    function logout(reason) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Hindari redirect loop jika sudah di halaman login
        if (
            !window.location.pathname.endsWith("index.html") &&
            window.location.pathname !== "/" &&
            !window.location.pathname.endsWith("/")
        ) {
            const msg = reason
                ? `?reason=${encodeURIComponent(reason)}`
                : "";
            window.location.href = "./index.html" + msg;
        }
    }


    // ======================================================
    // CEK TOKEN SAAT LOAD
    // ======================================================

    const token = localStorage.getItem("token");

    if (!token) {
        logout();
        // Hentikan eksekusi semua script berikutnya
        // (tidak bisa throw karena DOMContentLoaded sudah jalan —
        //  redirect sudah dipanggil, biarkan halaman ter-redirect)
        return;
    }

    const payload = parseJwt(token);

    if (!payload || !payload.exp) {
        logout("Token tidak valid");
        return;
    }

    const nowMs     = Date.now();
    const expMs     = payload.exp * 1000;
    const remaining = expMs - nowMs;

    if (remaining <= 0) {
        logout("Sesi telah berakhir, silakan login kembali");
        return;
    }


    // ======================================================
    // EXPOSE TOKEN & PAYLOAD KE HALAMAN
    // ======================================================

    window.__session = {
        token,
        payload,
        expMs,
        logout
    };


    // ======================================================
    // WARNING BANNER 5 MENIT SEBELUM EXPIRED
    // ======================================================

    const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 menit

    function showExpiryWarning() {
        // Jangan tampilkan banner yang sudah ada
        if (document.getElementById("sessionWarningBanner")) return;

        const banner       = document.createElement("div");
        banner.id          = "sessionWarningBanner";
        banner.textContent = "Sesi Anda akan berakhir dalam 5 menit. Simpan pekerjaan Anda.";
        Object.assign(banner.style, {
            position:       "fixed",
            top:            "0",
            left:           "0",
            right:          "0",
            zIndex:         "9999",
            background:     "#e65100",
            color:          "#fff",
            textAlign:      "center",
            padding:        "10px 16px",
            fontSize:       "13.5px",
            fontWeight:     "600",
            fontFamily:     "Arial, sans-serif",
            boxShadow:      "0 2px 8px rgba(0,0,0,0.18)",
            cursor:         "pointer"
        });

        banner.title = "Klik untuk menutup";
        banner.addEventListener("click", () => banner.remove());

        document.body.appendChild(banner);
    }

    if (remaining > WARN_BEFORE_MS) {
        // Set timer untuk warning
        setTimeout(showExpiryWarning, remaining - WARN_BEFORE_MS);
    } else {
        // Sudah dalam window 5 menit → tampilkan langsung
        // Tunggu DOM siap
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", showExpiryWarning);
        } else {
            showExpiryWarning();
        }
    }


    // ======================================================
    // AUTO-LOGOUT SAAT EXPIRED
    // ======================================================

    // setTimeout maksimum aman di browser adalah ~24.8 hari.
    // Token expire 8 jam jadi aman.
    const logoutTimer = setTimeout(() => {
        logout("Sesi Anda telah berakhir, silakan login kembali");
    }, remaining);

    // Bersihkan timer jika halaman di-unload
    window.addEventListener("beforeunload", () => clearTimeout(logoutTimer));


    // ======================================================
    // INTERCEPT FETCH — 401 / 403 → AUTO LOGOUT
    // ======================================================

    const _originalFetch = window.fetch.bind(window);

    window.fetch = async function (input, init) {

        const response = await _originalFetch(input, init);

        // Kalau server bilang unauthorized / forbidden,
        // hapus sesi dan redirect ke login
        if (response.status === 401) {
            // Token tidak ada atau sudah expired → logout
            logout("Sesi tidak valid atau telah berakhir");
            return response;
        }
        // 403 = Forbidden (hak akses ditolak) — JANGAN logout,
        // biarkan halaman menampilkan pesan error sendiri.

        return response;

    };


    // ======================================================
    // HELPER: sessionFetch
    // Wrap fetch dengan Authorization header otomatis.
    // Gunakan ini sebagai pengganti fetch() di halaman lain
    // (opsional — intercept di atas sudah otomatis handle 401/403)
    // ======================================================

    window.sessionFetch = function (url, options = {}) {

        return window.fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization:  `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

    };

})();
