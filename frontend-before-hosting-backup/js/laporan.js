const token = localStorage.getItem("token");

// ======================================================
// CEK TOKEN — ditangani oleh session.js
// ======================================================

// ======================================================
// ELEMENTS
// ======================================================

const userName          = document.getElementById("userName");
const periodType        = document.getElementById("periodType");
const dateFrom          = document.getElementById("dateFrom");
const dateTo            = document.getElementById("dateTo");
const customDateGroup   = document.getElementById("customDateGroup");
const customDateGroupTo = document.getElementById("customDateGroupTo");
const loadReportButton  = document.getElementById("loadReportButton");
const periodLabel       = document.getElementById("periodLabel");
const logoutButton      = document.getElementById("logoutButton");

// Tab
const tabButtons        = document.querySelectorAll(".tab-button");
const tabContents       = document.querySelectorAll(".tab-content");

// Barang masuk
const stockInBody       = document.getElementById("stockInBody");
const stockInSummary    = document.getElementById("stockInSummary");
const stockInPeriodDesc = document.getElementById("stockInPeriodDesc");

// Material issue
const materialIssueBody       = document.getElementById("materialIssueBody");
const materialIssueSummary    = document.getElementById("materialIssueSummary");
const materialIssuePeriodDesc = document.getElementById("materialIssuePeriodDesc");

// Outbound
const outboundBody       = document.getElementById("outboundBody");
const outboundSummary    = document.getElementById("outboundSummary");
const outboundPeriodDesc = document.getElementById("outboundPeriodDesc");


// ======================================================
// HELPERS
// ======================================================

function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID");
}

function formatQuantity(value) {
    return Number(value).toLocaleString("id-ID", {
        maximumFractionDigits: 3
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("`", "&#039;");
}

function toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}


// ======================================================
// HITUNG RANGE TANGGAL BERDASARKAN PERIODE
// ======================================================

function getDateRange(period) {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let from, to;

    if (period === "this_week") {

        // Mulai Senin minggu ini
        const day = today.getDay();
        const diffToMonday = (day === 0 ? -6 : 1 - day);
        from = new Date(today);
        from.setDate(today.getDate() + diffToMonday);
        to = new Date(today);

    } else if (period === "last_week") {

        const day = today.getDay();
        const diffToMonday = (day === 0 ? -6 : 1 - day);
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() + diffToMonday);
        from = new Date(thisMonday);
        from.setDate(thisMonday.getDate() - 7);
        to = new Date(thisMonday);
        to.setDate(thisMonday.getDate() - 1);

    } else if (period === "this_month") {

        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today);

    } else if (period === "last_month") {

        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);

    } else if (period === "last_3_months") {

        from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        to = new Date(today);

    } else if (period === "this_year") {

        from = new Date(today.getFullYear(), 0, 1);
        to = new Date(today);

    } else {

        // custom — baca dari input
        from = dateFrom.value ? new Date(dateFrom.value) : null;
        to   = dateTo.value   ? new Date(dateTo.value)   : null;

    }

    return {
        from: from ? toYMD(from) : null,
        to:   to   ? toYMD(to)   : null
    };
}

function buildPeriodLabel(from, to) {
    if (!from && !to) return "Semua waktu";
    if (from && to) {
        return `${formatDate(from)} — ${formatDate(to)}`;
    }
    if (from) return `Dari ${formatDate(from)}`;
    return `Sampai ${formatDate(to)}`;
}


// ======================================================
// TAB SWITCH
// ======================================================

tabButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.add("hidden"));

        btn.classList.add("active");

        const target = document.getElementById(`tab-${btn.dataset.tab}`);
        if (target) target.classList.remove("hidden");

    });

});


// ======================================================
// TOGGLE CUSTOM DATE INPUT
// ======================================================

function toggleCustomDateInputs() {

    const isCustom = periodType.value === "custom";

    customDateGroup.style.display   = isCustom ? "" : "none";
    customDateGroupTo.style.display = isCustom ? "" : "none";

}

periodType.addEventListener("change", toggleCustomDateInputs);

toggleCustomDateInputs();


// ======================================================
// SET DEFAULT TANGGAL
// ======================================================

function setDefaultDates() {

    const today = new Date();
    dateTo.value   = toYMD(today);

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFrom.value = toYMD(firstDay);

}

setDefaultDates();


// ======================================================
// API HELPER
// ======================================================

async function apiGet(url) {

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Terjadi kesalahan pada server");
    }

    return data;

}

function buildQuery(from, to) {
    const params = new URLSearchParams();
    if (from) params.set("date_from", from);
    if (to)   params.set("date_to",   to);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}


// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {

    const data = await apiGet(`${BASE_URL}/api/me`);
    userName.textContent = data.user?.name || data.name || "User";

}


// ======================================================
// RENDER — BARANG MASUK
// ======================================================

function renderStockIn(rows, periodDesc) {

    stockInPeriodDesc.textContent = periodDesc;

    stockInBody.innerHTML = "";

    if (rows.length === 0) {
        stockInBody.innerHTML = `
            <tr>
                <td colspan="9">Tidak ada data barang masuk pada periode ini.</td>
            </tr>`;
        stockInSummary.innerHTML = buildSummaryBadge("0", "Total Transaksi");
        return;
    }

    // Hitung ringkasan per barang
    const byProduct = {};
    rows.forEach(row => {
        const key = row.code || row.name;
        if (!byProduct[key]) {
            byProduct[key] = { name: row.name, unit: row.unit_symbol || row.unit || "", qty: 0 };
        }
        byProduct[key].qty += Number(row.quantity);
    });

    stockInSummary.innerHTML =
        buildSummaryBadge(rows.length, "Total Transaksi") +
        buildSummaryBadge(Object.keys(byProduct).length, "Jenis Barang");

    rows.forEach(row => {
        const tr = document.createElement("tr");
        const cells = [
            { label: "Tanggal",    value: formatDate(row.transaction_date) },
            { label: "Kode",       value: row.code || "-" },
            { label: "Nama",       value: row.name || "-" },
            { label: "Jumlah",     value: formatQuantity(row.quantity) },
            { label: "Satuan",     value: row.unit_symbol || row.unit || "-" },
            { label: "Supplier",   value: row.supplier_name || "-" },
            { label: "Invoice",    value: row.invoice_number || "-" },
            { label: "Catatan",    value: row.notes || "-" },
            { label: "Dibuat",     value: row.created_by || "-" }
        ];
        tr.innerHTML = cells.map(c =>
            `<td data-label="${escapeHtml(c.label)}"${c.value === "-" ? ' data-empty="true"' : ""}>${escapeHtml(c.value)}</td>`
        ).join("");
        stockInBody.appendChild(tr);
    });

}


// ======================================================
// RENDER — MATERIAL ISSUE
// ======================================================

function renderMaterialIssue(rows, periodDesc) {

    materialIssuePeriodDesc.textContent = periodDesc;

    materialIssueBody.innerHTML = "";

    if (rows.length === 0) {
        materialIssueBody.innerHTML = `
            <tr>
                <td colspan="9">Tidak ada data material issue pada periode ini.</td>
            </tr>`;
        materialIssueSummary.innerHTML = buildSummaryBadge("0", "Total Dokumen");
        return;
    }

    // Hitung jumlah dokumen unik
    const uniqueDocs = new Set(rows.map(r => r.issue_number));

    materialIssueSummary.innerHTML =
        buildSummaryBadge(uniqueDocs.size, "Total Dokumen") +
        buildSummaryBadge(rows.length, "Total Baris");

    rows.forEach(row => {
        const tr = document.createElement("tr");
        const cells = [
            { label: "No. MI",    value: row.issue_number || "-" },
            { label: "Tanggal",   value: formatDate(row.issue_date) },
            { label: "Tim",       value: row.team_name || "-" },
            { label: "Kode",      value: row.code || "-" },
            { label: "Nama",      value: row.name || "-" },
            { label: "Jumlah",    value: formatQuantity(row.quantity) },
            { label: "Satuan",    value: row.unit_symbol || row.unit || "-" },
            { label: "Tujuan",    value: row.purpose || "-" },
            { label: "Dibuat",    value: row.created_by || "-" }
        ];
        tr.innerHTML = cells.map(c =>
            `<td data-label="${escapeHtml(c.label)}"${c.value === "-" ? ' data-empty="true"' : ""}>${escapeHtml(c.value)}</td>`
        ).join("");
        materialIssueBody.appendChild(tr);
    });

}


// ======================================================
// RENDER — OUTBOUND
// ======================================================

function renderOutbound(rows, periodDesc) {

    outboundPeriodDesc.textContent = periodDesc;

    outboundBody.innerHTML = "";

    if (rows.length === 0) {
        outboundBody.innerHTML = `
            <tr>
                <td colspan="10">Tidak ada data outbound pada periode ini.</td>
            </tr>`;
        outboundSummary.innerHTML = buildSummaryBadge("0", "Total Invoice");
        return;
    }

    const uniqueInvoices = new Set(rows.map(r => r.invoice_number));

    outboundSummary.innerHTML =
        buildSummaryBadge(uniqueInvoices.size, "Total Invoice") +
        buildSummaryBadge(rows.length, "Total Baris");

    rows.forEach(row => {
        const tr = document.createElement("tr");
        const cells = [
            { label: "Invoice",    value: row.invoice_number || "-" },
            { label: "Tanggal",    value: formatDate(row.transaction_date) },
            { label: "Customer",   value: row.customer_name || "-" },
            { label: "Tujuan",     value: row.destination || "-" },
            { label: "Kode",       value: row.code || "-" },
            { label: "Nama",       value: row.name || "-" },
            { label: "Jumlah",     value: formatQuantity(row.quantity) },
            { label: "Satuan",     value: row.unit_symbol || row.unit || "-" },
            { label: "Catatan",    value: row.item_notes || row.doc_notes || "-" },
            { label: "Dibuat",     value: row.created_by || "-" }
        ];
        tr.innerHTML = cells.map(c =>
            `<td data-label="${escapeHtml(c.label)}"${c.value === "-" ? ' data-empty="true"' : ""}>${escapeHtml(c.value)}</td>`
        ).join("");
        outboundBody.appendChild(tr);
    });

}


// ======================================================
// SUMMARY BADGE HELPER
// ======================================================

function buildSummaryBadge(value, label) {
    return `
        <div class="summary-badge">
            <strong>${escapeHtml(String(value))}</strong>
            <span>${escapeHtml(label)}</span>
        </div>`;
}


// ======================================================
// LOAD SEMUA LAPORAN
// ======================================================

async function loadReports() {

    const period = periodType.value;
    const { from, to } = getDateRange(period);

    if (period === "custom" && !from && !to) {
        periodLabel.textContent = "Pilih setidaknya satu tanggal untuk periode kustom.";
        return;
    }

    const periodDesc = buildPeriodLabel(from, to);
    periodLabel.textContent = `Menampilkan data: ${periodDesc}`;

    loadReportButton.disabled    = true;
    loadReportButton.textContent = "Memuat...";

    const qs = buildQuery(from, to);

    // Set loading state tiap tabel
    stockInBody.innerHTML = `<tr><td colspan="9">Memuat...</td></tr>`;
    materialIssueBody.innerHTML = `<tr><td colspan="9">Memuat...</td></tr>`;
    outboundBody.innerHTML = `<tr><td colspan="10">Memuat...</td></tr>`;

    try {

        const [stockInData, materialIssueData, outboundData] =
            await Promise.all([
                apiGet(`${BASE_URL}/api/reports/stock-in${qs}`),
                apiGet(`${BASE_URL}/api/reports/material-issues${qs}`),
                apiGet(`${BASE_URL}/api/reports/outbound${qs}`)
            ]);

        renderStockIn(stockInData, periodDesc);
        renderMaterialIssue(materialIssueData, periodDesc);
        renderOutbound(outboundData, periodDesc);

    } catch (error) {

        console.error(error);

        const errMsg = `<tr><td colspan="10">Gagal memuat data: ${escapeHtml(error.message)}</td></tr>`;
        stockInBody.innerHTML      = errMsg;
        materialIssueBody.innerHTML = errMsg;
        outboundBody.innerHTML     = errMsg;
        periodLabel.textContent    = "Gagal memuat laporan.";

    } finally {

        loadReportButton.disabled    = false;
        loadReportButton.textContent = "Tampilkan Laporan";

    }

}


// ======================================================
// EVENT LISTENERS
// ======================================================

loadReportButton.addEventListener("click", loadReports);

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

        // Auto-load laporan bulan ini
        await loadReports();

    } catch (error) {

        console.error(error);

    }

}


init();
