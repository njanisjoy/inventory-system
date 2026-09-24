const { execSync } = require("child_process");
const path = require("path");
const files = [
    "suppliers.js","kategori.js","lokasi.js","outbound.js","laporan.js"
];
const dir = __dirname;
files.forEach(f => {
    try {
        execSync(`node --check "${path.join(dir,f)}"`, {stdio:"pipe"});
        console.log(`✓ ${f}`);
    } catch(e) {
        // Print full error with line numbers
        console.log(`✗ ${f}:\n${e.stderr.toString()}`);
    }
});
