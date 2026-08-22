/*
 * File: attachmentService.ts
 *
 * Purpose:
 *     Store photos in managed files and link them to log entries.
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

import type { AttachmentRepository, AttachmentStorage, ImageCaptureSource } from '@/models/contracts';
import type { Attachment, CapturedImage } from '@/models/types';
import { createId } from '@/utilities/ids';
import { nowMs } from '@/utilities/time';

/*
 * Purpose: Store photos in managed files and link them to log entries.
 * Design: Filesystem copy happens before the SQLite metadata row so URIs are always real.
 * Workflow: Constructed by createAppServices; used by CaptureScreen and log/entity views.
 * Data Handoff: Returns Attachment records and picker/permission proxies to UI.
 */
export function createAttachmentService(deps: {
  attachments: AttachmentRepository;
  storage: AttachmentStorage;
  capture: ImageCaptureSource;
}) {
  return {
    /*
     * Purpose: Persist one photo against an already-saved entry.
     * Design: Allocate the attachment id first so storage and SQLite share the same identity.
     * Workflow: Called from EntryService.createEntry for each draft image.
     * Data Handoff: Writes a file plus attachments row; returns Attachment for in-memory confirmation.
     */
    async addAttachment(entryId: string, image: CapturedImage): Promise<Attachment> {
      const id = createId();
      const stored = await deps.storage.storeImage(image, id);
      const attachment: Attachment = {
        id,
        entryId,
        fileUri: stored.fileUri,
        thumbnailUri: stored.thumbnailUri,
        mimeType: stored.mimeType,
        width: stored.width,
        height: stored.height,
        size: stored.size,
        createdAt: nowMs(),
        role: null,
      };
      await deps.attachments.create(attachment);
      return attachment;
    },

    async getAttachments(entryId: string): Promise<Attachment[]> {
      return deps.attachments.listForEntry(entryId);
    },

    async getAttachmentsForEntity(entityId: string): Promise<Attachment[]> {
      return deps.attachments.listForEntity(entityId);
    },

    captureFromCamera() {
      return deps.capture.captureFromCamera();
    },

    pickFromGallery() {
      return deps.capture.pickFromGallery();
    },

    getPermissionStatus() {
      return deps.capture.getPermissionStatus();
    },
  };
}

export type AttachmentService = ReturnType<typeof createAttachmentService>;
