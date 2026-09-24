const userName             = document.getElementById("userName");
const supplierTableBody    = document.getElementById("supplierTableBody");
const supplierFormSection  = document.getElementById("supplierFormSection");
const supplierForm         = document.getElementById("supplierForm");
const supplierId           = document.getElementById("supplierId");
const supplierName         = document.getElementById("supplierName");
const supplierContact      = document.getElementById("supplierContact");
const supplierAddress      = document.getElementById("supplierAddress");
const supplierPicName      = document.getElementById("supplierPicName");
const supplierPicPhone     = document.getElementById("supplierPicPhone");
const supplierNotes        = document.getElementById("supplierNotes");
const addSupplierButton    = document.getElementById("addSupplierButton");
const cancelSupplierButton = document.getElementById("cancelSupplierButton");
const saveSupplierButton   = document.getElementById("saveSupplierButton");
const formTitle            = document.getElementById("formTitle");
const formMessage          = document.getElementById("formMessage");
const logoutButton         = document.getElementById("logoutButton");

const token = localStorage.getItem("token");

let suppliersData = [];

// ======================================================
// API HELPER
// ======================================================

async function apiRequest(url, options = {}) {
    const res  = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Terjadi kesalahan pada server");
    return data;
}

// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {
    const data = await apiRequest(`${BASE_URL}/api/me`);
    userName.textContent = data.user?.name || data.name || "User";
}

// ======================================================
// LOAD SUPPLIERS
// ======================================================

async function loadSuppliers() {
    supplierTableBody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";
    const data = await apiRequest(`${BASE_URL}/api/suppliers`);
    if (!Array.isArray(data)) throw new Error("Format data supplier tidak valid");
    suppliersData = data;
    renderSuppliers();
}

// ======================================================
// RENDER
// ======================================================

function renderSuppliers() {
    supplierTableBody.innerHTML = "";

    if (suppliersData.length === 0) {
        supplierTableBody.innerHTML = "<tr><td colspan='7'>Belum ada supplier.</td></tr>";
        return;
    }

    suppliersData.forEach(supplier => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${supplier.name || "-"}</td>
            <td>${supplier.contact || "-"}</td>
            <td>${supplier.address || "-"}</td>
            <td>${supplier.pic_name || "-"}</td>
            <td>${supplier.pic_phone || "-"}</td>
            <td>${supplier.notes || "-"}</td>
            <td><button type="button" class="edit-button" data-id="${supplier.id}">Edit</button></td>
        `;
        supplierTableBody.appendChild(row);
    });
}

// ======================================================
// FORM OPEN/CLOSE
// ======================================================

function openAddForm() {
    supplierForm.reset();
    supplierId.value = "";
    formTitle.textContent = "Tambah Supplier";
    saveSupplierButton.textContent = "Simpan Supplier";
    formMessage.textContent = "";
    supplierFormSection.classList.remove("hidden");
}

function openEditForm(id) {
    const supplier = suppliersData.find(item => String(item.id) === String(id));
    if (!supplier) return;
    supplierId.value = supplier.id;
    supplierName.value = supplier.name || "";
    supplierContact.value = supplier.contact || "";
    supplierAddress.value = supplier.address || "";
    supplierPicName.value = supplier.pic_name || "";
    supplierPicPhone.value = supplier.pic_phone || "";
    supplierNotes.value = supplier.notes || "";
    formTitle.textContent = "Edit Supplier";
    saveSupplierButton.textContent = "Simpan Perubahan";
    formMessage.textContent = "";
    supplierFormSection.classList.remove("hidden");
    supplierFormSection.scrollIntoView({ behavior: "smooth" });
}

function closeForm() {
    supplierForm.reset();
    supplierId.value = "";
    formMessage.textContent = "";
    supplierFormSection.classList.add("hidden");
}

// ======================================================
// SAVE SUPPLIER
// ======================================================

async function saveSupplier(event) {
    event.preventDefault();

    try {
        formMessage.textContent = "Menyimpan supplier...";

        const id = supplierId.value.trim();
        const payload = {
            name:      supplierName.value.trim(),
            contact:   supplierContact.value.trim(),
            address:   supplierAddress.value.trim(),
            pic_name:  supplierPicName.value.trim(),
            pic_phone: supplierPicPhone.value.trim(),
            notes:     supplierNotes.value.trim()
        };

        const result = id
            ? await apiRequest(`${BASE_URL}/api/suppliers/${id}`, { method: "PUT",  body: JSON.stringify(payload) })
            : await apiRequest(`${BASE_URL}/api/suppliers`,       { method: "POST", body: JSON.stringify(payload) });

        formMessage.textContent = result.message || "Supplier berhasil disimpan.";
        await loadSuppliers();
        setTimeout(closeForm, 500);
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal menyimpan supplier.";
    }
}

// ======================================================
// EVENTS
// ======================================================

supplierTableBody.addEventListener("click", event => {
    const btn = event.target.closest(".edit-button");
    if (btn) openEditForm(btn.dataset.id);
});

addSupplierButton.addEventListener("click", openAddForm);
cancelSupplierButton.addEventListener("click", closeForm);
supplierForm.addEventListener("submit", saveSupplier);

logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
});

// ======================================================
// INIT
// ======================================================

async function init() {
    try {
        await loadUser();
        await loadSuppliers();
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal memuat halaman Supplier.";
    }
}

init();
