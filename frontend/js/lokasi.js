const token = localStorage.getItem("token");

const userName        = document.getElementById("userName");
const lokasiTableBody = document.getElementById("lokasiTableBody");
const searchInput     = document.getElementById("searchInput");
const addLokasiButton = document.getElementById("addLokasiButton");
const lokasiModal     = document.getElementById("lokasiModal");
const closeModalButton = document.getElementById("closeModalButton");
const cancelButton    = document.getElementById("cancelButton");
const lokasiForm      = document.getElementById("lokasiForm");
const lokasiIdInput   = document.getElementById("lokasiId");
const lokasiName      = document.getElementById("lokasiName");
const lokasiType      = document.getElementById("lokasiType");
const lokasiDesc      = document.getElementById("lokasiDesc");
const modalTitle      = document.getElementById("modalTitle");
const formMessage     = document.getElementById("formMessage");
const saveButton      = document.getElementById("saveButton");
const logoutButton    = document.getElementById("logoutButton");

let lokasiData = [];

const currentUser  = JSON.parse(localStorage.getItem("user") || "{}");
const isAdminUtama = currentUser.role === "admin_utama";

const TIPE_LABEL = { warehouse: "Warehouse", store: "Store", company: "Company", other: "Other" };

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {
    const res  = await fetch(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data user");
    userName.textContent = data.user.name;
    localStorage.setItem("user", JSON.stringify(data.user));
}

// ======================================================
// LOAD LOKASI
// ======================================================

async function loadLokasi() {
    const res  = await fetch(`${BASE_URL}/api/locations`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data lokasi");
    lokasiData = data;
    renderLokasi();
}

// ======================================================
// RENDER
// ======================================================

function renderLokasi() {
    const keyword  = searchInput.value.trim().toLowerCase();
    const filtered = lokasiData.filter(l =>
        l.name.toLowerCase().includes(keyword) ||
        (l.type || "").toLowerCase().includes(keyword) ||
        (l.description || "").toLowerCase().includes(keyword)
    );

    lokasiTableBody.innerHTML = "";

    if (filtered.length === 0) {
        lokasiTableBody.innerHTML = `<tr><td colspan="${isAdminUtama ? 4 : 3}">Tidak ada lokasi yang ditemukan.</td></tr>`;
        return;
    }

    filtered.forEach(l => {
        const tipeLabel = TIPE_LABEL[l.type] || l.type || "-";
        const deleteBtn = isAdminUtama
            ? `<button type="button" class="delete-button" data-id="${l.id}" data-name="${escapeHtml(l.name)}">Hapus</button>`
            : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(l.name)}</td>
            <td><span class="tipe-badge ${escapeHtml(l.type || "other")}">${escapeHtml(tipeLabel)}</span></td>
            <td>${escapeHtml(l.description || "-")}</td>
            <td>
                <button type="button" class="edit-button" data-id="${l.id}">Edit</button>
                ${deleteBtn}
            </td>
        `;
        lokasiTableBody.appendChild(tr);
    });

    lokasiTableBody.querySelectorAll(".edit-button").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });

    lokasiTableBody.querySelectorAll(".delete-button").forEach(btn => {
        btn.addEventListener("click", () => deleteLokasi(btn.dataset.id, btn.dataset.name));
    });
}

// ======================================================
// DELETE (SOFT DELETE)
// ======================================================

async function deleteLokasi(id, name) {
    if (!confirm(`Hapus lokasi "${name}"?\n\nLokasi tidak akan muncul lagi di daftar.`)) return;
    try {
        const res  = await fetch(`${BASE_URL}/api/locations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal menghapus lokasi");
        await loadLokasi();
    } catch (err) {
        console.error(err);
        alert("Gagal menghapus lokasi: " + err.message);
    }
}

// ======================================================
// MODAL
// ======================================================

function openAddModal() {
    modalTitle.textContent  = "Tambah Lokasi";
    lokasiIdInput.value     = "";
    lokasiName.value        = "";
    lokasiType.value        = "";
    lokasiDesc.value        = "";
    formMessage.textContent = "";
    lokasiModal.classList.remove("hidden");
    lokasiName.focus();
}

function openEditModal(id) {
    const l = lokasiData.find(x => String(x.id) === String(id));
    if (!l) return;
    modalTitle.textContent  = "Edit Lokasi";
    lokasiIdInput.value     = l.id;
    lokasiName.value        = l.name;
    lokasiType.value        = l.type || "";
    lokasiDesc.value        = l.description || "";
    formMessage.textContent = "";
    lokasiModal.classList.remove("hidden");
    lokasiName.focus();
}

function closeModal() {
    lokasiModal.classList.add("hidden");
    formMessage.textContent = "";
}

addLokasiButton.addEventListener("click", openAddModal);
closeModalButton.addEventListener("click", closeModal);
cancelButton.addEventListener("click", closeModal);
searchInput.addEventListener("input", renderLokasi);

// ======================================================
// SAVE
// ======================================================

lokasiForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = lokasiName.value.trim();
    const type = lokasiType.value;
    const desc = lokasiDesc.value.trim();

    if (!name) { formMessage.textContent = "Nama lokasi wajib diisi."; return; }
    if (!type) { formMessage.textContent = "Tipe lokasi wajib dipilih."; return; }

    const isEdit = Boolean(lokasiIdInput.value);
    const url    = isEdit ? `${BASE_URL}/api/locations/${lokasiIdInput.value}` : `${BASE_URL}/api/locations`;
    const method = isEdit ? "PUT" : "POST";

    formMessage.textContent = "Menyimpan...";
    saveButton.disabled = true;

    try {
        const res  = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, type, description: desc || null })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal menyimpan lokasi");
        formMessage.textContent = isEdit ? "Lokasi berhasil diperbarui." : "Lokasi berhasil ditambahkan.";
        await loadLokasi();
        setTimeout(closeModal, 500);
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal menyimpan lokasi.";
    } finally {
        saveButton.disabled = false;
    }
});

// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "./index.html";
});

// ======================================================
// INIT
// ======================================================

async function init() {
    try {
        await loadUser();
        await loadLokasi();
    } catch (err) {
        console.error(err);
        lokasiTableBody.innerHTML = "<tr><td colspan='4'>Gagal memuat data lokasi.</td></tr>";
    }
}

init();
