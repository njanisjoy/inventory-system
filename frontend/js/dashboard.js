const token = localStorage.getItem("token");

const userName          = document.getElementById("userName");
const welcomeMessage    = document.getElementById("welcomeMessage");
const totalProducts     = document.getElementById("totalProducts");
const lowStock          = document.getElementById("lowStock");
const outOfStock        = document.getElementById("outOfStock");
const stockTableBody    = document.getElementById("stockTableBody");
const logoutButton      = document.getElementById("logoutButton");


async function loadDashboard() {

    try {

        // =========================
        // AMBIL DATA USER
        // =========================

        const userResponse = await fetch(
            `${BASE_URL}/api/me`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const userData = await userResponse.json();

        if (!userResponse.ok) {
            throw new Error(
                userData.message || "Gagal mengambil data user"
            );
        }


        userName.textContent = userData.user.name;

        welcomeMessage.textContent =
            `Selamat datang, ${userData.user.name}`;


        // =========================
        // AMBIL DATA STOCK
        // =========================

        const stockResponse = await fetch(
            `${BASE_URL}/api/stock`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const stockData = await stockResponse.json();

        if (!stockResponse.ok) {
            throw new Error(
                stockData.message || "Gagal mengambil data stok"
            );
        }


        // =========================
        // HITUNG STATISTIK
        // =========================

        totalProducts.textContent = stockData.length;

        const lowStockCount = stockData.filter(
            item => item.stock_status === "LOW_STOCK"
        ).length;

        const outOfStockCount = stockData.filter(
            item => item.stock_status === "OUT_OF_STOCK"
        ).length;

        lowStock.textContent = lowStockCount;
        outOfStock.textContent = outOfStockCount;


        // =========================
        // TABEL STOCK
        // =========================

        stockTableBody.innerHTML = "";

        function formatQuantity(value) {
            return Number(value).toLocaleString("id-ID", {
                maximumFractionDigits: 3
            });
        }

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

        stockData.forEach(item => {

            const row = document.createElement("tr");

            row.innerHTML = `
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${item.unit}</td>
            <td>${formatQuantity(item.current_stock)} ${item.unit}</td>
            <td>${formatQuantity(item.minimum_stock)} ${item.unit}</td>
            <td>
                <span class="stock-status ${item.stock_status}">
                    ${formatStockStatus(item.stock_status)}
                </span>
                </td>
        `;

            stockTableBody.appendChild(row);

        });


    } catch (error) {

        console.error(error);

        stockTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          Gagal mengambil data dashboard
        </td>
      </tr>
    `;

    }

}


// =========================
// LOGOUT
// =========================

logoutButton.addEventListener("click", () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "./index.html";

});


// Jalankan dashboard
loadDashboard();