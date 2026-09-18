/* File: ui-geometry-validation.mjs
 * Purpose: Reject invalid canonical child/content rectangles before generation.
 * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0
 * Decision: TASK-007 / DEV-2026-09-14-001; export overflow must be explicit. */
import assert from 'node:assert/strict';

export function validateChildBounds(parent, child, label) {
  for (const key of ['x', 'y', 'width', 'height']) assert(Number.isFinite(child[key]), `${label}.${key} must be finite`);
  assert(child.width >= 0 && child.height >= 0, `${label} has negative size`);
  if (child.overflow === 'allow' || child.overflow === 'export') return;
  assert(child.x >= 0 && child.y >= 0 && child.x + child.width <= parent.width + 0.001 &&
    child.y + child.height <= parent.height + 0.001, `${label} outside parent bounds`);
}

export function validateContent(parent, content, label) {
  validateChildBounds(parent, content, label);
  assert.equal(content.policy, 'symmetric_insets');
  assert.equal(content.overflow, 'forbid');
  const { left, right, top, bottom } = content.insets;
  assert.equal(left, right); assert.equal(top, bottom);
  assert.equal(content.x, left); assert.equal(content.y, top);
  assert.equal(content.width, parent.width - left - right);
  assert.equal(content.height, parent.height - top - bottom);
}
