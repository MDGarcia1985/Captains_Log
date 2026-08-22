/*
 * File: src/adapters/googleDrive/backupPolicy.ts
 *
 * Purpose:
 *     Drive snapshot policy constants with no platform imports.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-08-21-003, DEV-2026-08-21-004
 */

export const DRIVE_BACKUP_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_BACKUP_ROOT_NAME = "Captain's Log Backups";
export const DRIVE_BACKUP_RETENTION = 7;
export const DRIVE_DATABASE_FILE_NAME = 'captains-log.db';
export const DRIVE_MANIFEST_FILE_NAME = 'manifest.json';
