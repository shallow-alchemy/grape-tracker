# Mobile App

A mobile-first web application built with React, TypeScript, and Zero sync engine.

## Tech Stack

- **React** - UI library
- **TypeScript** - Type safety
- **rsBuild** - Build tool
- **Zero** - Local-first sync engine
- **React Aria Components** - Accessible UI components
- **CSS Modules** - Scoped styling

## Prerequisites

- Node.js >= 22 (Note: Node 20 will work but shows warnings)
- Yarn (package manager)
- Docker (for PostgreSQL)
- PostgreSQL database

## Setup

**Note:** This project uses Yarn as the package manager. Please use `yarn` instead of `npm`.

1. Install dependencies:
```bash
yarn install
```

2. Configure environment variables:
Copy `.env.example` to `.env` and update with your database credentials:
```bash
cp .env.example .env
```

3. Start PostgreSQL (if using Docker):
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres
```

4. Start the Zero cache server:
```bash
yarn zero-cache
```

5. In a separate terminal, start the dev server:
```bash
yarn dev
```

## Available Scripts

- `yarn dev` - Start the development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn zero-cache` - Start the Zero cache server

## Project Structure

```
.
├── src/
│   ├── App.tsx          # Main app component
│   ├── App.module.css   # App styles
│   ├── index.tsx        # Entry point
│   └── index.css        # Global styles
├── schema.ts            # Zero schema and permissions
├── rsbuild.config.ts    # rsBuild configuration
├── tsconfig.json        # TypeScript configuration
└── index.html           # HTML template
```

## Mobile-First Features

The app is optimized for mobile usage with:
- Responsive viewport configuration
- Touch-friendly UI
- Mobile web app capabilities
- Offline-first data sync with Zero

## 3D Printable Vine Tags

Gilbert generates 3D printable QR code tags for physical vine identification in the vineyard.

### Quick Start

1. **Generate Tag**: Navigate to any vine detail page and click "DOWNLOAD 3D FILE"
2. **Batch Process**: Use the batch-merge-stl tool to merge all QR tags with the base
3. **Print**: Import to your slicer and print with white + black filament

### Batch Processing (Recommended)

```bash
# Install the batch processing tool
cd scripts/batch-merge-stl
cargo install --path .

# Process all vine tags in downloads folder (scale base from inches to mm)
batch-merge-stl -b assets/Base.stl -s 25.4 downloads/

# Process with custom output directory
batch-merge-stl -b assets/Base.stl -s 25.4 -o ready-to-print/ downloads/

# Process only vine tags (skip other STL files)
batch-merge-stl -b assets/Base.stl -s 25.4 -p "vine-*-qr.stl" downloads/
```

### Manual Processing (Single Files)

```bash
# Download generates: vine-A-001-qr.stl
# Base file is at: assets/Base.stl

# Combine base + QR layer into single 3MF (manual scaling needed)
stlto3mf --output vine-A-001.3mf assets/Base.stl vine-A-001-qr.stl

# Install stlto3mf (if needed)
# https://github.com/mpapierski/stlto3mf
```

### Tag Specifications

- **Size**: 2" × 2" (50.8mm × 50.8mm) square
- **Base**: 0.125" thick white layer with mounting fixture
- **QR Pattern**: 2mm raised black layer
