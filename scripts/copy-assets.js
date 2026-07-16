const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dirs = ["dist/web/templates", "dist/web/static/img"];

for (const d of dirs) {
  fs.mkdirSync(path.join(root, d), { recursive: true });
}

copy("src/web/templates/index.html", "dist/web/templates/index.html");
copy("src/web/templates/result.html", "dist/web/templates/result.html");
copy("src/web/static/style.css", "dist/web/static/style.css");

const imgDir = path.join(root, "src/web/static/img");
for (const f of fs.readdirSync(imgDir)) {
  copy(`src/web/static/img/${f}`, `dist/web/static/img/${f}`);
}

console.log("Assets copied to dist/");

function copy(src, dest) {
  fs.copyFileSync(path.join(root, src), path.join(root, dest));
}
