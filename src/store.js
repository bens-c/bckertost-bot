const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadJson(fileName, fallback) {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return structuredClone(fallback);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function saveJson(fileName, value) {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

module.exports = {
  loadJson,
  saveJson
};
