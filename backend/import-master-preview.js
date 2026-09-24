require("dotenv").config();

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { Pool } = require("pg");

const EXCEL_PATH = process.argv[2];

if (!EXCEL_PATH || !fs.existsSync(EXCEL_PATH)) {
    console.error("File Excel tidak ditemukan.");
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432
});

function clean(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function normalizeCode(value) {
    return clean(value)
        .toUpperCase()
        .replace(/[\s\-_/\\.]+/g, "")
        .replace(/[^A-Z0-9]/g, "");
}

function normalizeText(value) {
    return clean(value)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function getRows(sheet) {

    const raw =
        XLSX.utils.sheet_to_json(
            sheet,
            {
                header: 1,
                defval: ""
            }
        );

    if (raw.length < 3) {
        return [];
    }

    const headers =
        raw[1].map(clean);

    const rows = [];

    for (
        let i = 2;
        i < raw.length;
        i++
    ) {

        const values = raw[i];

        const row = {};

        headers.forEach(
            (header, index) => {

                if (header) {
                    row[header] =
                        values[index] ?? "";
                }

            }
        );

        row.__excelRow = i + 1;

        rows.push(row);
    }

    return rows;
}

function get(row, names) {

    for (const name of names) {

        if (
            Object.prototype.hasOwnProperty
                .call(row, name)
        ) {

            const value =
                clean(row[name]);

            if (value) {
                return value;
            }
        }
    }

    return "";
}

function buildName(row) {

    const jenis =
        get(row, ["JENIS"]);

    const merek =
        get(row, ["MEREK"]);

    const type =
        get(row, ["TYPE"]);

    return [
        jenis,
        merek,
        type
    ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

async function main() {

    console.log("");
    console.log("==============================================");
    console.log("MASTER BARANG — IMPORT PREVIEW");
    console.log("==============================================");
    console.log("");
    console.log("Excel:", EXCEL_PATH);
    console.log("");
    console.log("MODE: PREVIEW ONLY");
    console.log("DATABASE: READ ONLY");
    console.log("");
    console.log("----------------------------------------------");

    const workbook =
        XLSX.readFile(EXCEL_PATH);

    const client =
        await pool.connect();

    try {

        const productsResult =
            await client.query(`
                SELECT
                    p.id,
                    p.code,
                    p.name,
                    p.category_id,
                    p.unit_id,
                    p.default_location_id,
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
            `);

        const products =
            productsResult.rows;

        console.log(
            `Produk database saat ini: ${products.length}`
        );

        /*
        ==========================================
        INDEX KODE DATABASE
        ==========================================
        */

        const productsByCode =
            new Map();

        for (const product of products) {

            const code =
                normalizeCode(product.code);

            if (!code) continue;

            if (
                !productsByCode.has(code)
            ) {

                productsByCode.set(
                    code,
                    []
                );

            }

            productsByCode
                .get(code)
                .push(product);
        }

        /*
        ==========================================
        HASIL
        ==========================================
        */

        const result = {

            matched: [],

            newProducts: [],

            pendingNoCode: [],

            possibleMatch: [],

            ambiguous: [],

            skipped: []

        };

        /*
        ==========================================
        SHEET YANG TIDAK DIIMPORT
        ==========================================
        */

        const ignoredSheets = new Set([
            "New Brg Masuk",
            "New Brg Keluar"
        ]);

        /*
        ==========================================
        PROSES SEMUA SHEET
        ==========================================
        */

        for (
            const sheetName
            of workbook.SheetNames
        ) {

            if (
                ignoredSheets.has(sheetName)
            ) {

                console.log(
                    `SKIP SHEET: ${sheetName}`
                );

                continue;
            }

            const rows =
                getRows(
                    workbook.Sheets[sheetName]
                );

            console.log(
                `${sheetName}: ${rows.length} data`
            );

            /*
            ======================================
            SPARE PART 2
            DIGABUNG SECARA KATEGORI
            ======================================
            */

            const category =
                sheetName === "SPARE PART 2"
                    ? "SPAREPART"
                    : sheetName;

            for (const row of rows) {

                const excelRow =
                    row.__excelRow;

                const code =
                    get(
                        row,
                        ["KODE BARANG"]
                    );

                const name =
                    buildName(row);

                const location =
                    get(
                        row,
                        ["LOKASI"]
                    );

                const notes =
                    get(
                        row,
                        ["KETERANGAN"]
                    );

                /*
                ----------------------------------
                BARIS BENAR-BENAR KOSONG
                ----------------------------------
                */

                if (
                    !code &&
                    !name
                ) {

                    result.skipped.push({

                        sheet:
                            sheetName,

                        row:
                            excelRow,

                        reason:
                            "Baris kosong"

                    });

                    continue;
                }

                /*
                ==================================
                KODE ADA
                ==================================
                */

                if (code) {

                    const normalized =
                        normalizeCode(code);

                    const matches =
                        productsByCode
                            .get(normalized)
                            || [];

                    /*
                    MATCH SATU
                    */

                    if (
                        matches.length === 1
                    ) {

                        const product =
                            matches[0];

                        result.matched.push({

                            sheet:
                                sheetName,

                            row:
                                excelRow,

                            excelCode:
                                code,

                            databaseId:
                                product.id,

                            databaseCode:
                                product.code,

                            excelName:
                                name,

                            databaseName:
                                product.name,

                            category,

                            location,

                            notes

                        });

                        continue;
                    }

                    /*
                    KODE DUPLIKAT DI DATABASE
                    */

                    if (
                        matches.length > 1
                    ) {

                        result.ambiguous.push({

                            sheet:
                                sheetName,

                            row:
                                excelRow,

                            code,

                            name,

                            candidates:
                                matches.map(
                                    product => ({
                                        id:
                                            product.id,

                                        code:
                                            product.code,

                                        name:
                                            product.name
                                    })
                                ),

                            reason:
                                "Kode cocok ke lebih dari satu produk database"

                        });

                        continue;
                    }

                    /*
                    ==================================
                    KODE BELUM ADA DI DATABASE
                    ==================================
                    */

                    result.newProducts.push({

                        sheet:
                            sheetName,

                        row:
                            excelRow,

                        code,

                        name,

                        category,

                        location,

                        notes,

                        status:
                            "NEW_PRODUCT"

                    });

                    continue;
                }

                /*
                ==================================
                KODE KOSONG
                ==================================
                */

                const sameName =
                    products.filter(
                        product =>
                            name &&
                            normalizeText(
                                product.name
                            ) ===
                            normalizeText(name)
                    );

                /*
                SATU KEMUNGKINAN
                */

                if (
                    sameName.length === 1
                ) {

                    const product =
                        sameName[0];

                    result.possibleMatch.push({

                        sheet:
                            sheetName,

                        row:
                            excelRow,

                        name,

                        category,

                        candidate: {

                            id:
                                product.id,

                            code:
                                product.code,

                            name:
                                product.name

                        },

                        reason:
                            "Kode kosong tetapi nama cocok dengan satu produk"

                    });

                    continue;
                }

                /*
                BANYAK KEMUNGKINAN
                */

                if (
                    sameName.length > 1
                ) {

                    result.ambiguous.push({

                        sheet:
                            sheetName,

                        row:
                            excelRow,

                        name,

                        candidates:
                            sameName.map(
                                product => ({
                                    id:
                                        product.id,

                                    code:
                                        product.code,

                                    name:
                                        product.name
                                })
                            ),

                        reason:
                            "Kode kosong dan nama cocok ke beberapa produk"

                    });

                    continue;
                }

                /*
                ==================================
                BARANG BARU TANPA KODE
                ==================================
                */

                result.pendingNoCode.push({

                    sheet:
                        sheetName,

                    row:
                        excelRow,

                    name,

                    category,

                    location,

                    notes,

                    status:
                        "PENDING_NO_CODE"

                });
            }
        }

        /*
        ==========================================
        SUMMARY
        ==========================================
        */

        console.log("");
        console.log("==============================================");
        console.log("HASIL MASTER PREVIEW");
        console.log("==============================================");

        console.log(
            `MATCH EXISTING       : ${result.matched.length}`
        );

        console.log(
            `NEW PRODUCT          : ${result.newProducts.length}`
        );

        console.log(
            `PENDING — NO CODE    : ${result.pendingNoCode.length}`
        );

        console.log(
            `POSSIBLE MATCH       : ${result.possibleMatch.length}`
        );

        console.log(
            `AMBIGUOUS            : ${result.ambiguous.length}`
        );

        console.log(
            `SKIPPED              : ${result.skipped.length}`
        );

        console.log("");

        /*
        ==========================================
        CONTOH NEW PRODUCT
        ==========================================
        */

        if (
            result.newProducts.length
        ) {

            console.log(
                "=== NEW PRODUCT — 30 CONTOH ==="
            );

            result.newProducts
                .slice(0, 30)
                .forEach(item => {

                    console.log(
                        `${item.sheet}!${item.row} | ` +
                        `${item.code || "-"} | ` +
                        `${item.name || "-"} | ` +
                        `${item.category || "-"}`
                    );

                });

            console.log("");
        }

        /*
        ==========================================
        CONTOH NO CODE
        ==========================================
        */

        if (
            result.pendingNoCode.length
        ) {

            console.log(
                "=== PENDING NO CODE — 30 CONTOH ==="
            );

            result.pendingNoCode
                .slice(0, 30)
                .forEach(item => {

                    console.log(
                        `${item.sheet}!${item.row} | ` +
                        `${item.name || "-"} | ` +
                        `${item.category || "-"}`
                    );

                });

            console.log("");
        }

        /*
        ==========================================
        CONTOH AMBIGUOUS
        ==========================================
        */

        if (
            result.ambiguous.length
        ) {

            console.log(
                "=== AMBIGUOUS — 30 CONTOH ==="
            );

            result.ambiguous
                .slice(0, 30)
                .forEach(item => {

                    console.log(
                        `${item.sheet}!${item.row} | ` +
                        `${item.code || "-"} | ` +
                        `${item.name || "-"}`
                    );

                });

            console.log("");
        }

        /*
        ==========================================
        SAVE REPORT
        ==========================================
        */

        const reportPath =
            path.resolve(
                process.cwd(),
                "master-import-preview.json"
            );

        fs.writeFileSync(
            reportPath,
            JSON.stringify(
                result,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            "Report:",
            reportPath
        );

        console.log("");
        console.log(
            "=============================================="
        );

        console.log(
            "AMAN — DATABASE TIDAK DIUBAH."
        );

        console.log(
            "STOK EXCEL TIDAK DIGUNAKAN."
        );

        console.log(
            "New Brg Masuk / New Brg Keluar DIABAIKAN."
        );

        console.log(
            "SPARE PART 2 → SPAREPART."
        );

        console.log(
            "=============================================="
        );

    } finally {

        client.release();

        await pool.end();

    }
}

main().catch(error => {

    console.error("");
    console.error(
        "PREVIEW ERROR:",
        error.message
    );

    process.exit(1);

});
