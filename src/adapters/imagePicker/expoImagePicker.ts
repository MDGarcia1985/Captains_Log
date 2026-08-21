/*
 * File: expoImagePicker.ts
 *
 * Purpose:
 *     Camera and gallery capture through expo-image-picker.
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

import * as ImagePicker from 'expo-image-picker';

import type { ImageCaptureSource } from '@/models/contracts';
import type { CapturedImage } from '@/models/types';

/*
 * Purpose: Normalize picker assets into the domain CapturedImage shape.
 * Design: Default MIME to jpeg so camera captures without mimeType still store.
 * Workflow: Called after a successful camera or gallery result.
 * Data Handoff: Returns a CapturedImage for AttachmentStorage.storeImage.
 */
function toCaptured(asset: ImagePicker.ImagePickerAsset): CapturedImage {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    width: asset.width ?? null,
    height: asset.height ?? null,
    fileName: asset.fileName ?? null,
  };
}

/*
 * Purpose: Isolate expo-image-picker behind ImageCaptureSource.
 * Design: Request permission only when the user taps Camera or Gallery, never at launch.
 * Workflow: Constructed by createAppServices for AttachmentService.
 * Data Handoff: Returns camera/gallery/permission methods used by CaptureScreen.
 */
export function createExpoImagePicker(): ImageCaptureSource {
  return {
    /*
     * Purpose: Capture a still photo from the device camera.
     * Design: quality 1 preserves the original; return null on deny/cancel so capture text can still be saved.
     * Workflow: Invoked from CaptureScreen's Camera control.
     * Data Handoff: Returns CapturedImage or null to draft state, then AttachmentService on commit.
     */
    async captureFromCamera() {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
      });
      if (result.canceled || !result.assets[0]) {
        return null;
      }
      return toCaptured(result.assets[0]);
    },

    /*
     * Purpose: Attach an existing gallery photo.
     * Design: Same cancel/deny-null contract as camera so Commit Log is never blocked.
     * Workflow: Invoked from CaptureScreen's Gallery control.
     * Data Handoff: Returns CapturedImage or null into the capture draft.
     */
    async pickFromGallery() {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
      });
      if (result.canceled || !result.assets[0]) {
        return null;
      }
      return toCaptured(result.assets[0]);
    },

    /*
     * Purpose: Surface camera/gallery permission state in Settings.
     * Design: Map granted/canAskAgain onto granted/undetermined/denied for telemetry labels.
     * Workflow: Called by SettingsScreen reload, not at app launch.
     * Data Handoff: Returns status strings for CAMERA and GALLERY telemetry.
     */
    async getPermissionStatus() {
      const camera = await ImagePicker.getCameraPermissionsAsync();
      const gallery = await ImagePicker.getMediaLibraryPermissionsAsync();
      return {
        camera: camera.granted ? 'granted' : camera.canAskAgain ? 'undetermined' : 'denied',
        gallery: gallery.granted ? 'granted' : gallery.canAskAgain ? 'undetermined' : 'denied',
      };
    },
  };
}
