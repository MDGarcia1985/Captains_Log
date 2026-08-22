/*
 * File: scripts/node-smoke.ts
 *
 * Purpose:
 *     Node-runnable T1 checks for extraction, FTS query, Google client ID selection, and PBKDF2.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 */

import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import {
  DRIVE_BACKUP_RETENTION,
  DRIVE_BACKUP_ROOT_NAME,
  DRIVE_BACKUP_SCOPE,
} from '../src/adapters/googleDrive/backupPolicy.ts';
import { createDeterministicExtractionProvider } from '../src/adapters/extraction/deterministicExtraction.ts';
import { DATABASE_VERSION, PROCESSING_JOBS_SQL, SCHEMA_V1 } from '../src/adapters/sqlite/schema.ts';
import { toFtsQuery } from '../src/utilities/fts.ts';
import { selectGoogleClientId } from '../src/utilities/googleClientId.ts';
import { derivePasswordKey } from '../src/utilities/passwordKdf.ts';

const failures: string[] = [];

function assert(name: string, condition: boolean): void {
  if (!condition) {
    failures.push(name);
  }
}

const extraction = createDeterministicExtractionProvider();
const refs = extraction.extract('Talked to @Ada about #Engine and [[decision:Ship power]].');
assert('extracts person', refs.some((ref) => ref.type === 'person' && ref.name === 'Ada'));
assert('extracts project', refs.some((ref) => ref.type === 'project' && ref.name === 'Engine'));
assert('extracts wiki type', refs.some((ref) => ref.type === 'decision' && ref.name === 'Ship power'));

assert('fts strips operators', toFtsQuery('foo "bar"') === 'foo* bar*');
assert('fts empty', toFtsQuery('   ') === '');

const ids = { web: 'web-id', ios: 'ios-id', android: 'android-id' };
assert('ios client only', selectGoogleClientId('ios', ids) === 'ios-id');
assert('android client only', selectGoogleClientId('android', ids) === 'android-id');
assert('web client only', selectGoogleClientId('web', ids) === 'web-id');
assert('no fallback', selectGoogleClientId('android', { web: 'web-id', ios: '', android: '' }) === '');
assert('unknown platform empty', selectGoogleClientId('macos', ids) === '');

const rfcSalt = bytesToHex(utf8ToBytes('salt'));
assert(
  'pbkdf2 sha256 password/salt c=1',
  derivePasswordKey('password', rfcSalt, 1) ===
    '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b'
);

assert('database version is 2', DATABASE_VERSION === 2);
assert('schema v1 has entries', SCHEMA_V1.includes('CREATE TABLE IF NOT EXISTS entries'));
assert('v2 has processing_jobs', PROCESSING_JOBS_SQL.includes('CREATE TABLE IF NOT EXISTS processing_jobs'));
assert('drive.file scope', DRIVE_BACKUP_SCOPE === 'https://www.googleapis.com/auth/drive.file');
assert('retention is 7', DRIVE_BACKUP_RETENTION === 7);
assert('visible folder name', DRIVE_BACKUP_ROOT_NAME === "Captain's Log Backups");

if (failures.length > 0) {
  console.error('FAIL');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('PASS node-smoke');
console.log(`assertions=${16}`);
