// ======================================================
// AUTH.JS — Halaman Login
// ======================================================

const loginForm      = document.getElementById("loginForm");
const loginMessage   = document.getElementById("loginMessage");
const loginButton    = document.getElementById("loginButton");
const togglePassword = document.getElementById("togglePassword");
const passwordInput  = document.getElementById("password");


// ======================================================
// JIKA SUDAH LOGIN, REDIRECT KE DASHBOARD
// ======================================================

(function checkAlreadyLoggedIn() {

    const token = localStorage.getItem("token");

    if (!token) return;

    // Parse payload JWT
    try {
        const base64  = token.split(".")[1];
        const padded  = base64.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(padded));

        if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
            // Token masih valid — langsung ke dashboard
            window.location.href = "./dashboard.html";
        } else {
            // Token expired — bersihkan
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }
    } catch (_) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    }

})();


// ======================================================
// TAMPILKAN PESAN REASON DARI URL (dari auto-logout)
// ======================================================

(function showSessionReason() {

    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");

    if (reason) {
        setMessage(decodeURIComponent(reason), "error");

        // Bersihkan URL tanpa reload
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, "", cleanUrl);
    }

})();


// ======================================================
// TOGGLE SHOW / HIDE PASSWORD
// ======================================================

togglePassword.addEventListener("click", () => {

    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    const eyeIcon = document.getElementById("eyeIcon");

    if (isPassword) {
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        `;
    } else {
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        `;
    }

});


// ======================================================
// HELPER: SET MESSAGE
// ======================================================

function setMessage(text, type = "") {
    loginMessage.textContent = text;
    loginMessage.className   = "login-message";
    if (type) loginMessage.classList.add(type);
}


// ======================================================
// SUBMIT LOGIN
// ======================================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username) {
        setMessage("Username wajib diisi.", "error");
        return;
    }

    if (!password) {
        setMessage("Password wajib diisi.", "error");
        return;
    }

    setMessage("Sedang masuk...");
    loginButton.disabled = true;

    try {

        const response = await fetch(`${BASE_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            setMessage(data.message || "Username atau password salah.", "error");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setMessage("Login berhasil!", "success");

        setTimeout(() => {
            window.location.href = "./dashboard.html";
        }, 350);

    } catch (error) {

        console.error(error);
        setMessage("Tidak dapat terhubung ke server.", "error");

    } finally {

        loginButton.disabled = false;

    }

});
