/*
 * File: src/adapters/filesystem/attachmentStorage.ts
 *
 * Purpose:
 *     Copy captured images into application-managed storage and make thumbnails.
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
 *     DEV-2026-08-21-005, DEV-2026-08-21-010
 */

import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { AttachmentStorage } from '@/models/contracts';
import type { CapturedImage, RestoredAttachmentFile } from '@/models/types';
import { recordDiagnostic } from '@/utilities/diagnostics';

/*
 * Purpose: Choose a file extension that preserves the original image type.
 * Design: Prefer the picker filename, then MIME, defaulting to jpg for camera JPEGs.
 * Workflow: Called by storeImage before writing original.{ext}.
 * Data Handoff: Returns an extension string used in the managed file name.
 */
function extensionFor(mimeType: string, fileName: string | null): string {
  if (fileName && fileName.includes('.')) {
    return fileName.split('.').pop() as string;
  }
  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

function attachmentsRoot(): Directory {
  return new Directory(Paths.document, 'attachments');
}

function managedFile(attachmentId: string, fileName: string): File {
  return new File(new Directory(Paths.document, 'attachments', attachmentId), fileName);
}

/*
 * Purpose: Keep originals and thumbnails under application-controlled storage.
 * Design: One directory per attachment id so backup can walk files without SQLite.
 * Workflow: Constructed by createAppServices for AttachmentService and Drive backup.
 * Data Handoff: Returns an AttachmentStorage implementation.
 */
export function createFilesystemAttachmentStorage(): AttachmentStorage {
  return {
    /*
     * Purpose: Copy a captured image into managed storage and create a thumbnail.
     * Design: Preserve the original bytes; thumbnail failure is recorded and falls back to the original URI.
     * Workflow: Called by AttachmentService.addAttachment after camera/gallery returns a CapturedImage.
     * Data Handoff: Returns file/thumbnail URIs and dimensions stored in the attachments table.
     */
    async storeImage(image: CapturedImage, attachmentId: string) {
      const root = new Directory(Paths.document, 'attachments', attachmentId);
      root.create({ intermediates: true, idempotent: true });

      const ext = extensionFor(image.mimeType, image.fileName);
      const original = new File(root, `original.${ext}`);
      const source = new File(image.uri);
      source.copy(original);

      let thumbnailUri: string | null = null;
      try {
        const thumb = await manipulateAsync(
          original.uri,
          [{ resize: { width: 480 } }],
          { compress: 0.72, format: SaveFormat.JPEG }
        );
        const thumbFile = new File(root, 'thumb.jpg');
        new File(thumb.uri).copy(thumbFile);
        thumbnailUri = thumbFile.uri;
      } catch (error) {
        recordDiagnostic('attachment.thumbnail', error);
        thumbnailUri = original.uri;
      }

      return {
        fileUri: original.uri,
        thumbnailUri,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        size: original.size || null,
      };
    },

    /*
     * Purpose: Enumerate managed files for backup without going through SQLite.
     * Design: Walk attachments/{id} so originals and thumbs are both uploaded.
     * Workflow: Called by GoogleDriveBackupProvider snapshot creation.
     * Data Handoff: Returns uri/mimeType/attachmentId/fileName for multipart Drive upload.
     */
    async listManagedFiles() {
      const root = attachmentsRoot();
      if (!root.exists) {
        return [];
      }
      const files: { uri: string; mimeType: string; attachmentId: string; fileName: string }[] = [];
      for (const item of root.list()) {
        if (item instanceof Directory) {
          for (const child of item.list()) {
            if (child instanceof File) {
              files.push({
                uri: child.uri,
                mimeType: child.name.endsWith('.png') ? 'image/png' : 'image/jpeg',
                attachmentId: item.name,
                fileName: child.name,
              });
            }
          }
        }
      }
      return files;
    },

    async readFileBytes(uri: string) {
      const file = new File(uri);
      return file.bytes();
    },

    /*
     * Purpose: Replace local managed files with bytes from a selected snapshot.
     * Design: Delete the attachments directory then rewrite so leftover files cannot mix with the restore.
     * Workflow: Called during Drive restore after the database file has been replaced.
     * Data Handoff: Writes files under Paths.document/attachments/{id}/.
     */
    async replaceAllManagedFiles(files: RestoredAttachmentFile[]) {
      const root = attachmentsRoot();
      if (root.exists) {
        root.delete();
      }
      root.create({ intermediates: true, idempotent: true });
      for (const file of files) {
        const dir = new Directory(root, file.attachmentId);
        dir.create({ intermediates: true, idempotent: true });
        const dest = new File(dir, file.fileName);
        if (dest.exists) {
          dest.delete();
        }
        dest.create();
        dest.write(file.bytes);
      }
    },

    async fileExists(uri: string) {
      return new File(uri).exists;
    },

    managedUri(attachmentId: string, fileName: string) {
      return managedFile(attachmentId, fileName).uri;
    },
  };
}
