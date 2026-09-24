const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const excelPath = process.argv[2];

if (!excelPath || !fs.existsSync(excelPath)) {
    console.error("File Excel tidak ditemukan.");
    process.exit(1);
}

function clean(v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
}

function normalize(v) {
    return clean(v)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function normalizeName(v) {
    return clean(v)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isPlaceholderCode(code) {
    const n = normalize(code);

    return (
        !n ||
        n === "DONEWEB" ||
        n === "-"
    );
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

    if (raw.length < 3) return [];

    const headers =
        raw[1].map(clean);

    const rows = [];

    for (let i = 2; i < raw.length; i++) {

        const values = raw[i];
        const row = {};

        headers.forEach((header, index) => {

            if (header) {
                row[header] =
                    values[index] ?? "";
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

const workbook =
    XLSX.readFile(excelPath);

const records = [];

const ignoredSheets = new Set([
    "New Brg Masuk",
    "New Brg Keluar"
]);

for (const sheetName of workbook.SheetNames) {

    if (ignoredSheets.has(sheetName)) {
        continue;
    }

    const rows =
        getRows(
            workbook.Sheets[sheetName]
        );

    const category =
        sheetName === "SPARE PART 2"
            ? "SPAREPART"
            : sheetName;

    for (const row of rows) {

        const code =
            get(row, "KODE BARANG");

        const name =
            buildName(row);

        const location =
            get(row, "LOKASI");

        const notes =
            get(row, "KETERANGAN");

        if (!code && !name) {
            continue;
        }

        records.push({

            sheet: sheetName,

            row:
                row.__excelRow,

            code,

            isPlaceholderCode:
                isPlaceholderCode(code),

            normalizedCode:
                isPlaceholderCode(code)
                    ? ""
                    : normalize(code),

            name,

            normalizedName:
                normalizeName(name),

            category,

            location,

            notes

        });
    }
}

/*
==================================================
KATEGORI HASIL
==================================================
*/

const validCode =
    records.filter(
        x =>
            !x.isPlaceholderCode
    );

const noCode =
    records.filter(
        x =>
            x.isPlaceholderCode
    );

/*
==================================================
DUPLIKAT KODE VALID
==================================================
*/

const codeGroups =
    new Map();

for (const item of validCode) {

    if (!item.normalizedCode) {
        continue;
    }

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

const conflictingCodes = [];

for (
    const [code, items]
    of codeGroups
) {

    if (items.length > 1) {

        const names =
            new Set(
                items.map(
                    x => x.normalizedName
                )
            );

        if (names.size > 1) {

            conflictingCodes.push({

                normalizedCode: code,

                items

            });

        }

    }
}

/*
==================================================
DUPLIKAT NAMA
==================================================
*/

const nameGroups =
    new Map();

for (const item of records) {

    if (!item.normalizedName) {
        continue;
    }

    if (!nameGroups.has(
        item.normalizedName
    )) {

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

for (
    const [name, items]
    of nameGroups
) {

    if (items.length > 1) {

        duplicateNames.push({

            normalizedName: name,

            items

        });

    }
}

/*
==================================================
OUTPUT
==================================================
*/

console.log("");
console.log("==============================================");
console.log("MASTER BARANG — CLEAN PREVIEW");
console.log("==============================================");
console.log("");

console.log(
    "TOTAL RECORD        :",
    records.length
);

console.log(
    "VALID CODE          :",
    validCode.length
);

console.log(
    "NO CODE / PLACEHOLDER:",
    noCode.length
);

console.log(
    "CONFLICTING CODE    :",
    conflictingCodes.length
);

console.log(
    "DUPLICATE NAME      :",
    duplicateNames.length
);

console.log("");

/*
==================================================
CONTOH NO CODE
==================================================
*/

console.log(
    "=============================================="
);

console.log(
    "NO CODE / DONE WEB — 40 CONTOH"
);

console.log(
    "=============================================="
);

noCode
    .slice(0, 40)
    .forEach(x => {

        console.log(
            `${x.sheet}!${x.row} | ` +
            `KODE="${x.code || "-"}" | ` +
            `${x.name}`
        );

    });

/*
==================================================
CONFLICTING CODE
==================================================
*/

if (
    conflictingCodes.length
) {

    console.log("");
    console.log(
        "=============================================="
    );

    console.log(
        "CONFLICTING CODE"
    );

    console.log(
        "=============================================="
    );

    conflictingCodes
        .slice(0, 40)
        .forEach((group, index) => {

            console.log("");

            console.log(
                `${index + 1}. CODE: ${group.normalizedCode}`
            );

            group.items
                .forEach(x => {

                    console.log(
                        `   ${x.sheet}!${x.row} | ` +
                        `${x.code} | ` +
                        `${x.name}`
                    );

                });

        });
}

/*
==================================================
DUPLICATE NAME
==================================================
*/

if (
    duplicateNames.length
) {

    console.log("");
    console.log(
        "=============================================="
    );

    console.log(
        "DUPLICATE NAME — 40 CONTOH"
    );

    console.log(
        "=============================================="
    );

    duplicateNames
        .slice(0, 40)
        .forEach((group, index) => {

            console.log("");

            console.log(
                `${index + 1}. ${group.normalizedName}`
            );

            group.items
                .forEach(x => {

                    console.log(
                        `   ${x.sheet}!${x.row} | ` +
                        `KODE="${x.code || "-"}"`

                    );

                });

        });
}

/*
==================================================
REPORT
==================================================
*/

const report = {

    totalRecords:
        records.length,

    validCode:
        validCode,

    noCode:
        noCode,

    conflictingCodes:
        conflictingCodes,

    duplicateNames:
        duplicateNames

};

const reportPath =
    path.resolve(
        process.cwd(),
        "master-clean-preview.json"
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

console.log("");
console.log(
    "Report:",
    reportPath
);

console.log("");
console.log(
    "AMAN — DATABASE TIDAK DISENTUH."
);

console.log(
    "=============================================="
);
