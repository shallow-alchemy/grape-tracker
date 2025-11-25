# Gilbert Queries Service (TypeScript Reference)

**Purpose:** Official Zero SDK implementation for synced queries. This serves as:
1. Production user isolation service for Gilbert
2. Reference implementation for `zero-query` Rust crate validation

## Quick Start

```bash
yarn install
cp .env.example .env
# Edit .env with your Clerk secret key
yarn dev
```

## Testing

The service will run on `http://localhost:3002`

Health check: `GET http://localhost:3002/health`

## Deployment

Deployed to Railway as a separate service.

## Golden Outputs

Reference JSON outputs are saved to `test-outputs/` for Rust crate validation.
