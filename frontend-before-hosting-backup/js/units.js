const token = localStorage.getItem("token");

const userName       = document.getElementById("userName");
const unitsTableBody = document.getElementById("unitsTableBody");
const searchInput    = document.getElementById("searchInput");
const addUnitButton  = document.getElementById("addUnitButton");
const unitModal      = document.getElementById("unitModal");
const closeModalButton = document.getElementById("closeModalButton");
const cancelButton   = document.getElementById("cancelButton");
const unitForm       = document.getElementById("unitForm");
const unitIdInput    = document.getElementById("unitId");
const unitName       = document.getElementById("unitName");
const unitSymbol     = document.getElementById("unitSymbol");
const modalTitle     = document.getElementById("modalTitle");
const formMessage    = document.getElementById("formMessage");
const saveButton     = document.getElementById("saveButton");
const logoutButton   = document.getElementById("logoutButton");

let unitsData = [];

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
// LOAD UNITS
// ======================================================

async function loadUnits() {
    const res  = await fetch(`${BASE_URL}/api/units`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data satuan");
    unitsData = data;
    renderUnits();
}

// ======================================================
// RENDER
// ======================================================

function renderUnits() {
    const keyword = searchInput.value.trim().toLowerCase();
    const filtered = unitsData.filter(u =>
        u.name.toLowerCase().includes(keyword) ||
        u.symbol.toLowerCase().includes(keyword)
    );

    unitsTableBody.innerHTML = "";

    if (filtered.length === 0) {
        unitsTableBody.innerHTML = "<tr><td colspan='3'>Tidak ada satuan yang ditemukan.</td></tr>";
        return;
    }

    filtered.forEach(unit => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${unit.name}</td>
            <td>${unit.symbol}</td>
            <td><button type="button" class="edit-button" data-id="${unit.id}">Edit</button></td>
        `;
        unitsTableBody.appendChild(row);
    });

    unitsTableBody.querySelectorAll(".edit-button").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
}

// ======================================================
// MODAL
// ======================================================

function openAddModal() {
    modalTitle.textContent = "Tambah Satuan";
    unitIdInput.value = "";
    unitName.value = "";
    unitSymbol.value = "";
    formMessage.textContent = "";
    unitModal.classList.remove("hidden");
}

function openEditModal(id) {
    const unit = unitsData.find(item => String(item.id) === String(id));
    if (!unit) return;
    modalTitle.textContent = "Edit Satuan";
    unitIdInput.value = unit.id;
    unitName.value = unit.name;
    unitSymbol.value = unit.symbol;
    formMessage.textContent = "";
    unitModal.classList.remove("hidden");
}

function closeUnitModal() {
    unitModal.classList.add("hidden");
    formMessage.textContent = "";
}

addUnitButton.addEventListener("click", openAddModal);
closeModalButton.addEventListener("click", closeUnitModal);
cancelButton.addEventListener("click", closeUnitModal);
searchInput.addEventListener("input", renderUnits);

// ======================================================
// SAVE UNIT
// ======================================================

unitForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name   = unitName.value.trim();
    const symbol = unitSymbol.value.trim().toUpperCase();

    if (!name || !symbol) {
        formMessage.textContent = "Nama dan symbol wajib diisi.";
        return;
    }

    const isEdit = Boolean(unitIdInput.value);
    const url    = isEdit ? `${BASE_URL}/api/units/${unitIdInput.value}` : `${BASE_URL}/api/units`;
    const method = isEdit ? "PUT" : "POST";

    formMessage.textContent = "Menyimpan...";
    saveButton.disabled = true;

    try {
        const res  = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, symbol })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal menyimpan satuan");
        formMessage.textContent = isEdit ? "Satuan berhasil diperbarui." : "Satuan berhasil ditambahkan.";
        await loadUnits();
        setTimeout(closeUnitModal, 500);
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal menyimpan satuan.";
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
        await loadUnits();
    } catch (err) {
        console.error(err);
        unitsTableBody.innerHTML = "<tr><td colspan='3'>Gagal mengambil data satuan.</td></tr>";
    }
}

init();
