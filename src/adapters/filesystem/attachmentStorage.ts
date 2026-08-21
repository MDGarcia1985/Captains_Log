/*
 * File: attachmentStorage.ts
 *
 * Purpose:
 *     Copy captured images into application-managed storage and make thumbnails.
 *
 * Author:
 *     Captain's Log contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 */

import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { AttachmentStorage } from '@/models/contracts';
import type { CapturedImage } from '@/models/types';

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
     * Design: Preserve the original bytes; thumbnail failure falls back to the original URI so save still succeeds.
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
      } catch {
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
     * Workflow: Called by GoogleDriveBackupProvider.backupAttachments.
     * Data Handoff: Returns uri/mimeType pairs for multipart Drive upload.
     */
    async listManagedFiles() {
      const root = new Directory(Paths.document, 'attachments');
      if (!root.exists) {
        return [];
      }
      const files: { uri: string; mimeType: string }[] = [];
      for (const item of root.list()) {
        if (item instanceof Directory) {
          for (const child of item.list()) {
            if (child instanceof File) {
              files.push({
                uri: child.uri,
                mimeType: child.name.endsWith('.png') ? 'image/png' : 'image/jpeg',
              });
            }
          }
        }
      }
      return files;
    },
  };
}
