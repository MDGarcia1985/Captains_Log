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


Function-level documentation is required for every function that is longer than a single line or whose behavior is opaque. Use this header:

```
/*
 * Purpose: Why the function exists
 * Design: Why the function is structured the way it is and what decision lead to this form.
 * Workflow: Where in the workflow this function belongs and what information or inputs it is expecting and from where.
 * Data Handoff: What the functions data output is and to what system/function it is intended for next.
 */
```

### Function Header

```
/*
 * Purpose: Provide the UI and tracking services with one canonical wall-distance result.
 * Design: Use integer centimetres in the lower-left room coordinate frame. Reject invalid points instead of silently clamping them.
 * Workflow: Called after room and point validation; subtracts the point from room dimensions.
 * Data Handoff: Writes a WallDistances result consumed by crosshair labels, snapping rules, and API serialization.
 */
bool wall_distances(
    const Room *room,
    const Point *point,
    WallDistances *distances
);
```