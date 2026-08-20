### Annotation Standards Guidelines

For source files, the primary goal is to make the file’s contents and responsibility immediately clear to both human developers and LLM-based agents.

Each file header should include:

* File name
* Purpose
* Author or contributors
* Contact information
* Project license, or a file-specific license when it differs from the project license

Function-level documentation should be added when a function’s purpose, behavior, inputs, outputs, or side effects would not be obvious to a beginner or to someone unfamiliar with the language or subsystem.

Use inline comments for implementation details that require local explanation, such as:

* Why a particular integer type or width was selected
* The meaning of a constant, mask, register value, or unit
* A non-obvious algorithmic step
* Hardware-specific behavior
* Safety-critical assumptions or constraints

Comments should explain intent and reasoning rather than restating the code.

Avoid:

* Large walls of documentation that obscure the implementation
* Comments that merely repeat the following line
* Unnecessarily compressed single-line functions
* Excessive notes for code that is already clear from its names and structure

Use notes sparingly for code that is genuinely opaque, unusual, safety-critical, or likely to confuse a new contributor.


### File Header
/*
 * File: geometry.c
 *
 * Purpose:
 *     Validate room coordinates and calculate placement geometry.
 *
 * Author:
 *     FollowMe Speakers contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 */


### Function Header
/**
 * Calculate an object's perpendicular distance from every room wall.
 *
 * Purpose:
 *     Provide the UI and tracking services with one canonical wall-distance
 *     result.
 *
 * Design:
 *     Use integer centimetres in the lower-left room coordinate frame. Reject
 *     invalid points instead of silently clamping them.
 *
 * Workflow:
 *     Validate the point, subtract its coordinates from the room dimensions,
 *     and return the four named distances.
 *
 * Data Handoff:
 *     Receives validated Room and Point structures and writes a WallDistances
 *     result consumed by crosshair labels, snapping rules, and API
 *     serialization.
 *
 * @param room      Pointer to the room dimensions.
 * @param point     Pointer to the object position.
 * @param distances Pointer to the output wall-distance structure.
 *
 * @return true if the point is valid and the distances were calculated;
 *         false if any pointer is null or the point lies outside the room.
 */
bool wall_distances(
    const Room *room,
    const Point *point,
    WallDistances *distances
);