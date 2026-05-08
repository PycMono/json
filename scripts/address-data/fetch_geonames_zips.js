#!/usr/bin/env node
/**
 * Fetch GeoNames postal code data for all 41 supported countries,
 * process into compact JSON: { countries: { CC: { city: zip } } }
 * Store ONE representative zip per city to keep file size small.
 *
 * Usage: node scripts/address-data/fetch_geonames_zips.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COUNTRIES = [
  'US','GB','CA','AU','DE','FR','IT','ES','NL','SE','PL','PT','CZ','GR','UA','RU',
  'CN','JP','KR','TW','IN','SG','TH','VN','PH','ID','MY',
  'BR','MX','AR','CO','CL','PE',
  'TR','AE','SA','IL','EG',
  'ZA','NG','KE',
];

const BASE_URL = 'http://download.geonames.org/export/zip/';
const OUT_PATH = path.join(__dirname, '..', '..', 'frontend', 'static', 'datasets', 'address', 'zips.v1.json');
const TMP_DIR = path.join(__dirname, 'tmp_zip');

function parseZipData(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const records = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 5) continue;
    records.push({
      zip: parts[1],
      city: parts[2],
      state: parts[3],
      stateCode: parts[4],
    });
  }
  return records;
}

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const allData = {};

  for (const code of COUNTRIES) {
    const zipFile = path.join(TMP_DIR, `${code}.zip`);
    const url = `${BASE_URL}${code}.zip`;
    console.log(`  fetching ${code}...`);

    try {
      // Download ZIP file
      execSync(`curl -sL -o "${zipFile}" "${url}"`, { timeout: 60000 });

      const stat = fs.statSync(zipFile);
      if (stat.size < 100) {
        console.log(`  SKIP ${code} (file too small: ${stat.size} bytes)`);
        continue;
      }

      // Check if it's a valid ZIP
      try {
        execSync(`unzip -t "${zipFile}" 2>&1`, { timeout: 10000 });
      } catch (e) {
        console.log(`  SKIP ${code} (invalid zip file)`);
        continue;
      }

      // Extract ZIP
      execSync(`unzip -o "${zipFile}" -d "${TMP_DIR}"`, { timeout: 30000 });

      // Find extracted .txt file
      const files = fs.readdirSync(TMP_DIR).filter(f => f.startsWith(code) && f.endsWith('.txt'));
      if (files.length === 0) {
        console.log(`  SKIP ${code} (no .txt file)`);
        continue;
      }
      const extractedFile = path.join(TMP_DIR, files[0]);

      const records = parseZipData(extractedFile);
      if (records.length === 0) {
        console.log(`  SKIP ${code} (no records)`);
        continue;
      }

      // Store ONE zip per city (first one found) - super compact
      // Format: { "cityName": "zipCode" }
      const cityZipMap = {};
      for (const r of records) {
        // Normalize city name to lowercase for matching
        const cityLower = r.city.toLowerCase().trim();
        if (!cityZipMap[cityLower]) {
          cityZipMap[cityLower] = r.zip;
        }
      }

      allData[code] = cityZipMap;
      console.log(`  ${code}: ${Object.keys(cityZipMap).length} cities`);

      // Cleanup
      fs.unlinkSync(extractedFile);
      fs.unlinkSync(zipFile);
    } catch (err) {
      console.error(`  ERROR ${code}: ${err.message}`);
    }
  }

  const output = {
    version: 'v1',
    source: 'http://download.geonames.org/export/zip/',
    license: 'CC BY 4.0 (credit geonames.org)',
    countries: allData,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output));
  const sizeKB = (Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1);
  console.log(`\nSaved to ${OUT_PATH} (${sizeKB} KB)`);

  // Cleanup tmp dir
  try { fs.rmSync(TMP_DIR, { recursive: true }); } catch (e) {}

  // Summary
  console.log('\nSummary:');
  const withData = [];
  const noData = [];
  for (const code of COUNTRIES) {
    if (allData[code] && Object.keys(allData[code]).length > 0) {
      withData.push(`${code}:${Object.keys(allData[code]).length}`);
    } else {
      noData.push(code);
    }
  }
  console.log('  WITH DATA:', withData.join(', '));
  console.log('  NO DATA:', noData.join(', '));
}

main().catch(console.error);