const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5500;

const server = http.createServer((req, res) => {
  let filePath = path.join(
    __dirname,
    req.url === "/" ? "index.html" : req.url
  );

  const ext = path.extname(filePath);

  const contentTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css"
  };

  const contentType = contentTypes[ext] || "text/plain";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, {
        "Content-Type": "text/plain"
      });

      res.end("File tidak ditemukan");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType
    });

    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend berjalan di http://localhost:${PORT}`);
});