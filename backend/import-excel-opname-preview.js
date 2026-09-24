const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { Pool } = require("pg");

const EXCEL_PATH = process.argv[2] ||
    path.resolve(__dirname, "../DATA PINDAH BARANG SSD (3).xlsx");

const OPDATE = process.env.OPDATE || "2026-08-25";

if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`File Excel tidak ditemukan: ${EXCEL_PATH}`);
    process.exit(1);
}

const pool = new Pool({
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE || "inventory_system",
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT || 5432),
});

function clean(v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
}

function norm(v) {
    return clean(v)
        .toUpperCase()
        .replace(/[\s\-_/\\.]+/g, "")
        .replace(/[^A-Z0-9]/g, "");
}

function key(v) {
    return clean(v).toLowerCase().replace(/\s+/g, " ").trim();
}

function findColumn(headers, aliases) {
    const normalized = headers.map(h => norm(h));

    for (const alias of aliases) {
        const a = norm(alias);
        const i = normalized.indexOf(a);

        if (i >= 0) return headers[i];
    }

    return null;
}

function numberValue(v) {
    if (typeof v === "number" && Number.isFinite(v)) {
        return v;
    }

    const s = clean(v)
        .replace(/\./g, "")
        .replace(",", ".");

    const n = Number(s);

    return Number.isFinite(n) ? n : null;
}

function sheetRows(workbook, sheetName) {
    const ws = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json(ws, {
        defval: ""
    });
}

async function main() {

    console.log("========================================");
    console.log("IMPORT EXCEL — STOCK OPNAME PREVIEW");
    console.log("========================================");
    console.log(`Tanggal opname : ${OPDATE}`);
    console.log(`Excel          : ${EXCEL_PATH}`);
    console.log("MODE           : PREVIEW ONLY");
    console.log("DATABASE       : TIDAK AKAN DIUBAH");
    console.log("");

    const workbook = XLSX.readFile(EXCEL_PATH);

    console.log(
        "Sheet:",
        workbook.SheetNames.join(", ")
    );

    console.log("");

    const db = await pool.connect();

    try {

        const [
            productsResult,
            categoriesResult,
            unitsResult,
            locationsResult,
            suppliersResult,
            stockResult
        ] = await Promise.all([

            db.query(`
                SELECT
                    p.id,
                    p.code,
                    p.name,
                    p.category_id,
                    p.unit_id,
                    p.default_location_id,
                    p.minimum_stock,
                    p.description,
                    c.name AS category,
                    u.name AS unit,
                    l.name AS location
                FROM products p
                LEFT JOIN categories c
                    ON c.id = p.category_id
                LEFT JOIN units u
                    ON u.id = p.unit_id
                LEFT JOIN locations l
                    ON l.id = p.default_location_id
                ORDER BY p.id;
            `),

            db.query(`
                SELECT id, name
                FROM categories
                ORDER BY id;
            `),

            db.query(`
                SELECT id, name, symbol
                FROM units
                ORDER BY id;
            `),

            db.query(`
                SELECT id, name, type
                FROM locations
                ORDER BY id;
            `),

            db.query(`
                SELECT id, name
                FROM suppliers
                ORDER BY id;
            `),

            db.query(`
                SELECT
                    p.id AS product_id,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN st.direction = 'IN'
                                    THEN st.quantity

                                WHEN st.direction = 'OUT'
                                    THEN -st.quantity

                                ELSE 0
                            END
                        ),
                        0
                    ) AS current_stock

                FROM products p

                LEFT JOIN stock_transactions st
                    ON st.product_id = p.id

                GROUP BY p.id;
            `)
        ]);

        const products = productsResult.rows;

        const stockByProduct = new Map(
            stockResult.rows.map(r => [
                Number(r.product_id),
                Number(r.current_stock)
            ])
        );

        const productByCode = new Map();

        for (const p of products) {

            const n = norm(p.code);

            if (!n) continue;

            if (!productByCode.has(n)) {
                productByCode.set(n, []);
            }

            productByCode.get(n).push(p);
        }

        const categoryByName = new Map(
            categoriesResult.rows.map(x => [
                key(x.name),
                x
            ])
        );

        const unitByName = new Map();

        for (const x of unitsResult.rows) {

            unitByName.set(
                key(x.name),
                x
            );

            if (x.symbol) {
                unitByName.set(
                    key(x.symbol),
                    x
                );
            }
        }

        const locationByName = new Map(
            locationsResult.rows.map(x => [
                key(x.name),
                x
            ])
        );

        const supplierByName = new Map(
            suppliersResult.rows.map(x => [
                key(x.name),
                x
            ])
        );

        const summary = {
            update: [],
            insert: [],
            stockMatch: [],
            stockAdjust: [],
            skip: [],
            error: []
        };

        for (const sheetName of workbook.SheetNames) {

            const rows = sheetRows(
                workbook,
                sheetName
            );

            if (!rows.length) continue;

            const headers = Object.keys(
                rows[0]
            );

            const codeCol = findColumn(
                headers,
                [
                    "KODE",
                    "KODE BARANG",
                    "CODE",
                    "ITEM CODE"
                ]
            );

            const nameCol = findColumn(
                headers,
                [
                    "NAMA",
                    "NAMA BARANG",
                    "NAME",
                    "BARANG",
                    "ITEM"
                ]
            );

            const categoryCol = findColumn(
                headers,
                [
                    "KATEGORI",
                    "CATEGORY",
                    "JENIS",
                    "TYPE BARANG"
                ]
            );

            const unitCol = findColumn(
                headers,
                [
                    "SATUAN",
                    "UNIT"
                ]
            );

            const locationCol = findColumn(
                headers,
                [
                    "LOKASI",
                    "LOCATION",
                    "TEMPAT"
                ]
            );

            const supplierCol = findColumn(
                headers,
                [
                    "SUPPLIER",
                    "PEMASOK"
                ]
            );

            const stockCol = findColumn(
                headers,
                [
                    "TOTAL",
                    "JUMLAH",
                    "STOK",
                    "STOCK",
                    "CURRENT STOCK",
                    "QTY",
                    "QUANTITY"
                ]
            );

            console.log(
                `--- ${sheetName} (${rows.length} baris) ---`
            );

            console.log(
                `kolom: code=${codeCol || "-"}, ` +
                `name=${nameCol || "-"}, ` +
                `category=${categoryCol || "-"}, ` +
                `unit=${unitCol || "-"}, ` +
                `location=${locationCol || "-"}, ` +
                `stock=${stockCol || "-"}`
            );

            rows.forEach((row, index) => {

                const excelRow = index + 2;

                const code = clean(
                    codeCol
                        ? row[codeCol]
                        : ""
                );

                const name = clean(
                    nameCol
                        ? row[nameCol]
                        : ""
                );

                const categoryName = clean(
                    categoryCol
                        ? row[categoryCol]
                        : ""
                );

                const unitName = clean(
                    unitCol
                        ? row[unitCol]
                        : ""
                );

                const locationName = clean(
                    locationCol
                        ? row[locationCol]
                        : ""
                );

                const supplierName = clean(
                    supplierCol
                        ? row[supplierCol]
                        : ""
                );

                const stock = numberValue(
                    stockCol
                        ? row[stockCol]
                        : ""
                );

                if (!code) {

                    summary.skip.push({
                        sheet: sheetName,
                        row: excelRow,
                        reason: "Kode kosong",
                        name
                    });

                    return;
                }

                const candidates =
                    productByCode.get(
                        norm(code)
                    ) || [];

                if (candidates.length > 1) {

                    summary.skip.push({
                        sheet: sheetName,
                        row: excelRow,
                        code,
                        reason:
                            `Kode cocok ke ${candidates.length} produk`
                    });

                    return;
                }

                if (candidates.length === 1) {

                    const p = candidates[0];

                    const changes = [];

                    if (
                        name &&
                        key(name) !== key(p.name)
                    ) {
                        changes.push(
                            `name: "${p.name}" -> "${name}"`
                        );
                    }

                    if (
                        categoryName &&
                        key(categoryName) !==
                        key(p.category || "")
                    ) {
                        changes.push(
                            `category: "${p.category || "-"}" -> "${categoryName}"`
                        );
                    }

                    if (
                        unitName &&
                        key(unitName) !==
                        key(p.unit || "")
                    ) {
                        changes.push(
                            `unit: "${p.unit || "-"}" -> "${unitName}"`
                        );
                    }

                    if (
                        locationName &&
                        key(locationName) !==
                        key(p.location || "")
                    ) {
                        changes.push(
                            `location: "${p.location || "-"}" -> "${locationName}"`
                        );
                    }

                    summary.update.push({
                        sheet: sheetName,
                        row: excelRow,
                        productId: p.id,
                        code: p.code,
                        excelCode: code,
                        name: name || p.name,
                        changes
                    });

                    if (stock !== null) {

                        const current =
                            stockByProduct.get(
                                Number(p.id)
                            ) || 0;

                        const delta =
                            stock - current;

                        if (
                            Math.abs(delta) <
                            0.000001
                        ) {

                            summary.stockMatch.push({
                                sheet: sheetName,
                                row: excelRow,
                                code: p.code,
                                current,
                                target: stock
                            });

                        } else {

                            summary.stockAdjust.push({
                                sheet: sheetName,
                                row: excelRow,
                                code: p.code,
                                current,
                                target: stock,
                                delta
                            });
                        }
                    }

                    return;
                }

                const category =
                    categoryByName.get(
                        key(categoryName)
                    );

                const unit =
                    unitByName.get(
                        key(unitName)
                    );

                const location =
                    locationByName.get(
                        key(locationName)
                    );

                const supplier =
                    supplierByName.get(
                        key(supplierName)
                    );

                const missing = [];

                if (!name) {
                    missing.push("nama");
                }

                if (!category) {
                    missing.push(
                        `kategori "${categoryName || "-"}"`
                    );
                }

                if (!unit) {
                    missing.push(
                        `unit "${unitName || "-"}"`
                    );
                }

                if (missing.length) {

                    summary.skip.push({
                        sheet: sheetName,
                        row: excelRow,
                        code,
                        reason:
                            `Barang baru tetapi data wajib tidak lengkap: ${missing.join(", ")}`
                    });

                    return;
                }

                summary.insert.push({
                    sheet: sheetName,
                    row: excelRow,
                    code,
                    name,
                    category: category.name,
                    unit: unit.name,
                    location:
                        location
                            ? location.name
                            : null,
                    supplier:
                        supplier
                            ? supplier.name
                            : (
                                supplierName ||
                                null
                            ),
                    targetStock: stock
                });
            });
        }

        console.log("");
        console.log("========================================");
        console.log("HASIL PREVIEW");
        console.log("========================================");

        console.log(
            `UPDATE PRODUCT : ${summary.update.length}`
        );

        console.log(
            `NEW PRODUCT    : ${summary.insert.length}`
        );

        console.log(
            `STOCK SESUAI    : ${summary.stockMatch.length}`
        );

        console.log(
            `STOCK ADJUST    : ${summary.stockAdjust.length}`
        );

        console.log(
            `SKIP            : ${summary.skip.length}`
        );

        console.log(
            `ERROR           : ${summary.error.length}`
        );

        console.log("");

        if (summary.update.length) {

            console.log(
                "=== CONTOH UPDATE PRODUCT (maks 20) ==="
            );

            summary.update
                .slice(0, 20)
                .forEach(x => {

                    console.log(
                        `${x.sheet}!${x.row} | ` +
                        `${x.code} | ` +
                        `${x.name}` +
                        (
                            x.changes.length
                                ? ` | ${x.changes.join("; ")}`
                                : " | tidak ada perubahan atribut"
                        )
                    );
                });

            console.log("");
        }

        if (summary.insert.length) {

            console.log(
                "=== CONTOH NEW PRODUCT (maks 20) ==="
            );

            summary.insert
                .slice(0, 20)
                .forEach(x => {

                    console.log(
                        `${x.sheet}!${x.row} | ` +
                        `${x.code} | ` +
                        `${x.name} | ` +
                        `${x.category} | ` +
                        `${x.unit} | ` +
                        `stok=${x.targetStock ?? "-"}`
                    );
                });

            console.log("");
        }

        if (summary.stockAdjust.length) {

            console.log(
                "=== CONTOH STOCK ADJUSTMENT (maks 20) ==="
            );

            summary.stockAdjust
                .slice(0, 20)
                .forEach(x => {

                    console.log(
                        `${x.sheet}!${x.row} | ` +
                        `${x.code} | ` +
                        `DB=${x.current} | ` +
                        `Excel=${x.target} | ` +
                        `Delta=${x.delta}`
                    );
                });

            console.log("");
        }

        if (summary.skip.length) {

            console.log(
                "=== PERLU KONFIRMASI / SKIP (maks 50) ==="
            );

            summary.skip
                .slice(0, 50)
                .forEach(x => {

                    console.log(
                        `${x.sheet}!${x.row} | ` +
                        `${x.code || "-"} | ` +
                        `${x.name || "-"} | ` +
                        `${x.reason}`
                    );
                });

            console.log("");
        }

        const reportPath =
            path.resolve(
                process.cwd(),
                `import-preview-${OPDATE}.json`
            );

        fs.writeFileSync(
            reportPath,
            JSON.stringify(
                summary,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            `Report lengkap: ${reportPath}`
        );

        console.log("");

        console.log(
            "AMAN: script ini PREVIEW ONLY."
        );

        console.log(
            "TIDAK ADA INSERT, UPDATE, DELETE, COMMIT, atau ROLLBACK ke database."
        );

    } finally {

        db.release();

        await pool.end();
    }
}

main().catch(err => {

    console.error("");

    console.error(
        "PREVIEW ERROR:",
        err.message
    );

    process.exit(1);
});
