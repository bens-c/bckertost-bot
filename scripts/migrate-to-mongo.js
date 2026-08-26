#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Prefer an explicit non-SRV URI if provided (useful when SRV DNS resolution fails)
const uri = process.env.MONGO_URI_NONSRV || process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || 'bckertost';
const dataDir = path.join(__dirname, '..', 'data');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');
let showFile = null;
const showIndex = args.indexOf('--show');
if (showIndex !== -1 && args.length > showIndex + 1) showFile = args[showIndex + 1];

async function main() {
  if (!fs.existsSync(dataDir)) {
    console.error('No data directory found at', dataDir);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No JSON files found in', dataDir);
    return;
  }

  if (dryRun) {
    console.log('DRY RUN: The following files would be migrated:');
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      let raw = '';
      try {
        raw = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        console.warn('  [error reading]', file);
        continue;
      }

      let valuePreview = raw.slice(0, 400).replace(/\n/g, ' ');
      if (raw.length > 400) valuePreview += '...';
      console.log(`  - ${file}: ${valuePreview}`);
    }

    if (showFile) {
      const target = files.find((f) => f === showFile || f === `${showFile}.json`);
      if (!target) {
        console.error('Requested file not found:', showFile);
        return;
      }
      const content = fs.readFileSync(path.join(dataDir, target), 'utf8');
      console.log('\n--- FILE CONTENT (' + target + ') ---\n');
      console.log(content);
    }

    console.log('\nDRY RUN complete. No network or DB operations were performed.');
    return;
  }

  if (!uri) {
    console.error('MONGO_URI is not set in your environment. Set MONGO_URI to run migration.');
    process.exit(1);
  }
  console.log('Using Mongo URI type:', process.env.MONGO_URI_NONSRV ? 'non-SRV (MONGO_URI_NONSRV)' : 'SRV (MONGO_URI)');
  let effectiveUri = uri;

  // If user supplied an SRV URI, but system DNS fails, try to resolve SRV/TXT using a public resolver
  if (!process.env.MONGO_URI_NONSRV && uri.startsWith('mongodb+srv://')) {
    try {
      const dns = require('dns').promises;
      const tmp = uri.replace(/^mongodb\+srv:\/\//, 'http://');
      const parsed = new URL(tmp);
      const srvHost = parsed.hostname; // e.g. cluster0.xyz.mongodb.net

      // try default resolve first
      let srvRecords = null;
      try {
        srvRecords = await dns.resolveSrv(`_mongodb._tcp.${srvHost}`);
      } catch (err) {
        // try Google's public DNS as fallback
        const { Resolver } = require('dns');
        const resolver = new Resolver();
        resolver.setServers(['8.8.8.8', '8.8.4.4']);
        srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${srvHost}`);
      }

      if (srvRecords && srvRecords.length > 0) {
        // build host list
        const hosts = srvRecords.map((r) => `${r.name}:${r.port}`);

        // attempt to read TXT options (may include replicaSet etc)
        let txtOpts = '';
        try {
          const txt = await dns.resolveTxt(srvHost);
          // txt is array of arrays; join each TXT entry
          const joined = txt.map((arr) => arr.join('')).join('&');
          txtOpts = joined;
        } catch (e) {
          txtOpts = '';
        }

        const username = parsed.username ? encodeURIComponent(parsed.username) : '';
        const password = parsed.password ? encodeURIComponent(parsed.password) : '';
        const dbNameFromUri = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace('/', '') : '';
        const originalParams = parsed.searchParams.toString();

        // merge params: originalParams + txtOpts
        let mergedParams = '';
        if (originalParams && txtOpts) mergedParams = originalParams + '&' + txtOpts;
        else if (originalParams) mergedParams = originalParams;
        else if (txtOpts) mergedParams = txtOpts;

        effectiveUri = `mongodb://${username}${password ? ':' + password : ''}${username ? '@' : ''}${hosts.join(',')}/${dbNameFromUri}${mergedParams ? '?' + mergedParams : ''}`;
        console.log('Constructed non-SRV URI from SRV records (using public DNS).');
      }
    } catch (err) {
      console.warn('SRV fallback resolution failed, will attempt direct SRV connect (may fail):', err.message);
    }
  }

  const client = new MongoClient(effectiveUri);
  await client.connect();
  const db = client.db(dbName);

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let raw;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.warn('Failed to read', filePath, err.message);
      continue;
    }

    let value;
    try {
      value = JSON.parse(raw);
    } catch (err) {
      console.warn('Invalid JSON in', filePath, err.message);
      continue;
    }

    const colName = file.replace(/\.json$/i, '');
    const col = db.collection(colName);
    await col.updateOne({ _id: 'data' }, { $set: { value } }, { upsert: true });
    console.log(`Migrated ${file} -> collection ${colName}`);
  }

  await client.close();
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
