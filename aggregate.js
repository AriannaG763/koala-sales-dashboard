// Aggregates the "Prodotti da Shopify" Google Sheet CSV export into the two
// compact arrays the dashboard template needs. Run: node aggregate.js <csv_path> <out_dir>
const fs = require('fs');

const csvPath = process.argv[2];
const outDir = process.argv[3];

const text = fs.readFileSync(csvPath, 'utf8');
const lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
const header = lines[0].split(',');
const expected = ['date', 'category', 'product', 'variant', 'country', 'revenue', 'units', 'gross', 'returns', 'orders'];
for (let i = 0; i < expected.length; i++) {
  if (header[i] !== expected[i]) {
    throw new Error('CSV header mismatch at column ' + i + ': expected "' + expected[i] + '", got "' + header[i] + '"');
  }
}

const catProdMap = new Map();
const catProdVarMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const f = lines[i].split(',');
  if (f.length !== 10) continue;
  const date = f[0], category = f[1], product = f[2], variant = f[3];
  const revenue = parseFloat(f[5]) || 0;
  const units = parseInt(f[6], 10) || 0;

  const k1 = date + '|' + category + '|' + product;
  let e1 = catProdMap.get(k1);
  if (!e1) { e1 = { date: date, category: category, product: product, units: 0, revenue: 0 }; catProdMap.set(k1, e1); }
  e1.units += units;
  e1.revenue += revenue;

  const k2 = k1 + '|' + variant;
  let e2 = catProdVarMap.get(k2);
  if (!e2) { e2 = { date: date, category: category, product: product, variant: variant, units: 0, revenue: 0 }; catProdVarMap.set(k2, e2); }
  e2.units += units;
  e2.revenue += revenue;
}

function round2(n) { return Math.round(n * 100) / 100; }

const dailyCatProduct = Array.from(catProdMap.values())
  .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
  .map(function (e) { return [e.date, e.category, e.product, e.units, round2(e.revenue)]; });

const productDetailDaily = Array.from(catProdVarMap.values())
  .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
  .map(function (e) { return [e.date, e.category, e.product, e.variant, e.units, round2(e.revenue)]; });

fs.writeFileSync(outDir + '/dailyCatProduct.json', JSON.stringify(dailyCatProduct));
fs.writeFileSync(outDir + '/productDetailDaily.json', JSON.stringify(productDetailDaily));

console.log('dailyCatProduct rows:', dailyCatProduct.length);
console.log('productDetailDaily rows:', productDetailDaily.length);
console.log('date range:', dailyCatProduct[0][0], '->', dailyCatProduct[dailyCatProduct.length - 1][0]);
