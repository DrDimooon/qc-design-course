/* Mermaid initialization contracts; no browser or vendor library required. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function block(text) {
  return {
    source: text,
    wrapped: true,
    attributes: {},
    querySelector(selector) {
      return selector === 'code' && this.wrapped ? { textContent: this.source } : null;
    },
    get textContent() { return this.source; },
    set textContent(value) { this.source = value; this.wrapped = false; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
}

async function main() {
  const bad = block('invalid diagram');
  const good = block('flowchart LR\nA["Первый"] --> B["Второй"]');
  const nodes = [bad, good], calls = [], warnings = [], unhandled = [];
  const capture = error => unhandled.push(error);
  process.on('unhandledRejection', capture);
  try {
    const context = {
      console: { warn: (...args) => warnings.push(args) },
      document: {
        readyState: 'complete',
        body: { getAttribute: () => 'default' },
        querySelectorAll(selector) {
          assert.strictEqual(selector, '.qc-mermaid:not([data-processed]):not([data-qc-rendering])');
          return nodes.filter(node => !node.attributes['data-processed'] && !node.attributes['data-qc-rendering']);
        }
      },
      mermaid: {
        initialize() {},
        run({ nodes: selected }) {
          const node = selected[0];
          calls.push(node);
          assert.strictEqual(node.wrapped, false, 'Code wrapper must be removed before Mermaid reads HTML');
          if (node === bad) { return Promise.reject(new Error('Expected syntax error')); }
          return new Promise(resolve => setImmediate(() => {
            node.setAttribute('data-processed', 'true');
            resolve();
          }));
        }
      }
    };
    context.window = context;
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '../../assets/js/mermaid-init.js'), 'utf8');
    vm.runInContext(source, context);
    vm.runInContext(source, context); // Second initialization while both renders are pending.
    assert.strictEqual(calls.length, 2, 'In-flight blocks must not be queued twice');
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(warnings.length, 1, 'Asynchronous rejection must be handled per block');
    assert.strictEqual(unhandled.length, 0, 'No unhandled promise rejection');
    assert.strictEqual(good.attributes['data-processed'], 'true', 'A bad block must not prevent a good render');
    assert.ok(nodes.every(node => !node.attributes['data-qc-rendering']), 'In-flight flags must be cleared');
    assert.strictEqual(good.source, 'flowchart LR\nA["Первый"] --> B["Второй"]');
    console.log('Mermaid initialization: 7 contracts passed');
  } finally {
    process.removeListener('unhandledRejection', capture);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
