const token = localStorage.getItem("token");

const userName = document.getElementById("userName");
const productsTableBody = document.getElementById("productsTableBody");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const logoutButton = document.getElementById("logoutButton");
const editModal = document.getElementById("editModal");
const closeModalButton = document.getElementById("closeModalButton");
const cancelButton = document.getElementById("cancelButton");
const editProductForm = document.getElementById("editProductForm");
const editProductId = document.getElementById("editProductId");
const editCode = document.getElementById("editCode");
const editName = document.getElementById("editName");
const editCategory = document.getElementById("editCategory");
const editUnit = document.getElementById("editUnit");
const editLocation = document.getElementById("editLocation");
const editMinimumStock = document.getElementById("editMinimumStock");
const editDescription = document.getElementById("editDescription");
const formMessage = document.getElementById("formMessage");
const saveButton = document.getElementById("saveButton");
const addProductButton = document.getElementById("addProductButton");
const addModal = document.getElementById("addModal");
const closeAddModalButton = document.getElementById("closeAddModalButton");
const cancelAddButton = document.getElementById("cancelAddButton");
const addProductForm = document.getElementById("addProductForm");
const addCode = document.getElementById("addCode");
const addName = document.getElementById("addName");
const addCategory = document.getElementById("addCategory");
const addUnit = document.getElementById("addUnit");
const addLocation = document.getElementById("addLocation");
const addMinimumStock = document.getElementById("addMinimumStock");
const addDescription = document.getElementById("addDescription");
const addFormMessage = document.getElementById("addFormMessage");
const addSaveButton = document.getElementById("addSaveButton");

let productsData = [];
let categoriesData = [];
let unitsData = [];
let locationsData = [];

// Cek role user — hanya admin_utama yang bisa hapus/tambah/edit
const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
const isAdminUtama = currentUser.role === "admin_utama";

function formatQuantity(value) {
    return Number(value).toLocaleString("id-ID", { maximumFractionDigits: 3 });
}

// ======================================================
// LOAD ADD FORM DATA
// ======================================================

async function loadAddFormData() {
    try {
        addCategory.innerHTML = "<option value=''>Memuat kategori...</option>";
        addUnit.innerHTML = "<option value=''>Memuat satuan...</option>";
        addLocation.innerHTML = "<option value=''>Memuat lokasi...</option>";

        const headers = { Authorization: `Bearer ${token}` };
        const [catRes, unitRes, locRes] = await Promise.all([
            fetch(`${BASE_URL}/api/categories`, { method: "GET", headers }),
            fetch(`${BASE_URL}/api/units`,      { method: "GET", headers }),
            fetch(`${BASE_URL}/api/locations`,  { method: "GET", headers })
        ]);

        const catData  = await catRes.json();
        const unitData = await unitRes.json();
        const locData  = await locRes.json();

        if (!catRes.ok)  throw new Error(catData.message  || "Gagal mengambil kategori");
        if (!unitRes.ok) throw new Error(unitData.message || "Gagal mengambil satuan");
        if (!locRes.ok)  throw new Error(locData.message  || "Gagal mengambil lokasi");

        addCategory.innerHTML = "<option value=''>Pilih kategori</option>";
        catData.forEach(c => {
            const o = document.createElement("option");
            o.value = c.id; o.textContent = c.name;
            addCategory.appendChild(o);
        });

        addUnit.innerHTML = "<option value=''>Pilih satuan</option>";
        unitData.forEach(u => {
            const o = document.createElement("option");
            o.value = u.id;
            o.textContent = u.symbol ? `${u.name} (${u.symbol})` : u.name;
            addUnit.appendChild(o);
        });

        addLocation.innerHTML = "<option value=''>Pilih lokasi (opsional)</option>";
        locData.forEach(l => {
            const o = document.createElement("option");
            o.value = l.id; o.textContent = l.name;
            addLocation.appendChild(o);
        });
    } catch (err) {
        console.error(err);
        addFormMessage.textContent = err.message || "Gagal memuat data form.";
    }
}

// ======================================================
// ADD MODAL
// ======================================================

addProductButton.addEventListener("click", async () => {
    addFormMessage.textContent = "";
    addProductForm.reset();
    addMinimumStock.value = "0";
    addModal.classList.remove("hidden");
    await loadAddFormData();
});

function closeAddModal() {
    addModal.classList.add("hidden");
    addFormMessage.textContent = "";
    addProductForm.reset();
    addMinimumStock.value = "0";
}

closeAddModalButton.addEventListener("click", closeAddModal);
cancelAddButton.addEventListener("click", closeAddModal);

// ======================================================
// SAVE ADD PRODUCT
// ======================================================

addProductForm.addEventListener("submit", async event => {
    event.preventDefault();

    const payload = {
        code: addCode.value.trim(),
        name: addName.value.trim(),
        category_id: Number(addCategory.value),
        unit_id: Number(addUnit.value),
        default_location_id: addLocation.value ? Number(addLocation.value) : null,
        minimum_stock: Number(addMinimumStock.value),
        description: addDescription.value.trim()
    };

    if (!payload.code) { addFormMessage.textContent = "Kode barang wajib diisi."; return; }
    if (!payload.name) { addFormMessage.textContent = "Nama barang wajib diisi."; return; }
    if (!Number.isInteger(payload.category_id) || payload.category_id <= 0) { addFormMessage.textContent = "Kategori wajib dipilih."; return; }
    if (!Number.isInteger(payload.unit_id) || payload.unit_id <= 0) { addFormMessage.textContent = "Satuan wajib dipilih."; return; }
    if (!Number.isFinite(payload.minimum_stock) || payload.minimum_stock < 0) { addFormMessage.textContent = "Batas minimum harus 0 atau lebih."; return; }

    addFormMessage.textContent = "Menyimpan produk...";
    addSaveButton.disabled = true;

    try {
        const res  = await fetch(`${BASE_URL}/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal menambahkan produk");
        addFormMessage.textContent = "Produk berhasil ditambahkan.";
        await loadProducts();
        setTimeout(closeAddModal, 500);
    } catch (err) {
        console.error(err);
        addFormMessage.textContent = err.message || "Gagal menambahkan produk.";
    } finally {
        addSaveButton.disabled = false;
    }
});

// ======================================================
// SAVE EDIT PRODUCT
// ======================================================

editProductForm.addEventListener("submit", async event => {
    event.preventDefault();

    const payload = {
        code: editCode.value.trim(),
        name: editName.value.trim(),
        category_id: Number(editCategory.value),
        unit_id: Number(editUnit.value),
        default_location_id: editLocation.value ? Number(editLocation.value) : null,
        minimum_stock: Number(editMinimumStock.value),
        description: editDescription.value.trim()
    };

    if (!payload.code) { formMessage.textContent = "Kode barang wajib diisi."; return; }
    if (!payload.name) { formMessage.textContent = "Nama barang wajib diisi."; return; }
    if (!Number.isInteger(payload.category_id) || payload.category_id <= 0) { formMessage.textContent = "Kategori wajib dipilih."; return; }
    if (!Number.isInteger(payload.unit_id) || payload.unit_id <= 0) { formMessage.textContent = "Satuan wajib dipilih."; return; }
    if (!Number.isFinite(payload.minimum_stock) || payload.minimum_stock < 0) { formMessage.textContent = "Batas minimum harus 0 atau lebih."; return; }

    formMessage.textContent = "Menyimpan perubahan...";
    saveButton.disabled = true;

    try {
        const res  = await fetch(`${BASE_URL}/api/products/${editProductId.value}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Gagal menyimpan perubahan produk");
        formMessage.textContent = "Perubahan berhasil disimpan.";
        await loadProducts();
        setTimeout(closeEditModal, 500);
    } catch (err) {
        console.error(err);
        formMessage.textContent = "ERROR: " + err.message;
    } finally {
        saveButton.disabled = false;
    }
});

// ======================================================
// DELETE PRODUCT (SOFT DELETE)
// ======================================================

async function deleteProduct(productId, productName) {
    if (!confirm(`Hapus produk "${productName}"?\n\nProduk tidak akan muncul lagi di daftar.`)) return;

    try {
        const res  = await fetch(`${BASE_URL}/api/products/${productId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal menghapus produk");
        await loadProducts();
    } catch (err) {
        console.error(err);
        alert("Gagal menghapus produk: " + err.message);
    }
}

// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {
    const res  = await fetch(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data user");
    userName.textContent = data.user.name;

    // Simpan user ke localStorage agar tersedia di cek role
    localStorage.setItem("user", JSON.stringify(data.user));
}

// ======================================================
// LOAD PRODUCTS
// ======================================================

async function loadProducts() {
    const res  = await fetch(`${BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil daftar produk");
    productsData = data;
    renderProducts();
}

async function loadCategories() {
    const res  = await fetch(`${BASE_URL}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data kategori");
    categoriesData = data;

    categoryFilter.innerHTML = "<option value=''>Semua Kategori</option>";
    editCategory.innerHTML = "<option value=''>Pilih kategori</option>";
    categoriesData.forEach(c => {
        const o = document.createElement("option");
        o.value = c.id; o.textContent = c.name;
        editCategory.appendChild(o);

        const filterOption = document.createElement("option");
        filterOption.value = c.id;
        filterOption.textContent = c.name;
        categoryFilter.appendChild(filterOption);
    });
}

async function loadUnits() {
    const res  = await fetch(`${BASE_URL}/api/units`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data satuan");
    unitsData = data;
    editUnit.innerHTML = "<option value=''>Pilih satuan</option>";
    unitsData.forEach(u => {
        const o = document.createElement("option");
        o.value = u.id;
        o.textContent = u.symbol ? `${u.name} (${u.symbol})` : u.name;
        editUnit.appendChild(o);
    });
}

async function loadLocationsForEdit() {
    const res  = await fetch(`${BASE_URL}/api/locations`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal mengambil data lokasi");
    locationsData = data;
    editLocation.innerHTML = "<option value=''>Pilih lokasi (opsional)</option>";
    locationsData.forEach(l => {
        const o = document.createElement("option");
        o.value = l.id; o.textContent = l.name;
        editLocation.appendChild(o);
    });
}

// ======================================================
// RENDER PRODUCTS
// ======================================================

function renderProducts() {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filtered = productsData.filter(p => {
        const matchesSearch =
            (p.code || "").toLowerCase().includes(keyword) ||
            (p.name || "").toLowerCase().includes(keyword);

        const matchesCategory =
            !selectedCategory ||
            String(p.category_id) === String(selectedCategory);

        return matchesSearch && matchesCategory;
    });

    productsTableBody.innerHTML = "";

    if (filtered.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="${isAdminUtama ? 6 : 5}">Tidak ada produk yang ditemukan.</td></tr>`;
        return;
    }

    filtered.forEach(product => {
        const row = document.createElement("tr");
        const deleteBtn = isAdminUtama
            ? `<button type="button" class="delete-button" data-id="${product.id}" data-name="${product.name}">Hapus</button>`
            : "";
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.category || "-"}</td>
            <td>${product.unit_symbol || "-"}</td>
            <td>${formatQuantity(product.minimum_stock)} ${product.unit_symbol || ""}</td>
            <td>
                <button type="button" class="edit-button" data-id="${product.id}">Edit</button>
                ${deleteBtn}
            </td>
        `;
        productsTableBody.appendChild(row);
    });

    productsTableBody.querySelectorAll(".edit-button").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });

    productsTableBody.querySelectorAll(".delete-button").forEach(btn => {
        btn.addEventListener("click", () => deleteProduct(btn.dataset.id, btn.dataset.name));
    });
}

// ======================================================
// OPEN/CLOSE EDIT MODAL
// ======================================================

function openEditModal(productId) {
    const product = productsData.find(item => String(item.id) === String(productId));
    if (!product) return;

    editProductId.value   = product.id;
    editCode.value        = product.code;
    editName.value        = product.name;
    editMinimumStock.value = product.minimum_stock;
    editDescription.value = product.description || "";
    editCategory.value    = String(product.category_id);
    editUnit.value        = String(product.unit_id);

    // Set lokasi setelah locationsData terisi
    editLocation.value = product.default_location_id ? String(product.default_location_id) : "";

    formMessage.textContent = "";
    editModal.classList.remove("hidden");
}

function closeEditModal() {
    editModal.classList.add("hidden");
    formMessage.textContent = "";
}

closeModalButton.addEventListener("click", closeEditModal);
cancelButton.addEventListener("click", closeEditModal);
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

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
        await Promise.all([loadCategories(), loadUnits(), loadLocationsForEdit()]);
        await loadProducts();
    } catch (err) {
        console.error(err);
        productsTableBody.innerHTML = "<tr><td colspan='6'>Gagal mengambil data produk.</td></tr>";
    }
}

init();
