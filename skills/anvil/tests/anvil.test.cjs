/**
 * Anvil Suite Unit Tests
 * Verifies core compression heuristics, invariants, and safety mechanisms.
 */

'use strict';

const assert = require('assert');
const {
  stripAnsi,
  compressLogs,
  compressStackTrace,
  compressToolSchema,
  compressCsv,
  compressTestOutput,
  compressHtmlDom,
} = require('../scripts/anvil-compressor.cjs');
const { detectPayloadType } = require('../scripts/detect.cjs');

console.log('Running Anvil Suite Unit Tests...\n');

// 1. ANSI Strip Test
{
  const raw = '\x1b[31mError:\x1b[0m Connection failed\x1b[1m!';
  const stripped = stripAnsi(raw);
  assert.strictEqual(stripped, 'Error: Connection failed!');
  console.log('✓ stripAnsi strips terminal VT/ANSI codes');
}

// 2. Log Compression Test
{
  const rawLog = [
    '2026-10-21 10:00:01 [info] Server listening on port 3000',
    '2026-10-21 10:00:02 [debug] Heartbeat ping',
    '2026-10-21 10:00:03 [debug] Heartbeat pong',
    '2026-10-21 10:00:04 [error] Database query timeout on table users',
    '2026-10-21 10:00:05 [info] Recovered from temporary network glitch',
    '2026-10-21 10:00:06 [debug] Cache hit key=sess_123',
  ].join('\n');

  const compressed = compressLogs(rawLog);
  assert.ok(compressed.includes('… 3 lines elided (anvil) …'), 'Should elide first 3 nominal lines');
  assert.ok(compressed.includes('Database query timeout on table users'), 'Must retain error line');
  assert.ok(compressed.includes('… 2 lines elided (anvil) …'), 'Should elide last 2 nominal lines');
  console.log('✓ compressLogs isolates error signals and collapses nominal lines');
}

// 3. Stack Trace Compression Test
{
  const rawStack = [
    'Error: ECONNREFUSED 127.0.0.1:5432',
    '    at connect (/app/src/db/connection.ts:15:9)',
    '    at runQuery (/app/src/db/query.ts:45:12)',
    '    at getUserById (/app/src/models/user.ts:88:20)',
    '    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)',
    '    at trim_prefix (/app/node_modules/express/lib/router/index.js:328:13)',
    '    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
  ].join('\n');

  const compressed = compressStackTrace(rawStack);
  assert.ok(compressed.includes('Error: ECONNREFUSED'), 'Must keep error header');
  assert.ok(compressed.includes('/app/src/db/connection.ts'), 'Must keep application frame 1');
  assert.ok(compressed.includes('/app/src/db/query.ts'), 'Must keep application frame 2');
  assert.ok(compressed.includes('/app/src/models/user.ts'), 'Must keep application frame 3');
  assert.ok(compressed.includes('… 3 internal frames elided (anvil) …'), 'Must collapse express and node internals');
  console.log('✓ compressStackTrace filters runtime internals and preserves application frames');
}

// 4. Tool Schema Compression Test
{
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'DeployTool',
    description: 'This tool deploys a microservice to the specified cluster environment. Target environment must be one of staging or production.',
    examples: [{ env: 'staging' }],
    parameters: {
      type: 'object',
      properties: {
        env: {
          type: 'string',
          enum: ['staging', 'production'],
          description: 'The target environment name. Must be one of staging or production.',
        },
        timeout: {
          type: 'number',
          description: 'A very lengthy and superfluous explanation of the timeout duration that easily exceeds eighty characters and adds no value.',
        },
      },
      required: ['env'],
    },
  };

  const compressedStr = compressToolSchema(schema);
  const parsed = JSON.parse(compressedStr);
  assert.strictEqual(parsed.$schema, undefined, 'Must drop $schema');
  assert.strictEqual(parsed.title, undefined, 'Must drop title');
  assert.strictEqual(parsed.examples, undefined, 'Must drop examples');
  assert.strictEqual(parsed.parameters.required[0], 'env', 'Must keep required array verbatim');
  assert.ok(parsed.parameters.properties.env.description.includes('Must be one of'), 'Constraint description must be retained');
  assert.ok(parsed.parameters.properties.timeout.description.length <= 80, 'Non-constraint description must be truncated to <= 80 chars');
  console.log('✓ compressToolSchema drops annotation bloat while preserving selection invariants');
}

// 5. CSV Compression Test
{
  const rawCsv = [
    'id,status,latency',
    '1,OK,10',
    '2,OK,12',
    '3,OK,14',
    '4,FAILED,4000',
    '5,OK,11',
  ].join('\n');

  const compressed = compressCsv(rawCsv);
  assert.ok(compressed.includes('id,status,latency'), 'Must keep header');
  assert.ok(compressed.includes('… 3 rows elided (anvil) …'), 'Must collapse first 3 nominal rows');
  assert.ok(compressed.includes('4,FAILED,4000'), 'Must retain failed row');
  console.log('✓ compressCsv collapses nominal rows and retains anomalies');
}

// 6. Test Output Compression Test
{
  const rawTest = [
    'RUN tests/billing.test.ts',
    '  ✓ calculates base rate (4ms)',
    '  ✓ applies discount (2ms)',
    '  ✕ handles currency exchange',
    '    AssertionError: expected 100 to equal 120',
    '      - Expected: 120',
    '      + Received: 100',
    '        at tests/billing.test.ts:45:10',
    'Tests: 1 failed, 2 passed, 3 total',
  ].join('\n');

  const compressed = compressTestOutput(rawTest);
  assert.ok(!compressed.includes('calculates base rate'), 'Must strip passed tests');
  assert.ok(compressed.includes('handles currency exchange'), 'Must retain failure');
  assert.ok(compressed.includes('AssertionError: expected 100 to equal 120'), 'Must retain assertion diff');
  assert.ok(compressed.includes('Tests: 1 failed, 2 passed, 3 total'), 'Must retain summary');
  console.log('✓ compressTestOutput strips passing noise and retains failure diffs');
}

// 7. HTML DOM Extractor Test
{
  const rawHtml = `
    <html>
      <head><title>API Docs</title><style>body { color: red; }</style></head>
      <body>
        <nav><a href="/home">Home</a><a href="/login">Login</a></nav>
        <main>
          <h1>Authentication API</h1>
          <p>Use bearer token to authenticate requests.</p>
          <pre><code>const auth = "Bearer xyz";</code></pre>
        </main>
        <footer>Copyright 2026</footer>
      </body>
    </html>
  `;

  const compressed = compressHtmlDom(rawHtml);
  assert.ok(!compressed.includes('Login'), 'Must strip navigation');
  assert.ok(!compressed.includes('Copyright 2026'), 'Must strip footer');
  assert.ok(!compressed.includes('body { color: red; }'), 'Must strip style tags');
  assert.ok(compressed.includes('# Authentication API'), 'Must convert h1 to markdown');
  assert.ok(compressed.includes('const auth = "Bearer xyz";'), 'Must retain verbatim code block');
  console.log('✓ compressHtmlDom strips boilerplate and generates clean markdown');
}

// 8. Payload Detector Test
{
  assert.strictEqual(detectPayloadType('{"foo": "bar"}'), 'json');
  assert.strictEqual(detectPayloadType('<html><body><h1>Hello</h1></body></html>'), 'html');
  assert.strictEqual(detectPayloadType('Error: boom\n    at Object.<anonymous> (/app/index.js:5:1)'), 'stacktrace');
  assert.strictEqual(detectPayloadType('Tests: 1 failed, 4 passed\nAssertionError: expected 1 to equal 2'), 'test-output');
  assert.strictEqual(detectPayloadType('col1,col2,col3\n1,2,3\n4,5,6'), 'csv');
  assert.strictEqual(detectPayloadType('[2026-10-21 12:00:00] INFO Server started'), 'log');
  console.log('✓ detectPayloadType accurately classifies payload types');
}

console.log('\nAll 8 Anvil unit test suites passed successfully!\n');
