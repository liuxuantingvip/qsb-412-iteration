import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { Resvg } from '@resvg/resvg-js';

// Build-time preview only. Read the monitoring page's real prototype records;
// production must capture the strategy-selected view at its push cutoff.
const source = new URL('../src/pages/etlDataMonitoringOptimization/index.tsx', import.meta.url);
const compiled = buildSync({
  stdin: { contents: `${readFileSync(source, 'utf8')}\nexport { tableRecords, createTableDrilldownRecords, classifyTaskFinalStatus };`, resolveDir: fileURLToPath(new URL('.', source)), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  loader: { '.less': 'empty' }, jsx: 'automatic',
}).outputFiles[0].text;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(import.meta.url), loaded, loaded.exports);
const { tableRecords, createTableDrilldownRecords, classifyTaskFinalStatus } = loaded.exports;
for (const [tableKey, prefix] of [['table-1', 'monitor'], ['table-2', 'monitor-settlement']]) {
const table = tableRecords.find(row => row.key === tableKey);
// Reuse the populated prototype scenario; align its displayed business date to this preview.
const records = createTableDrilldownRecords(table, '2026-07-14').map(row => ({ ...row, bizDateRange: '2026-09-02' }));
if (!records.length) throw new Error('监控预览样例不能为空');
const columns = [
  ['platform', '子平台', 120], ['bizDateRange', '数据日期', 220], ['dataCycle', '数据周期', 92],
  ['tableName', '报表表名(中文)', 180], ['tableNameEn', '报表表名(英文)', 200],
  ['connectorName', '数据源', 180], ['storeName', '店铺', 180], ['taskName', '关联计划', 210],
  ['storageLocation', '存储位置', 190], ['operation', '操作', 156],
];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const width = columns.reduce((sum, [, , size]) => sum + size, 0);
for (const [name, rows] of [
  [`${prefix}-progress`, records],
  [`${prefix}-exception`, records.filter(row => ['failed', 'abnormal'].includes(classifyTaskFinalStatus(row)))],
]) {
  const height = 44 + rows.length * 64;
  let x = 0;
  const cells = columns.map(([key, title, size]) => {
    const left = x;
    x += size;
    const text = (value, y, color) => {
      let line = ''; let used = 0;
      for (const character of String(value)) {
        const next = character.charCodeAt(0) > 255 ? 14 : 7.3;
        if (used + next > size - 34) { line += '…'; break; }
        line += character; used += next;
      }
      return `<text x="${left + 16}" y="${y}" fill="${color}">${escape(line)}</text>`;
    };
    return `<path d="M${left} 0V${height}" stroke="#e5e6eb"/>${text(title, 28, '#1d2129')}` + rows.map((row, index) => {
      const value = key === 'operation' ? (row.collectStatus === '失败' || row.importStatus === '失败' ? '日志  重试' : '日志') : row[key];
      return text(value, 82 + index * 64, ['taskName', 'operation'].includes(key) ? '#165dff' : '#1d2129');
    }).join('');
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><rect width="100%" height="44" fill="#f2f3f5"/><g font-family="PingFang SC, Arial" font-size="14">${cells}</g>${Array.from({ length: rows.length + 1 }, (_, i) => `<path d="M0 ${44 + i * 64}H${width}" stroke="#e5e6eb"/>`).join('')}<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" fill="none" stroke="#e5e6eb"/></svg>`;
  const output = new URL(`../public/push-message-preview/${name}.png`, import.meta.url);
  writeFileSync(output, new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 }, font: { loadSystemFonts: true } }).render().asPng());
  console.log(`${name}: ${rows.length} rows, ${width} × ${height}, source=${table.tableName}`);
}
}
