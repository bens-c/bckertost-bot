const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const dataDir = path.join(__dirname, "..", "data");

let mongoClient = null;
let db = null;
const mongoUriEnv = process.env.MONGO_URI_NONSRV || process.env.MONGO_URI || null;

async function init() {
  if (mongoUriEnv) {
    let effectiveUri = mongoUriEnv;

    // If the provided URI is an SRV URI and DNS resolution fails, try to build a non-SRV URI
    if (!process.env.MONGO_URI_NONSRV && mongoUriEnv.startsWith("mongodb+srv://")) {
      try {
        const dns = require("dns").promises;
        const tmp = mongoUriEnv.replace(/^mongodb\+srv:\/\//, "http://");
        const parsed = new URL(tmp);
        const srvHost = parsed.hostname;

        let srvRecords = null;
        try {
          srvRecords = await dns.resolveSrv(`_mongodb._tcp.${srvHost}`);
        } catch (err) {
          const { Resolver } = require("dns");
          const resolver = new Resolver();
          resolver.setServers(["8.8.8.8", "8.8.4.4"]);
          srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${srvHost}`);
        }

        if (srvRecords && srvRecords.length > 0) {
          const hosts = srvRecords.map((r) => `${r.name}:${r.port}`);

          let txtOpts = "";
          try {
            const txt = await dns.resolveTxt(srvHost);
            const joined = txt.map((arr) => arr.join("")).join("&");
            txtOpts = joined;
          } catch (e) {
            txtOpts = "";
          }

          const username = parsed.username ? encodeURIComponent(parsed.username) : "";
          const password = parsed.password ? encodeURIComponent(parsed.password) : "";
          const dbNameFromUri = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace("/", "") : "";
          const originalParams = parsed.searchParams.toString();

          let mergedParams = "";
          if (originalParams && txtOpts) mergedParams = originalParams + "&" + txtOpts;
          else if (originalParams) mergedParams = originalParams;
          else if (txtOpts) mergedParams = txtOpts;

          effectiveUri = `mongodb://${username}${password ? ':' + password : ''}${username ? '@' : ''}${hosts.join(',')}/${dbNameFromUri}${mergedParams ? '?' + mergedParams : ''}`;
        }
      } catch (err) {
        // fall through and try original SRV connect below
      }
    }

    mongoClient = new MongoClient(effectiveUri);
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGO_DB_NAME || "bckertost");
  } else {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function loadJson(fileName, fallback) {
  if (!mongoUriEnv) {
    ensureDataDir();
    const filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return JSON.parse(JSON.stringify(fallback));
    }

    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  }

  const colName = fileName.replace(/\.json$/i, "");
  const col = db.collection(colName);
  const doc = await col.findOne({ _id: "data" });

  if (!doc) {
    await col.updateOne({ _id: "data" }, { $set: { value: fallback } }, { upsert: true });
    return JSON.parse(JSON.stringify(fallback));
  }

  return doc.value;
}

async function saveJson(fileName, value) {
  if (!mongoUriEnv) {
    ensureDataDir();
    const filePath = path.join(dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    return;
  }

  const colName = fileName.replace(/\.json$/i, "");
  const col = db.collection(colName);
  await col.updateOne({ _id: "data" }, { $set: { value } }, { upsert: true });
}

async function close() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
  }
}

module.exports = {
  init,
  loadJson,
  saveJson,
  close
};
