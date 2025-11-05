# Vineyard QR Code & Vine Tag Workflow

## Overview

Gilbert uses QR codes as physical vine tags in the vineyard. Each vine has a unique QR code that links to its detail page in the app. This allows workers to scan a vine in the field and immediately access/update its records.

## Core Principles

1. **Permanent URLs**: Each vine gets a permanent URL based on its ID (e.g., `https://gilbert.app/vineyard/vine/A-001`)
2. **Static QR Codes**: QR codes encode the vine's URL and never change, even if the physical tag needs reprinting
3. **ID Auto-generation**: Vine IDs are automatically assigned based on block + sequential numbering
4. **SVG Workflow**: QR codes are generated as SVG files for 3D printing conversion

## Vine ID Format

**Pattern**: `{BLOCK}-{NUMBER}`
- Block: Single letter (A, B, C, etc.)
- Number: 3-digit zero-padded sequential number (001, 002, etc.)
- Examples: A-001, A-002, B-001, C-015

**Auto-assignment**:
- User selects block when creating a vine
- System finds the highest number in that block and increments by 1
- First vine in Block A becomes A-001
- Tenth vine in Block B becomes B-010

## Workflows

### 1. Add a Vine

**Mobile & Desktop Flow**:
1. Click "ADD VINE" button (desktop) or navigate to add vine (mobile)
2. Fill in vine details:
   - Select Block (dropdown: A, B, C, etc.)
   - Variety (text input)
   - Planting date (date picker)
   - Initial health status (dropdown: Excellent, Good, Fair, Needs Attention)
   - Optional: planting notes
3. Click "CREATE VINE"
4. System auto-assigns ID (e.g., A-015)
5. Vine record created with permanent URL: `/vineyard/vine/A-015`
6. User is taken to vine detail page

### 2. Generate Individual Vine Tag

**From Vine Detail Page**:
1. Click "GENERATE TAG" button
2. QR code displays in a modal/overlay showing:
   - Large QR code (SVG)
   - Vine ID below QR code (for human readability)
   - Vine variety and block info
3. Click "DOWNLOAD SVG" button
4. File downloads as `vine-A-001.svg`
5. User uploads SVG to https://imagetostl.com/convert/file/svg/to/stl
6. Download STL file
7. 3D print the tag

### 3. Batch Generate Tags by Block

**From Vineyard List Page (Desktop)**:
1. Click "BATCH GENERATE TAGS" button
2. Select block from dropdown (e.g., "Block A")
3. Optional: filter by criteria (e.g., "only vines without tags generated")
4. System shows preview of how many vines will have tags generated
5. Click "GENERATE ALL"
6. System generates individual SVG files for each vine in the block
7. Downloads as a ZIP file: `block-A-tags.zip`
8. User extracts ZIP, uploads each SVG to imagetostl.com
9. Batch convert to STL files
10. 3D print all tags

### 4. Replace a Broken Tag

**Same as Generate Individual Vine Tag**:
1. Navigate to the vine's detail page
2. Click "GENERATE TAG"
3. Download the same SVG (QR code is identical)
4. Convert to STL and reprint

The QR code URL never changes, so the new physical tag works identically to the original.

## Block Management

### Current Approach
- Blocks are defined by vines that reference them
- No separate "block" entity initially

### Future Enhancement
Consider adding a "Manage Blocks" feature:
- Create/edit/delete blocks
- Set block properties (location, soil type, varietal restrictions)
- View aggregate stats per block
- Bulk operations per block

For now, blocks are simply string identifiers (A, B, C) that vines reference.

## Technical Implementation

### QR Code Generation
- **Library**: `qrcode` (npm package)
- **Format**: SVG (vector graphics, perfect for scaling/3D conversion)
- **Content**: Full URL to vine detail page
- **Size**: Configurable, default appropriate for 3D printing (suggested: 200x200px base)

### URL Structure
```
Production: https://gilbert.app/vineyard/vine/{VINE_ID}
Development: http://localhost:8080/vineyard/vine/{VINE_ID}
```

### File Naming Convention
- Individual: `vine-{VINE_ID}.svg` (e.g., `vine-A-001.svg`)
- Batch: `block-{BLOCK}-tags.zip` (e.g., `block-A-tags.zip`)

### 3D Printing Workflow
1. Generate SVG in Gilbert
2. Visit https://imagetostl.com/convert/file/svg/to/stl
3. Upload SVG file
4. Configure STL settings (height, base, etc.)
5. Download STL
6. Import to 3D printing software (Cura, PrusaSlicer, etc.)
7. Print tag

**Future Consideration**: Investigate if imagetostl.com has an API for automated conversion within Gilbert.

## QR Code Scanning

### Mobile Scanning Flow
1. Worker opens phone camera or QR scanner app
2. Scans vine tag QR code in vineyard
3. Phone opens URL: `https://gilbert.app/vineyard/vine/A-001`
4. If not logged in: redirects to Clerk sign-in
5. If logged in: opens vine detail page in Gilbert
6. Worker can immediately:
   - View vine history
   - Add photos
   - Log watering
   - Record disease observations
   - Update pruning notes
   - Plan spurs

### Desktop QR Registration
When creating a new vine on desktop:
- System can optionally trigger QR generation workflow immediately
- "Create Vine & Generate Tag" combined action

## Data Model

### Vine Record
```typescript
{
  id: string;              // "A-001"
  block: string;           // "A"
  sequenceNumber: number;  // 1
  variety: string;         // "CABERNET SAUVIGNON"
  plantingDate: Date;      // 2020-03-15
  age: string;             // Computed from plantingDate
  health: string;          // "GOOD", "EXCELLENT", "NEEDS ATTENTION"
  photos: Photo[];
  notes: {
    training: Note[];
    disease: Note[];
    watering: Note[];
    planting: Note[];
    spur: SpurPlan[];
  }
  qrGenerated: boolean;    // Has tag been generated at least once?
  qrGeneratedDate: Date;   // When was tag first generated?
  url: string;             // Permanent URL (computed)
}
```

## Future Enhancements

### Potential Features
1. **API Integration**: Auto-convert SVG to STL via imagetostl.com API (if available)
2. **QR Tracking**: Track which tags have been printed/deployed
3. **Tag History**: Log when tags are generated/reprinted
4. **Batch Printing**: Generate multi-tag print layouts (multiple QR codes on one page)
5. **NFC Tags**: Support NFC tags as alternative to QR codes
6. **Offline Mode**: Cache vine data for offline scanning in vineyard (no cell service)
7. **Block Visualization**: Map view showing vine locations within blocks

### Nice-to-Have
- Preview QR code before downloading
- Customize QR code appearance (colors, patterns)
- Add Gilbert branding/logo to tag design
- Generate PDF with multiple tags per page for easier printing

## Notes

- QR codes should be high-contrast (black on white) for reliable scanning
- Consider weather-resistant materials for 3D printed tags
- Include vine ID text on tag for human readability (backup if QR fails)
- Test QR code scanning distance (how far away can camera read it?)
