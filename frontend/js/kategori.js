const token = localStorage.getItem("token");

const userName          = document.getElementById("userName");
const kategoriTableBody = document.getElementById("kategoriTableBody");
const searchInput       = document.getElementById("searchInput");
const addKategoriButton = document.getElementById("addKategoriButton");
const kategoriModal     = document.getElementById("kategoriModal");
const closeModalButton  = document.getElementById("closeModalButton");
const cancelButton      = document.getElementById("cancelButton");
const kategoriForm      = document.getElementById("kategoriForm");
const kategoriIdInput   = document.getElementById("kategoriId");
const kategoriName      = document.getElementById("kategoriName");
const kategoriDesc      = document.getElementById("kategoriDesc");
const modalTitle        = document.getElementById("modalTitle");
const formMessage       = document.getElementById("formMessage");
const saveButton        = document.getElementById("saveButton");
const logoutButton      = document.getElementById("logoutButton");

let kategoriData = [];

function escapeHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {
    const res  = await fetch(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data user");
    userName.textContent = data.user.name;
}

// ======================================================
// LOAD KATEGORI
// ======================================================

async function loadKategori() {
    const res  = await fetch(`${BASE_URL}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data kategori");
    kategoriData = data;
    renderKategori();
}

// ======================================================
// RENDER
// ======================================================

function renderKategori() {
    const keyword = searchInput.value.trim().toLowerCase();
    const filtered = kategoriData.filter(k =>
        k.name.toLowerCase().includes(keyword) ||
        (k.description || "").toLowerCase().includes(keyword)
    );

    kategoriTableBody.innerHTML = "";

    if (filtered.length === 0) {
        kategoriTableBody.innerHTML = "<tr><td colspan='3'>Tidak ada kategori yang ditemukan.</td></tr>";
        return;
    }

    filtered.forEach(k => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(k.name)}</td>
            <td>${escapeHtml(k.description || "-")}</td>
            <td><button type="button" class="edit-button" data-id="${k.id}">Edit</button></td>
        `;
        kategoriTableBody.appendChild(tr);
    });

    kategoriTableBody.querySelectorAll(".edit-button").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
}

// ======================================================
// MODAL
// ======================================================

function openAddModal() {
    modalTitle.textContent  = "Tambah Kategori";
    kategoriIdInput.value   = "";
    kategoriName.value      = "";
    kategoriDesc.value      = "";
    formMessage.textContent = "";
    kategoriModal.classList.remove("hidden");
    kategoriName.focus();
}

function openEditModal(id) {
    const k = kategoriData.find(x => String(x.id) === String(id));
    if (!k) return;
    modalTitle.textContent  = "Edit Kategori";
    kategoriIdInput.value   = k.id;
    kategoriName.value      = k.name;
    kategoriDesc.value      = k.description || "";
    formMessage.textContent = "";
    kategoriModal.classList.remove("hidden");
    kategoriName.focus();
}

function closeModal() {
    kategoriModal.classList.add("hidden");
    formMessage.textContent = "";
}

addKategoriButton.addEventListener("click", openAddModal);
closeModalButton.addEventListener("click", closeModal);
cancelButton.addEventListener("click", closeModal);
searchInput.addEventListener("input", renderKategori);

// ======================================================
// SAVE
// ======================================================

kategoriForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = kategoriName.value.trim();
    const desc = kategoriDesc.value.trim();

    if (!name) {
        formMessage.textContent = "Nama kategori wajib diisi.";
        return;
    }

    const isEdit = Boolean(kategoriIdInput.value);
    const url    = isEdit ? `${BASE_URL}/api/categories/${kategoriIdInput.value}` : `${BASE_URL}/api/categories`;
    const method = isEdit ? "PUT" : "POST";

    formMessage.textContent = "Menyimpan...";
    saveButton.disabled = true;

    try {
        const res  = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, description: desc || null })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal menyimpan kategori");
        formMessage.textContent = isEdit ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.";
        await loadKategori();
        setTimeout(closeModal, 500);
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal menyimpan kategori.";
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
        await loadKategori();
    } catch (err) {
        console.error(err);
        kategoriTableBody.innerHTML = "<tr><td colspan='3'>Gagal memuat data kategori.</td></tr>";
    }
}

init();
