const token =
    localStorage.getItem("token");

const userName =
    document.getElementById("userName");

const stockInForm =
    document.getElementById("stockInForm");

const productSearch =
    document.getElementById("productSearch");

const selectedProductId =
    document.getElementById("selectedProductId");

const productResults =
    document.getElementById("productResults");

const selectedProductInfo =
    document.getElementById("selectedProductInfo");

const quantity =
    document.getElementById("quantity");

const itemUnit =
    document.getElementById("itemUnit");

const transactionDate =
    document.getElementById("transactionDate");

const invoiceNumber =
    document.getElementById("invoiceNumber");

const supplierId =
    document.getElementById("supplierId");

const notes =
    document.getElementById("notes");

const submitButton =
    document.getElementById("submitButton");

const formMessage =
    document.getElementById("formMessage");

const stockInTableBody =
    document.getElementById("stockInTableBody");

const logoutButton =
    document.getElementById("logoutButton");


let productsData = [];


// ======================================================
// FORMAT ANGKA
// ======================================================

function formatQuantity(value) {

    return Number(value).toLocaleString(
        "id-ID",
        {
            maximumFractionDigits: 3
        }
    );

}


// ======================================================
// DEFAULT TANGGAL
// ======================================================

function setDefaultDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    transactionDate.value =
        `${year}-${month}-${day}`;

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
// LOAD PRODUCTS
// ======================================================

async function loadProducts() {

    const response =
        await fetch(
            `${BASE_URL}/api/products`,
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
            "Gagal mengambil daftar produk"
        );

    }


    productsData =
        data;

}


// ======================================================
// LOAD SUPPLIERS
// ======================================================

async function loadSuppliers() {

    const response =
        await fetch(
            `${BASE_URL}/api/suppliers`,
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
            "Gagal mengambil daftar supplier"
        );

    }


    supplierId.innerHTML = `
        <option value="">
            Pilih supplier
        </option>
    `;


    data.forEach(supplier => {

        const option =
            document.createElement("option");


        option.value =
            supplier.id;


        option.textContent =
            supplier.name;


        supplierId.appendChild(
            option
        );

    });

}


// ======================================================
// SEARCH PRODUCT
// ======================================================

productSearch.addEventListener(
    "input",
    () => {

        const keyword =
            productSearch.value
                .trim()
                .toLowerCase();


        selectedProductId.value =
            "";

        selectedProductInfo.innerHTML =
            "";

        selectedProductInfo.classList.add(
            "hidden"
        );

        itemUnit.textContent =
            "-";


        if (!keyword) {

            productResults.innerHTML =
                "";

            productResults.classList.add(
                "hidden"
            );

            return;

        }


        const results =
            productsData.filter(
                product => {

                    const code =
                        String(
                            product.code || ""
                        ).toLowerCase();

                    const name =
                        String(
                            product.name || ""
                        ).toLowerCase();

                    return (
                        code.includes(keyword) ||
                        name.includes(keyword)
                    );

                }
            );


        productResults.innerHTML =
            "";


        if (results.length === 0) {

            productResults.innerHTML = `
                <div class="product-result-empty">
                    Barang tidak ditemukan.
                </div>
            `;

            productResults.classList.remove(
                "hidden"
            );

            return;

        }


        results.forEach(
            product => {

                const result =
                    document.createElement(
                        "button"
                    );


                result.type =
                    "button";

                result.className =
                    "product-result";


                result.innerHTML = `
                    <div class="product-result-main">
                        <strong>
                            ${product.code} - ${product.name}
                        </strong>
                    </div>

                    <div class="product-result-meta">
                        Satuan:
                        ${product.unit_symbol || "-"}
                    </div>
                `;


                result.addEventListener(
                    "click",
                    () => {

                        selectProduct(
                            product
                        );

                    }
                );


                productResults.appendChild(
                    result
                );

            }
        );


        productResults.classList.remove(
            "hidden"
        );

    }
);


// ======================================================
// SELECT PRODUCT
// ======================================================

function selectProduct(product) {

    selectedProductId.value =
        product.id;


    productSearch.value =
        `${product.code} - ${product.name}`;


    itemUnit.textContent =
        product.unit_symbol || "-";


    const currentStock =
        product.current_stock !== undefined
            ? Number(product.current_stock)
            : null;


    const minimumStock =
        product.minimum_stock !== undefined
            ? Number(product.minimum_stock)
            : null;


    selectedProductInfo.innerHTML = `
        <div>
            <strong>
                ${product.name}
            </strong>
        </div>

        <div>
            Kode:
            ${product.code}
        </div>

        <div>
            Satuan:
            ${product.unit_symbol || "-"}
        </div>

        ${currentStock !== null
            ? `
                    <div>
                        Stok saat ini:
                        ${formatQuantity(currentStock)}
                        ${product.unit_symbol || ""}
                    </div>
                `
            : ""
        }

        ${minimumStock !== null
            ? `
                    <div>
                        Batas minimum:
                        ${formatQuantity(minimumStock)}
                        ${product.unit_symbol || ""}
                    </div>
                `
            : ""
        }
    `;


    selectedProductInfo.classList.remove(
        "hidden"
    );


    productResults.innerHTML =
        "";

    productResults.classList.add(
        "hidden"
    );


    formMessage.textContent =
        "";

}

// ======================================================
// LOAD RIWAYAT BARANG MASUK
// ======================================================

async function loadHistory() {

    const response =
        await fetch(
            `${BASE_URL}/api/stock/transactions`,
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
            "Gagal mengambil riwayat barang masuk"
        );

    }


    if (!Array.isArray(data)) {

        throw new Error(
            "Format data riwayat tidak valid"
        );

    }


    // HANYA BARANG MASUK
    const stockInData =
        data.filter(item => {

            return (
                String(item.direction)
                    .trim()
                    .toUpperCase() === "IN"

                &&

                String(item.transaction_type)
                    .trim()
                    .toUpperCase() === "PURCHASE"
            );

        });


    stockInTableBody.innerHTML = "";


    if (stockInData.length === 0) {

        stockInTableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    Belum ada transaksi barang masuk.
                </td>
            </tr>
        `;

        return;

    }


    stockInData.forEach(item => {

        const row =
            document.createElement("tr");


        const date =
            new Date(
                item.transaction_date
            ).toLocaleDateString("id-ID");


        const formattedQuantity =
            formatQuantity(
                item.quantity
            );


        row.innerHTML = `
            <td>${date}</td>
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${formattedQuantity}</td>
            <td>${item.unit || "-"}</td>
            <td>${item.supplier_name || "-"}</td>
            <td>${item.invoice_number || "-"}</td>
            <td>${item.notes || "-"}</td>
            <td>${item.created_by || "-"}</td>
        `;


        stockInTableBody.appendChild(row);

    });

}


// ======================================================
// SUBMIT BARANG MASUK
// ======================================================

stockInForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        formMessage.textContent =
            "";


        const parsedProductId =
            Number(
                selectedProductId.value
            );


        const parsedQuantity =
            Number(
                quantity.value
            );


        // ==============================================
        // VALIDASI PRODUK
        // ==============================================

        if (
            !Number.isInteger(
                parsedProductId
            ) ||
            parsedProductId <= 0
        ) {

            formMessage.textContent =
                "Pilih barang terlebih dahulu.";

            return;

        }


        // ==============================================
        // VALIDASI QUANTITY
        // ==============================================

        if (
            !Number.isFinite(
                parsedQuantity
            ) ||
            parsedQuantity <= 0
        ) {

            formMessage.textContent =
                "Jumlah harus lebih dari 0.";

            return;

        }


        // ==============================================
        // VALIDASI TANGGAL
        // ==============================================

        if (
            !transactionDate.value
        ) {

            formMessage.textContent =
                "Tanggal transaksi wajib diisi.";

            return;

        }


        formMessage.textContent =
            "Menyimpan transaksi...";


        submitButton.disabled =
            true;


        try {

            const payload = {

                product_id:
                    parsedProductId,

                quantity:
                    parsedQuantity,

                transaction_date:
                    transactionDate.value,

                supplier_id:
                    supplierId.value
                        ? Number(
                            supplierId.value
                        )
                        : null,

                invoice_number:
                    invoiceNumber.value
                        .trim(),

                notes:
                    notes.value
                        .trim()

            };


            const response =
                await fetch(
                    `${BASE_URL}/api/stock/in`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Gagal menyimpan barang masuk"
                );

            }


            formMessage.textContent =
                "Barang berhasil masuk ke stok.";


            // ==========================================
            // RESET FORM
            // ==========================================

            stockInForm.reset();

            setDefaultDate();

            productSearch.value =
                "";

            selectedProductId.value =
                "";

            productResults.innerHTML =
                "";

            productResults.classList.add(
                "hidden"
            );

            selectedProductInfo.innerHTML =
                "";

            selectedProductInfo.classList.add(
                "hidden"
            );

            itemUnit.textContent =
                "-";


            // ==========================================
            // REFRESH RIWAYAT
            // ==========================================

            await loadHistory();


        } catch (error) {

            console.error(error);

            formMessage.textContent =
                error.message ||
                "Gagal menyimpan barang masuk.";

        } finally {

            submitButton.disabled =
                false;

        }

    }
);


// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

        window.location.href =
            "./index.html";

    }
);


// ======================================================
// INITIAL LOAD
// ======================================================

async function init() {

    try {

        setDefaultDate();

        await loadUser();

        await loadProducts();

        await loadSuppliers();

        await loadHistory();

    } catch (error) {

        console.error(error);

        formMessage.textContent =
            error.message ||
            "Gagal memuat halaman Barang Masuk.";

    }

}


init();