/*
 * File: scripts/attachment-smoke.mjs
 * Purpose: Verify TASK-005 copy ordering and failure behavior at the native storage boundary.
 * Author: Michael Garcia
 * Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-11-034
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const pending = [];
const files = new Set(['file:///picker/photo.jpeg']);
const diagnostics = [];
const root = 'file:///documents/%2540archive%252Flog';
let manipulations = 0;

/** Purpose: Model SDK 57 copies that finish later. 
 * Design: Explicit completion controls the race.
 * Workflow: Used by the real adapter below. 
 * Data Handoff: Marks bytes available only on completion. 
 **/
class File {
  constructor(...parts) { this.uri = parts.map(part => part.uri ?? part).join('/'); }
  get size() { return files.has(this.uri) ? 123 : 0; }
  copy(destination) {
    return new Promise((resolve, reject) => pending.push({
      complete: () => { files.add(destination.uri); resolve(); }, reject,
    }));
  }
}
class Directory extends File { create() {} }

const native = {
  'expo-file-system': { File, Directory, Paths: { document: root } },
  'expo-image-manipulator': {
    SaveFormat: { JPEG: 'jpeg' },
    async manipulateAsync(uri) {
      assert.ok(files.has(uri), 'original bytes must exist before thumbnail generation');
      manipulations += 1;
      return { uri: 'file:///cache/thumb.jpg' };
    },
  },
  '@/utilities/diagnostics': { recordDiagnostic: (...args) => diagnostics.push(args) },
};
const bundle = await build({
  entryPoints: ['src/adapters/filesystem/attachmentStorage.ts'], bundle: true,
  write: false, platform: 'node', format: 'cjs', external: Object.keys(native),
});
const module = { exports: {} };
const require = createRequire(import.meta.url);
runInNewContext(bundle.outputFiles[0].text, {
  module, exports: module.exports, require: name => native[name] ?? require(name),
});
const storage = module.exports.createFilesystemAttachmentStorage();
const image = { uri: 'file:///picker/photo.jpeg', mimeType: 'image/jpeg', fileName: 'photo.jpeg', width: 10, height: 20 };
const tick = () => new Promise(resolve => setImmediate(resolve));

let settled = false;
const stored = storage.storeImage(image, 'new').then(value => { settled = true; return value; });
await tick();
assert.equal(manipulations, 0, 'must await original copy');
assert.equal(settled, false);
pending.shift().complete();
await tick();
assert.equal(manipulations, 1);
assert.equal(settled, false, 'must await thumbnail copy before metadata can be persisted');
pending.shift().complete();
const result = await stored;
assert.equal(result.fileUri, `${root}/attachments/new/original.jpeg`);
assert.equal(result.thumbnailUri, `${root}/attachments/new/thumb.jpg`);
assert.ok(files.has(result.thumbnailUri));
assert.equal(result.size, 123);
assert.equal(diagnostics.length, 0);

const failedCopy = storage.storeImage(image, 'failed-original');
const rejectedCopy = assert.rejects(failedCopy, /original unavailable/);
pending.shift().reject(new Error('original unavailable'));
await rejectedCopy;
assert.equal(manipulations, 1, 'failed original must never be consumed or returned for persistence');

const failedThumb = storage.storeImage(image, 'failed-thumb');
pending.shift().complete();
await tick();
pending.shift().reject(new Error('thumbnail unavailable'));
const fallback = await failedThumb;
assert.equal(fallback.thumbnailUri, fallback.fileUri);
assert.ok(files.has(fallback.fileUri));
assert.equal(diagnostics.length, 1);
assert.equal(diagnostics[0][0], 'attachment.thumbnail');
assert.equal(storage.managedUri('existing', 'original.jpeg'), `${root}/attachments/existing/original.jpeg`);
assert.equal(pending.length, 0);
console.log('PASS TASK-005 attachment copy ordering, URI preservation, and failure fallback');
