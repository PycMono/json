const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const addressJsPath = path.join(root, 'frontend/static/js/address.js');
const rulesPath = path.join(root, 'frontend/static/datasets/address/rules.v1.json');
const reportJsonPath = path.join(root, 'frontend/static/datasets/address/validation-report.v1.json');
const reportMdPath = path.join(root, 'frontend/static/datasets/address/validation-report.v1.md');
const csvPath = path.join(root, 'frontend/static/datasets/address/validation-failures.v1.csv');

const source = fs.readFileSync(addressJsPath, 'utf8');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

const sandbox = {
  localStorage: { getItem: () => '[]', setItem: () => {}, removeItem: () => {} },
  window: { addEventListener: () => {}, addressTranslations: {} },
  document: { getElementById: () => null, querySelectorAll: () => [] },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  Blob: function Blob() {},
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  setTimeout,
  Date,
  Math,
  console,
  fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
};

vm.createContext(sandbox);
vm.runInContext(
  `${source}\n;globalThis.__addrExports={DATA,COUNTRIES,generateOne,pickGeoLinked,generateZip,generateNationalId,generateTaxId};`,
  sandbox
);

const { DATA, COUNTRIES, generateOne, generateNationalId, generateTaxId } = sandbox.__addrExports;
const countryCodes = Object.keys(COUNTRIES).filter((c) => c !== 'random');
const sampleSize = Number(process.argv[2] || 200);

function bucketForState(d, state) {
  const states = d.states || [];
  const cities = d.cities || [];
  const idx = Math.max(0, states.indexOf(state));
  const size = Math.max(1, Math.ceil(cities.length / Math.max(1, states.length)));
  const start = idx * size;
  const end = Math.min(cities.length, start + size);
  return new Set(cities.slice(start, end));
}

function matches(regexStr, value) {
  if (!regexStr) return true;
  return new RegExp(regexStr).test(value || '');
}

const report = {
  version: 'v1',
  generatedAt: new Date().toISOString(),
  sampleSize,
  countries: {},
  summary: { total: countryCodes.length, pass: 0, fail: 0 },
};

const csvRows = ['Country,SampleIndex,Field,ExpectedPattern,ActualValue'];

for (const code of countryCodes) {
  const d = DATA[code];
  const rule = (rules.countries && rules.countries[code]) || {};
  const failures = [];

  for (let i = 0; i < sampleSize; i += 1) {
    const p = generateOne(code, 'random', true, false, false);

    if (!p.state || !p.city || !p.street || !p.zip) {
      failures.push(`missing geo fields at sample ${i}`);
      csvRows.push(`${code},${i},geo_fields,"state/city/street/zip required","state=${p.state} city=${p.city} street=${p.street} zip=${p.zip}"`);
      continue;
    }

    if (d && Array.isArray(d.states) && !d.states.includes(p.state)) {
      failures.push(`state not in country state list at sample ${i}: ${p.state}`);
      csvRows.push(`${code},${i},state,"${d.states.join('|')}",${p.state}`);
      continue;
    }

    if (d && Array.isArray(d.cities) && !d.cities.includes(p.city)) {
      failures.push(`city not in country city list at sample ${i}: ${p.city}`);
      csvRows.push(`${code},${i},city,"${(d.cities||[]).slice(0,5).join('|')}...",${p.city}`);
      continue;
    }

    if (d && Array.isArray(d.streets) && !d.streets.includes(p.street)) {
      failures.push(`street not in country street list at sample ${i}: ${p.street}`);
      csvRows.push(`${code},${i},street,"${(d.streets||[]).slice(0,5).join('|')}...",${p.street}`);
      continue;
    }

    if (d && Array.isArray(d.states) && Array.isArray(d.cities)) {
      const cityBucket = bucketForState(d, p.state);
      if (cityBucket.size > 0 && !cityBucket.has(p.city)) {
        failures.push(`state-city bucket mismatch at sample ${i}: ${p.state} -> ${p.city}`);
        csvRows.push(`${code},${i},state_city,"${p.state}->bucket",${p.state}->${p.city}`);
        continue;
      }
    }

    // Zip regex check
    if (!matches(rule.zipRegex, p.zip)) {
      failures.push(`zip mismatch at sample ${i}: ${p.zip} vs ${rule.zipRegex}`);
      csvRows.push(`${code},${i},zip,"${rule.zipRegex}",${p.zip}`);
      continue;
    }

    // ID/SSN regex check
    if (!matches(rule.idRegex, p.ssn)) {
      failures.push(`id/ssn mismatch at sample ${i}: ${p.ssn} vs ${rule.idRegex}`);
      csvRows.push(`${code},${i},ssn,"${rule.idRegex}",${p.ssn}`);
    }

    // Tax ID regex check
    if (!matches(rule.taxRegex, p.taxId)) {
      failures.push(`taxId mismatch at sample ${i}: ${p.taxId} vs ${rule.taxRegex}`);
      csvRows.push(`${code},${i},taxId,"${rule.taxRegex}",${p.taxId}`);
    }

    // Passport regex check
    if (!matches(rule.passportRegex, p.passport)) {
      failures.push(`passport mismatch at sample ${i}: ${p.passport} vs ${rule.passportRegex}`);
      csvRows.push(`${code},${i},passport,"${rule.passportRegex}",${p.passport}`);
    }

    // License regex check
    if (!matches(rule.licenseRegex, p.license)) {
      failures.push(`license mismatch at sample ${i}: ${p.license} vs ${rule.licenseRegex}`);
      csvRows.push(`${code},${i},license,"${rule.licenseRegex}",${p.license}`);
    }

    if (!p.ssn || !p.taxId || !p.email || !p.job || !p.department || !p.education) {
      failures.push(`missing profile/compliance fields at sample ${i}`);
      csvRows.push(`${code},${i},profile,"email/job/department/education required","email=${!!p.email} job=${!!p.job} dept=${!!p.department} edu=${!!p.education}"`);
      continue;
    }
  }

  const passed = failures.length === 0;
  report.countries[code] = {
    pass: passed,
    checked: sampleSize,
    failureCount: failures.length,
    failures: failures.slice(0, 15),
  };

  if (passed) report.summary.pass += 1;
  else report.summary.fail += 1;
}

fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));

// Write CSV if there are failures
if (report.summary.fail > 0) {
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`csv report: ${csvPath}`);
}

const mdLines = [
  '# Address Generator Validation Report',
  '',
  `- GeneratedAt: ${report.generatedAt}`,
  `- SampleSizePerCountry: ${sampleSize}`,
  `- TotalCountries: ${report.summary.total}`,
  `- Pass: ${report.summary.pass}`,
  `- Fail: ${report.summary.fail}`,
  '',
  '| Country | Result | Failures |',
  '| --- | --- | --- |',
];

for (const code of countryCodes.sort()) {
  const r = report.countries[code];
  mdLines.push(`| ${code} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.failureCount} |`);
}

mdLines.push('', '## Failure Samples', '');
for (const code of countryCodes.sort()) {
  const r = report.countries[code];
  if (r.pass) continue;
  mdLines.push(`### ${code}`);
  for (const f of r.failures) mdLines.push(`- ${f}`);
  mdLines.push('');
}

fs.writeFileSync(reportMdPath, mdLines.join('\n'));

if (report.summary.fail > 0) {
  console.error(`validation failed: ${report.summary.fail} countries`);
  process.exit(1);
}

console.log(`validation passed: ${report.summary.pass}/${report.summary.total} countries`);
console.log(`json report: ${reportJsonPath}`);
console.log(`md report: ${reportMdPath}`);
