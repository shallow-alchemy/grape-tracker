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
- Docker (for PostgreSQL)
- PostgreSQL database

## Setup

1. Install dependencies:
```bash
npm install
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
npm run zero-cache
```

5. In a separate terminal, start the dev server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run zero-cache` - Start the Zero cache server

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
