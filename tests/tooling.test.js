const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

test('package.json exposes lint, prettier and ci scripts', () => {
    const pkg = JSON.parse(
        fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    );

    assert.equal(typeof pkg.scripts?.test, 'string');
    assert.equal(typeof pkg.scripts?.lint, 'string');
    assert.equal(typeof pkg.scripts?.format, 'string');
    assert.equal(typeof pkg.scripts?.['format:check'], 'string');
    assert.equal(typeof pkg.scripts?.ci, 'string');
});

test('repository contains a pre-commit hook and github actions workflow', () => {
    const preCommitPath = path.join(repoRoot, '.husky', 'pre-commit');
    const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');

    assert.equal(fs.existsSync(preCommitPath), true);
    assert.equal(fs.existsSync(workflowPath), true);
});

test('manifest loads the extension on Badoo messages and connections routes', () => {
    const manifest = JSON.parse(
        fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'),
    );
    const matches = manifest.content_scripts?.[0]?.matches || [];

    assert.equal(matches.includes('https://badoo.com/messages/*'), true);
    assert.equal(matches.includes('https://badoo.com/connections/*'), true);
});
