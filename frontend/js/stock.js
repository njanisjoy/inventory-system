const token = localStorage.getItem("token");

const userName = document.getElementById("userName");
const stockTableBody = document.getElementById("stockTableBody");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");
const locationFilter = document.getElementById("locationFilter");
console.log("categoryFilter:", categoryFilter);
console.log("locationFilter:", locationFilter);

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

// ======================================================
// LOAD CATEGORIES
// ======================================================

async function loadCategories() {
    const response = await fetch(`${BASE_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil data kategori");
    }

    categoryFilter.innerHTML = "<option value=\"\">Semua Kategori</option>";

    data.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
    });
}

// ======================================================
// LOAD LOCATIONS
// ======================================================

async function loadLocations() {
    const response = await fetch(`${BASE_URL}/api/locations`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil data lokasi");
    }

    locationFilter.innerHTML = "<option value=\"\">Semua Lokasi</option>";

    data.forEach(location => {
        const option = document.createElement("option");
        option.value = location.id;
        option.textContent = location.name;
        locationFilter.appendChild(option);
    });
}

function renderStock() {

    const searchKeyword =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        statusFilter.value;

    const selectedCategory =
        categoryFilter.value;

    const selectedLocation =
        locationFilter.value;


    const filteredData = stockData.filter(item => {

        const matchesSearch =
            item.code.toLowerCase().includes(searchKeyword) ||
            item.name.toLowerCase().includes(searchKeyword);



        const matchesStatus =
            selectedStatus === "ALL" ||
            item.stock_status === selectedStatus;

        const matchesCategory =
            !selectedCategory ||
            String(item.category_id) === String(selectedCategory);

        const matchesLocation =
            !selectedLocation ||
            String(item.location_id) === String(selectedLocation);

        return matchesSearch &&
               matchesStatus &&
               matchesCategory &&
               matchesLocation;

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
// FILTER KATEGORI & LOKASI
// ======================================================

categoryFilter.addEventListener(
    "change",
    renderStock
);

locationFilter.addEventListener(
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

        await loadCategories();

        await loadLocations();

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

