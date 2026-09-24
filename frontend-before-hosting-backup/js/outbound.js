const token = localStorage.getItem("token");

const userName            = document.getElementById("userName");
const outboundForm        = document.getElementById("outboundForm");
const invoiceNumber       = document.getElementById("invoiceNumber");
const customerName        = document.getElementById("customerName");
const transactionDate     = document.getElementById("transactionDate");
const destination         = document.getElementById("destination");
const outboundNotes       = document.getElementById("outboundNotes");
const productSearch       = document.getElementById("productSearch");
const selectedProductId   = document.getElementById("selectedProductId");
const productResults      = document.getElementById("productResults");
const selectedProductInfo = document.getElementById("selectedProductInfo");
const itemQuantity        = document.getElementById("itemQuantity");
const itemNotes           = document.getElementById("itemNotes");
const addItemButton       = document.getElementById("addItemButton");
const itemsTableBody      = document.getElementById("itemsTableBody");
const outboundHistoryBody = document.getElementById("outboundHistoryBody");
const submitButton        = document.getElementById("submitButton");
const formMessage         = document.getElementById("formMessage");
const logoutButton        = document.getElementById("logoutButton");

let products     = [];
let outboundItems = [];

// ======================================================
// HELPERS
// ======================================================

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("id-ID");
}

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
// LOAD PRODUCTS
// ======================================================

async function loadProducts() {
    const data = await apiRequest(`${BASE_URL}/api/products`);
    if (!Array.isArray(data)) throw new Error("Format data produk tidak valid");
    products = data;
}

// ======================================================
// PRODUCT SEARCH
// ======================================================

function searchProducts(keyword) {
    const q = keyword.trim().toLowerCase();
    if (!q) { productResults.innerHTML = ""; productResults.classList.add("hidden"); return; }

    const results = products.filter(p =>
        String(p.code || "").toLowerCase().includes(q) ||
        String(p.name || "").toLowerCase().includes(q)
    ).slice(0, 10);

    productResults.innerHTML = "";

    if (results.length === 0) {
        productResults.innerHTML = "<div class='product-result'>Barang tidak ditemukan.</div>";
        productResults.classList.remove("hidden");
        return;
    }

    results.forEach(product => {
        const div = document.createElement("div");
        div.className = "product-result";
        div.innerHTML = `<strong>${escapeHtml(product.code || "-")}</strong><br>${escapeHtml(product.name || "-")}`;
        div.addEventListener("click", () => selectProduct(product));
        productResults.appendChild(div);
    });

    productResults.classList.remove("hidden");
}

function selectProduct(product) {
    selectedProductId.value = product.id;
    productSearch.value = `${product.code || ""} - ${product.name || ""}`;
    selectedProductInfo.innerHTML = `<strong>${escapeHtml(product.name || "-")}</strong><br>Kode: ${escapeHtml(product.code || "-")}`;
    selectedProductInfo.classList.remove("hidden");
    productResults.innerHTML = "";
    productResults.classList.add("hidden");
}

function clearProductSelection() {
    selectedProductId.value = "";
    productSearch.value = "";
    selectedProductInfo.innerHTML = "";
    selectedProductInfo.classList.add("hidden");
}

productSearch.addEventListener("input", () => searchProducts(productSearch.value));
productSearch.addEventListener("focus", () => { if (productSearch.value.trim()) searchProducts(productSearch.value); });

// ======================================================
// ITEMS
// ======================================================

function addItem() {
    const productId = selectedProductId.value;
    const quantity  = Number(itemQuantity.value);
    const notes     = itemNotes.value.trim();

    if (!productId) { formMessage.textContent = "Pilih barang jadi terlebih dahulu."; return; }
    if (!quantity || quantity <= 0) { formMessage.textContent = "Jumlah barang harus lebih dari 0."; return; }

    const product = products.find(item => String(item.id) === String(productId));
    if (!product) { formMessage.textContent = "Produk tidak ditemukan."; return; }

    if (outboundItems.find(item => String(item.product_id) === String(product.id))) {
        formMessage.textContent = "Barang tersebut sudah ada di daftar.";
        return;
    }

    outboundItems.push({ product_id: product.id, code: product.code, name: product.name, quantity, notes });
    renderItems();
    clearProductSelection();
    itemQuantity.value = "";
    itemNotes.value = "";
    formMessage.textContent = "Barang berhasil ditambahkan.";
}

function renderItems() {
    itemsTableBody.innerHTML = "";
    if (outboundItems.length === 0) {
        itemsTableBody.innerHTML = "<tr><td colspan='5'>Belum ada barang ditambahkan.</td></tr>";
        return;
    }
    outboundItems.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(item.code || "-")}</td>
            <td>${escapeHtml(item.name || "-")}</td>
            <td>${item.quantity}</td>
            <td>${escapeHtml(item.notes || "-")}</td>
            <td><button type="button" class="remove-item-button" data-index="${index}">Hapus</button></td>
        `;
        itemsTableBody.appendChild(row);
    });
}

itemsTableBody.addEventListener("click", event => {
    const btn = event.target.closest(".remove-item-button");
    if (!btn) return;
    outboundItems.splice(Number(btn.dataset.index), 1);
    renderItems();
});

addItemButton.addEventListener("click", addItem);

// ======================================================
// CREATE OUTBOUND
// ======================================================

async function createOutbound(event) {
    event.preventDefault();

    if (outboundItems.length === 0) { formMessage.textContent = "Minimal satu barang harus ditambahkan."; return; }

    const payload = {
        invoice_number:   invoiceNumber.value.trim(),
        customer_name:    customerName.value.trim(),
        transaction_date: transactionDate.value,
        destination:      destination.value.trim(),
        notes:            outboundNotes.value.trim(),
        items: outboundItems.map(item => ({ product_id: item.product_id, quantity: item.quantity, notes: item.notes || null }))
    };

    submitButton.disabled = true;
    formMessage.textContent = "Menyimpan outbound...";

    try {
        const result = await apiRequest(`${BASE_URL}/api/outbound-orders`, { method: "POST", body: JSON.stringify(payload) });
        formMessage.textContent = result.message || "Outbound berhasil dibuat.";
        outboundForm.reset();
        outboundItems = [];
        clearProductSelection();
        renderItems();
        setDefaultDate();
        await loadOutboundHistory();
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal membuat outbound.";
    } finally {
        submitButton.disabled = false;
    }
}

outboundForm.addEventListener("submit", createOutbound);

// ======================================================
// HISTORY
// ======================================================

async function loadOutboundHistory() {
    outboundHistoryBody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";
    const data = await apiRequest(`${BASE_URL}/api/outbound-orders`);
    if (!Array.isArray(data)) throw new Error("Format data outbound tidak valid");

    outboundHistoryBody.innerHTML = "";

    if (data.length === 0) {
        outboundHistoryBody.innerHTML = "<tr><td colspan='8'>Belum ada outbound.</td></tr>";
        return;
    }

    data.forEach(order => {
        const row = document.createElement("tr");
        const notesText = order.notes ? escapeHtml(order.notes) : "-";

        row.innerHTML = `
            <td>${escapeHtml(order.invoice_number || "-")}</td>
            <td>${escapeHtml(order.customer_name || "-")}</td>
            <td>${formatDate(order.transaction_date)}</td>
            <td>${escapeHtml(order.destination || "-")}</td>
            <td><span class="status-badge status-${(order.status || "").toLowerCase()}">${escapeHtml(order.status || "-")}</span></td>
            <td class="notes-cell" data-id="${order.id}">
                <span class="notes-text">${notesText}</span>
                <div class="notes-edit hidden">
                    <textarea class="notes-textarea" rows="2">${order.notes ? escapeHtml(order.notes) : ""}</textarea>
                    <div class="notes-actions">
                        <button type="button" class="save-notes-button" data-id="${order.id}">Simpan</button>
                        <button type="button" class="cancel-notes-button">Batal</button>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(order.created_by_name || "-")}</td>
            <td>
                <button type="button" class="edit-notes-button" data-id="${order.id}">Edit Catatan</button>
            </td>
        `;
        outboundHistoryBody.appendChild(row);
    });
}

// ======================================================
// CATATAN INLINE
// ======================================================

async function saveOutboundNotes(orderId, notesValue) {
    return await apiRequest(`${BASE_URL}/api/outbound-orders/${orderId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notesValue })
    });
}

outboundHistoryBody.addEventListener("click", async event => {
    const editButton = event.target.closest(".edit-notes-button");
    if (editButton) {
        const id   = editButton.dataset.id;
        const cell = outboundHistoryBody.querySelector(`.notes-cell[data-id="${id}"]`);
        if (!cell) return;
        cell.querySelector(".notes-text").classList.add("hidden");
        cell.querySelector(".notes-edit").classList.remove("hidden");
        editButton.classList.add("hidden");
        return;
    }

    const cancelBtn = event.target.closest(".cancel-notes-button");
    if (cancelBtn) {
        const cell = cancelBtn.closest(".notes-cell");
        if (!cell) return;
        const id = cell.dataset.id;
        cell.querySelector(".notes-text").classList.remove("hidden");
        cell.querySelector(".notes-edit").classList.add("hidden");
        const editBtn = outboundHistoryBody.querySelector(`.edit-notes-button[data-id="${id}"]`);
        if (editBtn) editBtn.classList.remove("hidden");
        return;
    }

    const saveBtn = event.target.closest(".save-notes-button");
    if (!saveBtn) return;

    const id       = saveBtn.dataset.id;
    const cell     = outboundHistoryBody.querySelector(`.notes-cell[data-id="${id}"]`);
    if (!cell) return;
    const textarea = cell.querySelector(".notes-textarea");
    const newNotes = textarea.value.trim();

    saveBtn.disabled    = true;
    saveBtn.textContent = "Menyimpan...";

    try {
        await saveOutboundNotes(id, newNotes);
        cell.querySelector(".notes-text").textContent = newNotes || "-";
        cell.querySelector(".notes-text").classList.remove("hidden");
        cell.querySelector(".notes-edit").classList.add("hidden");
        const editBtn = outboundHistoryBody.querySelector(`.edit-notes-button[data-id="${id}"]`);
        if (editBtn) editBtn.classList.remove("hidden");
        formMessage.textContent = "Catatan berhasil disimpan.";
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal menyimpan catatan.";
    } finally {
        saveBtn.disabled    = false;
        saveBtn.textContent = "Simpan";
    }
});

// ======================================================
// DATE DEFAULT
// ======================================================

function setDefaultDate() {
    const now   = new Date();
    const y     = now.getFullYear();
    const m     = String(now.getMonth() + 1).padStart(2, "0");
    const d     = String(now.getDate()).padStart(2, "0");
    transactionDate.value = `${y}-${m}-${d}`;
}

// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
});

// ======================================================
// INIT
// ======================================================

async function init() {
    try {
        setDefaultDate();
        renderItems();
        await loadUser();
        await loadProducts();
        await loadOutboundHistory();
    } catch (err) {
        console.error(err);
        formMessage.textContent = err.message || "Gagal memuat halaman Outbound.";
    }
}

init();
