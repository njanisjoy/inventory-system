const XLSX = require("xlsx");

const excelPath = process.argv[2];

const workbook = XLSX.readFile(excelPath);

for (const sheetName of workbook.SheetNames) {

    console.log("");
    console.log("========================================");
    console.log("SHEET:", sheetName);
    console.log("========================================");

    const rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        {
            header: 1,
            defval: ""
        }
    );

    console.log("Jumlah baris:", rows.length);

    console.log("");
    console.log("BARIS 1:");
    console.dir(rows[0], { depth: null });

    console.log("");
    console.log("BARIS 2:");
    console.dir(rows[1], { depth: null });

    console.log("");
    console.log("BARIS 3:");
    console.dir(rows[2], { depth: null });
}
