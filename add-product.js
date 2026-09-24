// ======================================================
// ADD PRODUCT
// ======================================================

const addProductButton =
    document.getElementById("addProductButton");

const addModal =
    document.getElementById("addModal");

const closeAddModalButton =
    document.getElementById("closeAddModalButton");

const cancelAddButton =
    document.getElementById("cancelAddButton");

const addProductForm =
    document.getElementById("addProductForm");

const addCode =
    document.getElementById("addCode");

const addName =
    document.getElementById("addName");

const addCategory =
    document.getElementById("addCategory");

const addUnit =
    document.getElementById("addUnit");

const addLocation =
    document.getElementById("addLocation");

const addMinimumStock =
    document.getElementById("addMinimumStock");

const addDescription =
    document.getElementById("addDescription");

const addFormMessage =
    document.getElementById("addFormMessage");

const addSaveButton =
    document.getElementById("addSaveButton");


// ======================================================
// OPEN ADD MODAL
// ======================================================

addProductButton.addEventListener(
    "click",
    async () => {

        addFormMessage.textContent = "";

        addProductForm.reset();

        addMinimumStock.value = "0";

        addModal.classList.remove("hidden");

        await loadAddFormData();

    }
);


// ======================================================
// CLOSE ADD MODAL
// ======================================================

function closeAddModal() {

    addModal.classList.add("hidden");

    addFormMessage.textContent = "";

    addProductForm.reset();

    addMinimumStock.value = "0";

}


closeAddModalButton.addEventListener(
    "click",
    closeAddModal
);


cancelAddButton.addEventListener(
    "click",
    closeAddModal
);


// ======================================================
// LOAD ADD FORM DATA
// ======================================================

async function loadAddFormData() {

    try {

        addCategory.innerHTML = `
            <option value="">
                Memuat kategori...
            </option>
        `;

        addUnit.innerHTML = `
            <option value="">
                Memuat satuan...
            </option>
        `;

        addLocation.innerHTML = `
            <option value="">
                Memuat lokasi...
            </option>
        `;


        const headers = {
            Authorization:
                `Bearer ${token}`
        };


        const [
            categoryResponse,
            unitResponse,
            locationResponse
        ] = await Promise.all([

            fetch(
                "http://localhost:3000/api/categories",
                {
                    method: "GET",
                    headers
                }
            ),

            fetch(
                "http://localhost:3000/api/units",
                {
                    method: "GET",
                    headers
                }
            ),

            fetch(
                "http://localhost:3000/api/locations",
                {
                    method: "GET",
                    headers
                }
            )

        ]);


        const categoryData =
            await categoryResponse.json();

        const unitData =
            await unitResponse.json();

        const locationData =
            await locationResponse.json();


        if (!categoryResponse.ok) {
            throw new Error(
                categoryData.message ||
                "Gagal mengambil kategori"
            );
        }


        if (!unitResponse.ok) {
            throw new Error(
                unitData.message ||
                "Gagal mengambil satuan"
            );
        }


        if (!locationResponse.ok) {
            throw new Error(
                locationData.message ||
                "Gagal mengambil lokasi"
            );
        }


        // ==========================================
        // CATEGORY
        // ==========================================

        addCategory.innerHTML = `
            <option value="">
                Pilih kategori
            </option>
        `;


        categoryData.forEach(
            category => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category.id;

                option.textContent =
                    category.name;

                addCategory.appendChild(
                    option
                );

            }
        );


        // ==========================================
        // UNIT
        // ==========================================

        addUnit.innerHTML = `
            <option value="">
                Pilih satuan
            </option>
        `;


        unitData.forEach(
            unit => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    unit.id;

                option.textContent =
                    unit.symbol
                        ? `${unit.name} (${unit.symbol})`
                        : unit.name;

                addUnit.appendChild(
                    option
                );

            }
        );


        // ==========================================
        // LOCATION
        // ==========================================

        addLocation.innerHTML = `
            <option value="">
                Pilih lokasi (opsional)
            </option>
        `;


        locationData.forEach(
            location => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    location.id;

                option.textContent =
                    location.name;

                addLocation.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(error);

        addFormMessage.textContent =
            error.message ||
            "Gagal memuat data form.";

    }

}


// ======================================================
// SUBMIT ADD PRODUCT
// ======================================================

addProductForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const payload = {

            code:
                addCode.value.trim(),

            name:
                addName.value.trim(),

            category_id:
                Number(addCategory.value),

            unit_id:
                Number(addUnit.value),

            default_location_id:
                addLocation.value
                    ? Number(addLocation.value)
                    : null,

            minimum_stock:
                Number(addMinimumStock.value),

            description:
                addDescription.value.trim()

        };


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!payload.code) {

            addFormMessage.textContent =
                "Kode barang wajib diisi.";

            addCode.focus();

            return;

        }


        if (!payload.name) {

            addFormMessage.textContent =
                "Nama barang wajib diisi.";

            addName.focus();

            return;

        }


        if (
            !Number.isInteger(
                payload.category_id
            ) ||
            payload.category_id <= 0
        ) {

            addFormMessage.textContent =
                "Kategori wajib dipilih.";

            return;

        }


        if (
            !Number.isInteger(
                payload.unit_id
            ) ||
            payload.unit_id <= 0
        ) {

            addFormMessage.textContent =
                "Satuan wajib dipilih.";

            return;

        }


        if (
            !Number.isFinite(
                payload.minimum_stock
            ) ||
            payload.minimum_stock < 0
        ) {

            addFormMessage.textContent =
                "Batas minimum harus berupa angka 0 atau lebih.";

            return;

        }


        addFormMessage.textContent =
            "Menyimpan produk...";

        addSaveButton.disabled = true;


        try {

            const response =
                await fetch(
                    "http://localhost:3000/api/products",
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
                    "Gagal menambahkan produk"
                );

            }


            addFormMessage.textContent =
                "Produk berhasil ditambahkan.";


            await loadProducts();


            setTimeout(
                () => {
                    closeAddModal();
                },
                500
            );


        } catch (error) {

            console.error(error);

            addFormMessage.textContent =
                error.message ||
                "Gagal menambahkan produk.";

        } finally {

            addSaveButton.disabled =
                false;

        }

    }
);

