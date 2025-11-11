# Gilbert Backend

Axum-based backend server for Gilbert grape tracking app.

## Responsibilities

- Database migrations (using sqlx-cli)
- Health check endpoint
- File storage and serving (future)
- STL generation from QR codes (future)
- Business logic that Zero sync engine can't handle

## Local Development

### Prerequisites

1. PostgreSQL running locally
2. `gilbert` database created
3. `wal_level = logical` configured (required for Zero sync)

### Setup

1. Copy environment variables:
```bash
cp .env.example .env
```

2. Update `.env` with your local database URL if needed

3. Run the backend:

**Option 1: Run everything (recommended)**
```bash
# From project root
yarn dev
```
This starts zero-cache, backend, and frontend concurrently.

**Option 2: Run backend only**
```bash
# From project root
yarn dev:backend

# Or from backend directory
cargo run
```

**Option 3: Watch mode** (requires `cargo-watch`)
```bash
cargo install cargo-watch
cargo watch -x run
```

### Test

Check health endpoint:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

## Migrations

Migrations are automatically run on server startup from `../migrations/` directory.

To create a new migration manually:
```bash
# From project root
sqlx migrate add <name>
```

This creates `migrations/<timestamp>_<name>.sql`

## Project Structure

```
backend/
├── src/
│   └── main.rs          # Server entry point, routes, health check
├── Cargo.toml           # Dependencies
├── .env                 # Local environment variables (gitignored)
└── .env.example         # Example environment variables
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `RUST_LOG` - Log level (default: info)

## Endpoints

### Health Check
```
GET /health
```

Returns server and database status.

## Future Endpoints

- `POST /api/vine/:id/generate-stl` - Generate STL file for vine tag
- `POST /api/block/:id/generate-stls` - Batch generate STL files for block
- `GET /api/files/:id` - Download generated file
