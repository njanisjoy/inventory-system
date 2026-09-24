const token = localStorage.getItem("token");

const userName = document.getElementById("userName");
const stockTableBody = document.getElementById("stockTableBody");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const logoutButton = document.getElementById("logoutButton");

let stockData = [];


// ======================================================
// FORMAT JUMLAH
// ======================================================

function formatQuantity(value) {

    return Number(value).toLocaleString("id-ID", {
        maximumFractionDigits: 3
    });

}


// ======================================================
// FORMAT STATUS
// ======================================================

function formatStockStatus(status) {

    if (status === "NORMAL") {
        return "Normal";
    }

    if (status === "LOW_STOCK") {
        return "Stok Menipis";
    }

    if (status === "OUT_OF_STOCK") {
        return "Habis";
    }

    return status;

}


// ======================================================
// TAMPILKAN DATA STOCK
// ======================================================

function renderStock() {

    const searchKeyword =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        statusFilter.value;


    const filteredData = stockData.filter(item => {

        const matchesSearch =
            item.code.toLowerCase().includes(searchKeyword) ||
            item.name.toLowerCase().includes(searchKeyword);


        const matchesStatus =
            selectedStatus === "ALL" ||
            item.stock_status === selectedStatus;


        return matchesSearch && matchesStatus;

    });


    stockTableBody.innerHTML = "";


    // Tidak ada hasil

    if (filteredData.length === 0) {

        stockTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Tidak ada barang yang sesuai.
                </td>
            </tr>
        `;

        return;

    }


    // Tampilkan data

    filteredData.forEach(item => {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>${item.code}</td>

            <td>${item.name}</td>

            <td>${item.unit}</td>

            <td>
                ${formatQuantity(item.current_stock)}
                ${item.unit}
            </td>

            <td>
                ${formatQuantity(item.minimum_stock)}
                ${item.unit}
            </td>

            <td>
                <span class="stock-status ${item.stock_status}">
                    ${formatStockStatus(item.stock_status)}
                </span>
            </td>
        `;


        stockTableBody.appendChild(row);

    });

}


// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {

    const response =
        await fetch(
            `${BASE_URL}/api/me`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Gagal mengambil data user"
        );

    }


    userName.textContent =
        data.user.name;

}


// ======================================================
// LOAD STOCK
// ======================================================

async function loadStock() {

    const response =
        await fetch(
            `${BASE_URL}/api/stock`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Gagal mengambil data stok"
        );

    }


    stockData = data;

    renderStock();

}


// ======================================================
// SEARCH
// ======================================================

searchInput.addEventListener(
    "input",
    renderStock
);


// ======================================================
// FILTER STATUS
// ======================================================

statusFilter.addEventListener(
    "change",
    renderStock
);


// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener(
    "click",
    () => {

        localStorage.removeItem("token");

        localStorage.removeItem("user");

        window.location.href =
            "./index.html";

    }
);


// ======================================================
// INITIAL LOAD
// ======================================================

async function init() {

    try {

        await loadUser();

        await loadStock();

    } catch (error) {

        console.error(error);

        stockTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Gagal mengambil data stok.
                </td>
            </tr>
        `;

    }

}


init();