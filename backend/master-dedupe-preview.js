const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const excelPath = process.argv[2];

if (!excelPath || !fs.existsSync(excelPath)) {
    console.error("File Excel tidak ditemukan.");
    process.exit(1);
}

function clean(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function normalize(value) {
    return clean(value)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function textNormalize(value) {
    return clean(value)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getRows(sheet) {
    const raw = XLSX.utils.sheet_to_json(
        sheet,
        {
            header: 1,
            defval: ""
        }
    );

    if (raw.length < 3) return [];

    const headers = raw[1].map(clean);
    const rows = [];

    for (let i = 2; i < raw.length; i++) {

        const values = raw[i];
        const row = {};

        headers.forEach((header, index) => {
            if (header) {
                row[header] = values[index] ?? "";
            }
        });

        row.__excelRow = i + 1;

        rows.push(row);
    }

    return rows;
}

function get(row, key) {
    return clean(row[key]);
}

function buildName(row) {
    return [
        get(row, "JENIS"),
        get(row, "MEREK"),
        get(row, "TYPE")
    ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

const workbook = XLSX.readFile(excelPath);

const records = [];

const ignoredSheets = new Set([
    "New Brg Masuk",
    "New Brg Keluar"
]);

for (const sheetName of workbook.SheetNames) {

    if (ignoredSheets.has(sheetName)) continue;

    const rows = getRows(
        workbook.Sheets[sheetName]
    );

    const category =
        sheetName === "SPARE PART 2"
            ? "SPAREPART"
            : sheetName;

    for (const row of rows) {

        const code = get(
            row,
            "KODE BARANG"
        );

        const name = buildName(row);

        const location = get(
            row,
            "LOKASI"
        );

        const notes = get(
            row,
            "KETERANGAN"
        );

        if (!code && !name) {
            continue;
        }

        records.push({
            sheet: sheetName,
            row: row.__excelRow,
            code,
            normalizedCode: normalize(code),
            name,
            normalizedName: textNormalize(name),
            category,
            location,
            notes
        });
    }
}

console.log("");
console.log("==============================================");
console.log("MASTER BARANG — DEDUPE PREVIEW");
console.log("==============================================");
console.log("");
console.log("Total record:", records.length);
console.log("");

/*
==================================================
1. DUPLIKAT KODE SETELAH NORMALISASI
==================================================
*/

const codeGroups = new Map();

for (const item of records) {

    if (!item.normalizedCode) continue;

    if (!codeGroups.has(item.normalizedCode)) {
        codeGroups.set(
            item.normalizedCode,
            []
        );
    }

    codeGroups
        .get(item.normalizedCode)
        .push(item);
}

const duplicateCodes = [];

for (const [normalizedCode, items] of codeGroups) {

    if (items.length > 1) {

        duplicateCodes.push({
            normalizedCode,
            items
        });

    }
}

/*
==================================================
2. DUPLIKAT NAMA SETELAH NORMALISASI
==================================================
*/

const nameGroups = new Map();

for (const item of records) {

    if (!item.normalizedName) continue;

    if (!nameGroups.has(item.normalizedName)) {
        nameGroups.set(
            item.normalizedName,
            []
        );
    }

    nameGroups
        .get(item.normalizedName)
        .push(item);
}

const duplicateNames = [];

for (const [normalizedName, items] of nameGroups) {

    if (items.length > 1) {

        duplicateNames.push({
            normalizedName,
            items
        });

    }
}

/*
==================================================
3. KODE SAMA TAPI PENULISAN BERBEDA
==================================================
*/

console.log(
    "DUPLIKAT KODE SETELAH NORMALISASI:",
    duplicateCodes.length
);

console.log(
    "DUPLIKAT NAMA SETELAH NORMALISASI:",
    duplicateNames.length
);

console.log("");

if (duplicateCodes.length > 0) {

    console.log(
        "=============================================="
    );

    console.log(
        "DUPLIKAT KODE — CONTOH"
    );

    console.log(
        "=============================================="
    );

    duplicateCodes
        .slice(0, 100)
        .forEach((group, index) => {

            console.log("");
            console.log(
                `${index + 1}. NORMALIZED CODE: ${group.normalizedCode}`
            );

            group.items.forEach(item => {

                console.log(
                    `   ${item.sheet}!${item.row} | ` +
                    `KODE="${item.code}" | ` +
                    `NAMA="${item.name}"`
                );

            });

        });

    console.log("");
}

/*
==================================================
4. NAMA SAMA TAPI KODE BERBEDA / KOSONG
==================================================
*/

if (duplicateNames.length > 0) {

    console.log(
        "=============================================="
    );

    console.log(
        "DUPLIKAT NAMA — CONTOH"
    );

    console.log(
        "=============================================="
    );

    duplicateNames
        .slice(0, 100)
        .forEach((group, index) => {

            console.log("");
            console.log(
                `${index + 1}. NORMALIZED NAME: ${group.normalizedName}`
            );

            group.items.forEach(item => {

                console.log(
                    `   ${item.sheet}!${item.row} | ` +
                    `KODE="${item.code || "-"}" | ` +
                    `NAMA="${item.name}"`
                );

            });

        });

    console.log("");
}

/*
==================================================
SAVE REPORT
==================================================
*/

const report = {
    generatedAt: new Date().toISOString(),

    totalRecords:
        records.length,

    duplicateCodeGroups:
        duplicateCodes,

    duplicateNameGroups:
        duplicateNames
};

const reportPath =
    path.resolve(
        process.cwd(),
        "master-dedupe-preview.json"
    );

fs.writeFileSync(
    reportPath,
    JSON.stringify(
        report,
        null,
        2
    ),
    "utf8"
);

console.log(
    "Report lengkap:",
    reportPath
);

console.log("");
console.log(
    "AMAN — DATABASE TIDAK DISENTUH."
);

console.log(
    "=============================================="
);
