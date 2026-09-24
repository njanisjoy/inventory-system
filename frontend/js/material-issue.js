const token = localStorage.getItem("token");

const userName =
    document.getElementById("userName");

const materialIssueForm =
    document.getElementById("materialIssueForm");

const materialIssueHistoryBody =
    document.getElementById("materialIssueHistoryBody");

const issueNumber =
    document.getElementById("issueNumber");

const teamName =
    document.getElementById("teamName");

const issueDate =
    document.getElementById("issueDate");

const purpose =
    document.getElementById("purpose");

const notes =
    document.getElementById("notes");


const itemQuantity =
    document.getElementById("itemQuantity");

const itemUnit =
    document.getElementById("itemUnit");

const itemNotes =
    document.getElementById("itemNotes");

const addItemButton =
    document.getElementById("addItemButton");

const itemsTableBody =
    document.getElementById("itemsTableBody");

const submitButton =
    document.getElementById("submitButton");

const formMessage =
    document.getElementById("formMessage");

const productSearch =
    document.getElementById("productSearch");

const selectedProductId =
    document.getElementById("selectedProductId");

const productResults =
    document.getElementById("productResults");

const selectedProductInfo =
    document.getElementById("selectedProductInfo");

const logoutButton =
    document.getElementById("logoutButton");


let productsData = [];
let materialItems = [];


// ======================================================
// DEFAULT TANGGAL
// ======================================================

function setDefaultDate() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    issueDate.value =
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
// LOAD BAHAN MENTAH
// ======================================================

async function loadRawMaterials() {

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
        data.filter(
            product =>
                product.category === "Bahan Mentah"
        );

    productResults.classList.add("hidden");

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

        selectedProductId.value = "";

        selectedProductInfo.classList.add("hidden");
        selectedProductInfo.innerHTML = "";

        if (!keyword) {

            productResults.innerHTML = "";

            productResults.classList.add("hidden");

            return;
        }


        const results =
            productsData.filter(product => {

                const code =
                    product.code
                        .toLowerCase();

                const name =
                    product.name
                        .toLowerCase();

                return (
                    code.includes(keyword) ||
                    name.includes(keyword)
                );

            });


        productResults.innerHTML = "";


        if (results.length === 0) {

            productResults.innerHTML = `
                <div class="product-result-empty">
                    Barang tidak ditemukan.
                </div>
            `;

            productResults.classList.remove("hidden");

            return;
        }


        results.forEach(product => {

            const result =
                document.createElement("button");

            result.type = "button";

            result.className =
                "product-result";


            result.innerHTML = `
                <div class="product-result-main">
                    <strong>
                        ${product.code} - ${product.name}
                    </strong>
                </div>

                <div class="product-result-meta">
                    ${product.unit_symbol || "-"}
                </div>
            `;


            result.addEventListener(
                "click",
                () => {

                    selectProduct(product);

                }
            );


            productResults.appendChild(result);

        });


        productResults.classList.remove("hidden");

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
            <strong>${product.name}</strong>
        </div>

        <div>
            Kode: ${product.code}
        </div>

        <div>
            Satuan: ${product.unit_symbol || "-"}
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

    productResults.innerHTML = "";

    productResults.classList.add(
        "hidden"
    );

}


// ======================================================
// FORMAT QUANTITY
// ======================================================

function formatQuantity(value) {

    return Number(value)
        .toLocaleString("id-ID", {
            maximumFractionDigits: 3
        });

}


// ======================================================
// RENDER ITEMS
// ======================================================

function renderItems() {

    itemsTableBody.innerHTML = "";


    if (materialItems.length === 0) {

        itemsTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Belum ada barang ditambahkan.
                </td>
            </tr>
        `;

        return;
    }


    materialItems.forEach((item, index) => {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>${item.code}</td>

            <td>${item.name}</td>

            <td>
                ${formatQuantity(item.quantity)}
            </td>

            <td>
                ${item.unit_symbol || "-"}
            </td>

            <td>
                ${item.notes || "-"}
            </td>

            <td>
                <button
                    type="button"
                    class="remove-item-button"
                    data-index="${index}"
                >
                    Hapus
                </button>
            </td>
        `;


        itemsTableBody.appendChild(row);

    });


    document
        .querySelectorAll(".remove-item-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    materialItems.splice(
                        index,
                        1
                    );

                    renderItems();

                }
            );

        });

}


// ======================================================
// TAMBAH ITEM
// ======================================================

addItemButton.addEventListener(
    "click",
    () => {

        const productId =
            Number(selectedProductId.value);

        const parsedQuantity =
            Number(itemQuantity.value);

        const cleanItemNotes =
            itemNotes.value.trim();


        // ==================================================
        // VALIDASI PRODUK
        // ==================================================

        if (
            !Number.isInteger(productId) ||
            productId <= 0
        ) {

            formMessage.textContent =
                "Pilih barang terlebih dahulu.";

            return;
        }


        // ==================================================
        // VALIDASI JUMLAH
        // ==================================================

        if (
            !Number.isFinite(parsedQuantity) ||
            parsedQuantity <= 0
        ) {

            formMessage.textContent =
                "Jumlah barang harus lebih dari 0.";

            return;
        }


        // ==================================================
        // CARI PRODUK
        // ==================================================

        const product =
            productsData.find(
                item =>
                    Number(item.id) === productId
            );


        if (!product) {

            formMessage.textContent =
                "Produk tidak ditemukan.";

            return;
        }


        // ==================================================
        // CEK DUPLIKAT
        // ==================================================

        const existingIndex =
            materialItems.findIndex(
                item =>
                    Number(item.product_id) === productId
            );


        if (existingIndex !== -1) {

            formMessage.textContent =
                "Barang tersebut sudah ada di daftar.";

            return;
        }


        // ==================================================
        // TAMBAHKAN KE DAFTAR
        // ==================================================

        materialItems.push({

            product_id:
                product.id,

            code:
                product.code,

            name:
                product.name,

            unit_symbol:
                product.unit_symbol,

            quantity:
                parsedQuantity,

            notes:
                cleanItemNotes

        });


        // ==================================================
        // RENDER TABEL
        // ==================================================

        renderItems();


        // ==================================================
        // RESET PRODUCT PICKER
        // ==================================================

        productSearch.value = "";

        selectedProductId.value = "";

        productResults.innerHTML = "";

        productResults.classList.add(
            "hidden"
        );

        selectedProductInfo.innerHTML = "";

        selectedProductInfo.classList.add(
            "hidden"
        );

        itemUnit.textContent = "-";

        itemQuantity.value = "";

        itemNotes.value = "";


        formMessage.textContent = "";

    }
);


// ======================================================
// SUBMIT MATERIAL ISSUE
// ======================================================

materialIssueForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            materialItems.length === 0
        ) {

            formMessage.textContent =
                "Tambahkan minimal satu barang.";

            return;
        }


        const payload = {

            issue_number:
                issueNumber.value.trim(),

            team_name:
                teamName.value.trim(),

            issue_date:
                issueDate.value,

            purpose:
                purpose.value.trim(),

            notes:
                notes.value.trim(),

            items:
                materialItems.map(item => ({

                    product_id:
                        item.product_id,

                    quantity:
                        item.quantity,

                    notes:
                        item.notes

                }))

        };


        if (
            !payload.issue_number ||
            !payload.team_name ||
            !payload.issue_date ||
            !payload.purpose
        ) {

            formMessage.textContent =
                "Lengkapi data Material Issue.";

            return;
        }


        submitButton.disabled = true;

        formMessage.textContent =
            "Membuat Material Issue...";


        try {

            const response =
                await fetch(
                    `${BASE_URL}/api/material-issues`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Gagal membuat Material Issue"
                );

            }


            formMessage.textContent =
                `Material Issue ${data.issue_number} berhasil dibuat.`;


            materialIssueForm.reset();

            materialItems = [];

            renderItems();

            setDefaultDate();


        } catch (error) {

            console.error(error);

            formMessage.textContent =
                error.message ||
                "Gagal membuat Material Issue.";

        } finally {

            submitButton.disabled = false;

        }

    }
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

        materialIssueForm.reset();
        materialItems = [];
        renderItems();
        setDefaultDate();

        productSearch.value = "";
        selectedProductId.value = "";
        productResults.innerHTML = "";
        productResults.classList.add("hidden");
        selectedProductInfo.innerHTML = "";
        selectedProductInfo.classList.add("hidden");
        itemUnit.textContent = "-";

        await loadUser();
        await loadRawMaterials();
        await loadMaterialIssueHistory();

    } catch (error) {

        console.error(error);

        formMessage.textContent =
            error.message ||
            "Gagal memuat halaman Material Issue.";

    }

}


init();

// ======================================================
// LOAD RIWAYAT MATERIAL ISSUE
// ======================================================

async function loadMaterialIssueHistory() {

    const response =
        await fetch(
            `${BASE_URL}/api/material-issues/history`,
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
            "Gagal mengambil riwayat material issue"
        );

    }


    if (!Array.isArray(data)) {

        throw new Error(
            "Format data riwayat material issue tidak valid"
        );

    }


    materialIssueHistoryBody.innerHTML = "";


    if (data.length === 0) {

        materialIssueHistoryBody.innerHTML = `
            <tr>
                <td colspan="8">
                    Belum ada material issue.
                </td>
            </tr>
        `;

        return;

    }


    data.forEach(item => {

        const row =
            document.createElement("tr");


        const date =
            new Date(
                item.issue_date
            ).toLocaleDateString("id-ID");


        const formattedQuantity =
            formatQuantity(
                item.quantity
            );


        row.innerHTML = `
            <td>${item.issue_number}</td>

            <td>${date}</td>

            <td>${item.team_name}</td>

            <td>
                ${item.code} - ${item.name}
            </td>

            <td>${formattedQuantity}</td>

            <td>${item.unit || "-"}</td>

            <td>${item.purpose || "-"}</td>

            <td>${item.created_by || "-"}</td>
        `;


        materialIssueHistoryBody.appendChild(row);

    });

}