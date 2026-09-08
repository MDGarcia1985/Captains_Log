/* File: metro.config.js
 * Purpose: Enable Expo SQLite's documented WebAssembly asset for HUD web verification.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025
 * Reference: https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#web-setup */
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm');
module.exports = config;
