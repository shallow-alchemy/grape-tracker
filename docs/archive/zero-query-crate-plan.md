# Building `zero-query`: Rust Query Builder for Zero

**Status:** 📋 Planned (Not Started)
**Created:** 2025-01-19
**Estimated Timeline:** 2-3 weeks (40-60 hours)

## Project Overview

Create a Rust crate that replicates Zero's TypeScript query builder, providing ergonomic AST generation for synced queries.

**Goals:**
- ✅ Ergonomic builder API matching TypeScript experience
- ✅ Type-safe query construction
- ✅ Zero AST JSON generation
- ✅ Community contribution (open source on crates.io)
- ✅ Use in Gilbert, others can use in their projects

**Why Build This:**
- Avoid verbose manual AST JSON construction
- Provide Rust ecosystem with Zero query support
- Enable type-safe query building
- Make Gilbert's synced queries maintainable

---

## Phase 0: TypeScript Reference Implementation (Days 1-2, 4-6 hours)

**CRITICAL:** Build the official TypeScript implementation FIRST as validation baseline.

### 0.1 Why This Phase Matters
- TypeScript implementation is the **oracle** - known correct behavior
- Validates that synced queries solve the user isolation problem
- Provides concrete test cases for Rust implementation
- Enables byte-for-byte comparison of AST output
- De-risks the Rust implementation (know it works before building)

### 0.2 Build Node.js Queries Service
Use the Node.js service we started earlier (then deleted):

```bash
mkdir queries-service
cd queries-service
yarn init -y
yarn add @rocicorp/zero @clerk/backend express cors zod
yarn add -D @types/express @types/cors tsx typescript
```

**Implementation:**
- `/queries-service/src/index.ts` - Express server with `/get-queries` endpoint
- `/queries-service/src/queries.ts` - All query definitions using Zero's builder
- Clerk JWT authentication
- CORS configuration
- Health check endpoint

### 0.3 Deploy to Railway
- Deploy queries-service as new Railway service
- Configure `ZERO_GET_QUERIES_URL` environment variable
- Point to queries-service endpoint

### 0.4 Test User Isolation in Gilbert
1. Update schema.ts to disable legacy queries
2. Update frontend to use synced queries syntax
3. Deploy to production
4. Create 2 test users in Clerk
5. **Verify user A cannot see user B's data**
6. **Verify real-time sync still works**

### 0.5 Capture Reference Outputs
Save AST JSON outputs from queries-service for all query types:

```bash
# queries-service/test-outputs/
myVines.json
myVinesByBlock.json
myVintages.json
myWines.json
# ... all 18 queries
```

These become the **golden files** that Rust must match exactly.

### 0.6 Success Criteria
- ✅ User isolation working in production Gilbert
- ✅ All 18 queries have reference JSON outputs saved
- ✅ Real-time sync confirmed working
- ✅ TypeScript service deployed and stable

**Decision Point:** Only proceed to Rust implementation after TypeScript validation passes!

---

## Phase 1: Project Setup (Day 3, 2-3 hours)

### 1.1 Repository Structure Decision
**Options:**
- **Option A:** New repo `zero-query` (recommended for open source)
- **Option B:** Workspace in Gilbert repo (easier to develop alongside)

**Recommendation:** New repo for clean separation and community contribution.

### 1.2 Crate Scaffolding
```bash
cargo new --lib zero-query
cd zero-query
```

**Directory structure:**
```
zero-query/
├── Cargo.toml
├── README.md
├── LICENSE (Apache-2.0 or MIT)
├── src/
│   ├── lib.rs           # Public API
│   ├── ast.rs           # AST type definitions
│   ├── query.rs         # Query builder
│   ├── expression.rs    # Expression builder
│   ├── schema.rs        # Schema integration
│   └── operators.rs     # Comparison operators
├── tests/
│   └── integration_tests.rs
└── examples/
    └── basic_usage.rs
```

### 1.3 Dependencies
```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[dev-dependencies]
insta = "1"  # Snapshot testing for AST output
proptest = "1"  # Property-based testing
```

---

## Phase 2: AST Type Definitions (Days 2-3, 8-12 hours)

### 2.1 Core AST Types
Port from Zero's TypeScript definitions to Rust:
- `Ast` - Top-level query structure
- `Condition` - WHERE clause conditions
- `ValuePosition` - Column refs, literals, parameters
- `CorrelatedSubquery` - Relationship joins
- `OrderBy` - Sorting specification

**Reference:** `node_modules/@rocicorp/zero/out/zero-protocol/src/ast.d.ts`

### 2.2 Implementation Strategy
```rust
// src/ast.rs
use serde::{Serialize, Deserialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ast {
    pub table: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", rename = "where")]
    pub where_clause: Option<Condition>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub related: Option<Vec<CorrelatedSubquery>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub order_by: Option<Vec<OrderBy>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<StartCursor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Condition {
    Simple {
        op: ComparisonOp,
        left: ValuePosition,
        right: ValuePosition,
    },
    And {
        conditions: Vec<Condition>,
    },
    Or {
        conditions: Vec<Condition>,
    },
    CorrelatedSubquery {
        related: CorrelatedSubquery,
        op: SubqueryOp,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ValuePosition {
    Literal { value: Value },
    Column { name: String },
    Static { anchor: Anchor, field: Vec<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ComparisonOp {
    #[serde(rename = "=")]
    Eq,
    #[serde(rename = "!=")]
    Ne,
    #[serde(rename = "<")]
    Lt,
    #[serde(rename = "<=")]
    Le,
    #[serde(rename = ">")]
    Gt,
    #[serde(rename = ">=")]
    Ge,
    #[serde(rename = "IN")]
    In,
    #[serde(rename = "NOT IN")]
    NotIn,
    #[serde(rename = "LIKE")]
    Like,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderBy {
    pub field: String,
    pub direction: Direction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Asc,
    Desc,
}
```

### 2.3 Testing
Snapshot tests comparing JSON output to Zero's TypeScript:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use insta::assert_json_snapshot;

    #[test]
    fn test_simple_condition_ast() {
        let cond = Condition::Simple {
            op: ComparisonOp::Eq,
            left: ValuePosition::Column {
                name: "user_id".to_string(),
            },
            right: ValuePosition::Literal {
                value: json!("user_123"),
            },
        };

        assert_json_snapshot!(cond);
    }

    #[test]
    fn test_basic_ast() {
        let ast = Ast {
            table: "vine".to_string(),
            where_clause: Some(Condition::Simple {
                op: ComparisonOp::Eq,
                left: ValuePosition::Column {
                    name: "user_id".to_string(),
                },
                right: ValuePosition::Literal {
                    value: json!("user_123"),
                },
            }),
            limit: Some(50),
            ..Default::default()
        };

        assert_json_snapshot!(ast);
    }
}
```

---

## Phase 3: Basic Query Builder (Days 4-7, 16-20 hours)

### 3.1 Builder Pattern
```rust
// src/query.rs
use crate::ast::*;
use serde_json::Value;

pub struct QueryBuilder {
    table: String,
    conditions: Vec<Condition>,
    order_by: Vec<OrderBy>,
    limit: Option<u32>,
}

impl QueryBuilder {
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            conditions: Vec::new(),
            order_by: Vec::new(),
            limit: None,
        }
    }

    pub fn where_clause(mut self, condition: Condition) -> Self {
        self.conditions.push(condition);
        self
    }

    pub fn order_by(mut self, column: impl Into<String>, direction: Direction) -> Self {
        self.order_by.push(OrderBy {
            field: column.into(),
            direction,
        });
        self
    }

    pub fn limit(mut self, n: u32) -> Self {
        self.limit = Some(n);
        self
    }

    pub fn to_ast(self) -> Ast {
        let where_clause = match self.conditions.len() {
            0 => None,
            1 => Some(self.conditions.into_iter().next().unwrap()),
            _ => Some(Condition::And {
                conditions: self.conditions,
            }),
        };

        Ast {
            table: self.table,
            where_clause,
            order_by: if self.order_by.is_empty() {
                None
            } else {
                Some(self.order_by)
            },
            limit: self.limit,
            ..Default::default()
        }
    }

    pub fn to_json(self) -> Value {
        serde_json::to_value(self.to_ast()).unwrap()
    }
}
```

### 3.2 Ergonomic Helpers
```rust
// Convenience methods for common operations
impl QueryBuilder {
    pub fn where_eq(self, field: &str, value: impl Into<Value>) -> Self {
        self.where_clause(Condition::Simple {
            op: ComparisonOp::Eq,
            left: ValuePosition::Column {
                name: field.to_string(),
            },
            right: ValuePosition::Literal {
                value: value.into(),
            },
        })
    }

    pub fn where_ne(self, field: &str, value: impl Into<Value>) -> Self {
        self.where_clause(Condition::Simple {
            op: ComparisonOp::Ne,
            left: ValuePosition::Column {
                name: field.to_string(),
            },
            right: ValuePosition::Literal {
                value: value.into(),
            },
        })
    }

    pub fn where_gt(self, field: &str, value: impl Into<Value>) -> Self {
        self.where_clause(Condition::Simple {
            op: ComparisonOp::Gt,
            left: ValuePosition::Column {
                name: field.to_string(),
            },
            right: ValuePosition::Literal {
                value: value.into(),
            },
        })
    }

    pub fn where_lt(self, field: &str, value: impl Into<Value>) -> Self {
        self.where_clause(Condition::Simple {
            op: ComparisonOp::Lt,
            left: ValuePosition::Column {
                name: field.to_string(),
            },
            right: ValuePosition::Literal {
                value: value.into(),
            },
        })
    }

    pub fn where_in(self, field: &str, values: Vec<Value>) -> Self {
        self.where_clause(Condition::Simple {
            op: ComparisonOp::In,
            left: ValuePosition::Column {
                name: field.to_string(),
            },
            right: ValuePosition::Literal {
                value: Value::Array(values),
            },
        })
    }
}
```

### 3.3 Testing
```rust
#[test]
fn test_query_builder_basic() {
    let query = QueryBuilder::new("vine")
        .where_eq("user_id", json!("user_123"))
        .where_eq("block", json!("block_456"))
        .order_by("created_at", Direction::Desc)
        .limit(50);

    assert_json_snapshot!(query.to_json());
}

#[test]
fn test_query_builder_multiple_conditions() {
    let query = QueryBuilder::new("task")
        .where_eq("user_id", json!("user_123"))
        .where_in("status", vec![json!("pending"), json!("in_progress")])
        .limit(100);

    assert_json_snapshot!(query.to_json());
}
```

---

## Phase 4: Expression Builder (Days 8-9, 6-8 hours)

### 4.1 Logical Operators
```rust
// src/expression.rs
use crate::ast::*;
use serde_json::Value;

pub fn and(conditions: Vec<Condition>) -> Condition {
    Condition::And { conditions }
}

pub fn or(conditions: Vec<Condition>) -> Condition {
    Condition::Or { conditions }
}

pub fn eq(field: &str, value: impl Into<Value>) -> Condition {
    Condition::Simple {
        op: ComparisonOp::Eq,
        left: ValuePosition::Column {
            name: field.to_string(),
        },
        right: ValuePosition::Literal {
            value: value.into(),
        },
    }
}

pub fn ne(field: &str, value: impl Into<Value>) -> Condition {
    Condition::Simple {
        op: ComparisonOp::Ne,
        left: ValuePosition::Column {
            name: field.to_string(),
        },
        right: ValuePosition::Literal {
            value: value.into(),
        },
    }
}

pub fn gt(field: &str, value: impl Into<Value>) -> Condition {
    Condition::Simple {
        op: ComparisonOp::Gt,
        left: ValuePosition::Column {
            name: field.to_string(),
        },
        right: ValuePosition::Literal {
            value: value.into(),
        },
    }
}

pub fn lt(field: &str, value: impl Into<Value>) -> Condition {
    Condition::Simple {
        op: ComparisonOp::Lt,
        left: ValuePosition::Column {
            name: field.to_string(),
        },
        right: ValuePosition::Literal {
            value: value.into(),
        },
    }
}
```

### 4.2 Usage Example
```rust
use zero_query::{QueryBuilder, expr, Direction};
use serde_json::json;

let query = QueryBuilder::new("task")
    .where_clause(
        expr::and(vec![
            expr::eq("user_id", json!("user_123")),
            expr::or(vec![
                expr::eq("status", json!("pending")),
                expr::eq("status", json!("in_progress")),
            ])
        ])
    )
    .order_by("due_date", Direction::Asc)
    .to_json();
```

---

## Phase 5: Schema Integration (Days 10-12, 12-16 hours)

### 5.1 Schema Parser
Parse Zero schema format to enable validation and future type-safety:

```rust
// src/schema.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct Schema {
    tables: HashMap<String, Table>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Table {
    name: String,
    columns: HashMap<String, Column>,
    primary_key: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Column {
    name: String,
    #[serde(rename = "type")]
    column_type: ColumnType,
    optional: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ColumnType {
    String,
    Number,
    Boolean,
    Json,
}

impl Schema {
    pub fn from_json(json: serde_json::Value) -> Result<Self, serde_json::Error> {
        serde_json::from_value(json)
    }

    pub fn validate_query(&self, ast: &Ast) -> Result<(), ValidationError> {
        // Validate table exists
        let table = self.tables.get(&ast.table)
            .ok_or_else(|| ValidationError::UnknownTable(ast.table.clone()))?;

        // Validate column references in WHERE clause
        // (Future implementation)

        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Unknown table: {0}")]
    UnknownTable(String),

    #[error("Unknown column: {0}")]
    UnknownColumn(String),
}
```

### 5.2 Type-Safe Builders (v0.2.0 Stretch Goal)
```rust
// Generated from schema via macro (future enhancement)
pub struct VineTable;

impl VineTable {
    pub fn query() -> QueryBuilder {
        QueryBuilder::new("vine")
    }

    pub fn user_id() -> &'static str {
        "user_id"
    }

    pub fn block() -> &'static str {
        "block"
    }
}

// Usage with compile-time safety
let query = VineTable::query()
    .where_eq(VineTable::user_id(), json!("user_123"))
    .where_eq(VineTable::block(), json!("block_456"));
```

**Note:** Macro-based codegen deferred to v0.2.0+

---

## Phase 6: Cross-Validation Against TypeScript (Day 13, 4-6 hours)

**CRITICAL:** Validate Rust implementation matches TypeScript byte-for-byte.

### 6.1 Load Reference Outputs
```rust
// tests/typescript_validation.rs
use std::fs;
use serde_json::Value;

#[test]
fn validate_against_typescript_my_vines() {
    // Load TypeScript reference output
    let ts_output: Value = serde_json::from_str(
        &fs::read_to_string("../queries-service/test-outputs/myVines.json").unwrap()
    ).unwrap();

    // Generate Rust output
    let rust_output = QueryBuilder::new("vine")
        .where_eq("user_id", json!("user_123"))
        .to_json();

    // MUST match exactly
    assert_eq!(rust_output, ts_output, "Rust AST must match TypeScript");
}
```

### 6.2 Validate All 18 Queries
Create tests for every query type:
- myVineyards
- myBlocks
- myVines
- myVinesByBlock (with args)
- myVineById (with args)
- myVintages
- myVintageById
- myWines
- myWineById
- myWinesByVintage
- myStageHistory
- myStageHistoryByEntity (with args)
- myTaskTemplates
- myTaskTemplatesByStage
- myTasks
- myTasksByEntity
- myMeasurements
- myMeasurementsByEntity
- measurementRanges (global query)

### 6.3 Test Complex Queries
```rust
#[test]
fn validate_complex_nested_conditions() {
    let ts_output: Value = serde_json::from_str(
        &fs::read_to_string("../queries-service/test-outputs/complexQuery.json").unwrap()
    ).unwrap();

    let rust_output = QueryBuilder::new("wine")
        .where_clause(
            expr::and(vec![
                expr::eq("user_id", json!("user_123")),
                expr::or(vec![
                    expr::eq("status", json!("active")),
                    expr::eq("status", json!("aging")),
                ])
            ])
        )
        .order_by("created_at", Direction::Desc)
        .to_json();

    assert_eq!(rust_output, ts_output);
}
```

### 6.4 Integration Test with Gilbert
1. Swap Gilbert backend from TypeScript queries-service to Rust `/get-queries`
2. Deploy to staging
3. Run full user isolation test suite
4. **Verify identical behavior** (user A/B isolation, real-time sync, CRUD ops)

### 6.5 Success Criteria
- ✅ All 18 query validation tests passing
- ✅ Complex query validation passing
- ✅ Gilbert staging works identically with Rust backend
- ✅ Zero console errors or warnings
- ✅ Real-time sync performance equivalent

**Decision Point:** Only publish to crates.io after cross-validation passes!

---

## Phase 7: Testing & Documentation (Day 14, 8-10 hours)

### 7.1 Test Coverage Goals
- Unit tests for each AST type
- Integration tests for complete queries
- Snapshot tests comparing to Zero's TypeScript output
- Property-based tests with proptest for fuzz testing

```rust
// tests/integration_tests.rs
use zero_query::*;
use serde_json::json;

#[test]
fn test_gilbert_vine_query() {
    // Real-world query from Gilbert
    let query = QueryBuilder::new("vine")
        .where_clause(
            expr::and(vec![
                expr::eq("user_id", json!("user_abc123")),
                expr::eq("block", json!("block_xyz")),
            ])
        )
        .order_by("created_at", Direction::Desc)
        .limit(50)
        .to_json();

    // Verify it matches expected Zero AST format
    insta::assert_json_snapshot!(query);
}

#[test]
fn test_complex_wine_query() {
    let query = QueryBuilder::new("wine")
        .where_clause(
            expr::and(vec![
                expr::eq("user_id", json!("user_abc123")),
                expr::or(vec![
                    expr::eq("status", json!("active")),
                    expr::eq("status", json!("aging")),
                ]),
                expr::gt("volume_gallons", json!(5)),
            ])
        )
        .order_by("created_at", Direction::Desc)
        .to_json();

    insta::assert_json_snapshot!(query);
}
```

### 7.2 Documentation
```rust
//! # zero-query
//!
//! A Rust query builder for [Zero](https://zero.rocicorp.dev) synced queries.
//!
//! This crate provides an ergonomic API for building Zero query ASTs in Rust,
//! mirroring the TypeScript query builder API but with Rust's type safety.
//!
//! ## Quick Start
//!
//! ```rust
//! use zero_query::{QueryBuilder, Direction};
//! use serde_json::json;
//!
//! let query = QueryBuilder::new("vine")
//!     .where_eq("user_id", json!("user_123"))
//!     .where_eq("block", json!("block_456"))
//!     .order_by("created_at", Direction::Desc)
//!     .limit(50)
//!     .to_json();
//! ```
//!
//! ## Features
//!
//! - 🔨 Ergonomic builder API
//! - 🔒 Type-safe query construction
//! - 🎯 Zero AST JSON generation
//! - 📦 No runtime dependencies (except serde)
//! - ✅ Fully tested against Zero's TypeScript implementation
//!
//! ## Complex Queries
//!
//! ```rust
//! use zero_query::{QueryBuilder, expr};
//!
//! let query = QueryBuilder::new("task")
//!     .where_clause(
//!         expr::and(vec![
//!             expr::eq("user_id", json!("user_123")),
//!             expr::or(vec![
//!                 expr::eq("status", json!("pending")),
//!                 expr::eq("status", json!("in_progress")),
//!             ])
//!         ])
//!     )
//!     .to_json();
//! ```

/// A builder for constructing Zero query ASTs.
///
/// This builder uses a fluent interface for chaining method calls.
/// Call `.to_ast()` to get the AST structure or `.to_json()` to get
/// the JSON representation ready to send to Zero's `/get-queries` endpoint.
pub struct QueryBuilder {
    // ...
}

impl QueryBuilder {
    /// Create a new query builder for the specified table.
    ///
    /// # Example
    /// ```
    /// use zero_query::QueryBuilder;
    ///
    /// let query = QueryBuilder::new("vine");
    /// ```
    pub fn new(table: impl Into<String>) -> Self {
        // ...
    }

    /// Add a WHERE clause condition.
    ///
    /// Multiple calls to `where_clause` will be combined with AND.
    pub fn where_clause(self, condition: Condition) -> Self {
        // ...
    }

    // ... more documented methods
}
```

### 7.3 Examples
```rust
// examples/basic_usage.rs
use zero_query::{QueryBuilder, Direction};
use serde_json::json;

fn main() {
    // Simple query
    let query = QueryBuilder::new("vine")
        .where_eq("user_id", json!("user_123"))
        .limit(50)
        .to_json();

    println!("{}", serde_json::to_string_pretty(&query).unwrap());
}
```

```rust
// examples/complex_queries.rs
use zero_query::{QueryBuilder, expr};
use serde_json::json;

fn main() {
    // Complex nested conditions
    let query = QueryBuilder::new("wine")
        .where_clause(
            expr::and(vec![
                expr::eq("user_id", json!("user_123")),
                expr::or(vec![
                    expr::and(vec![
                        expr::eq("status", json!("active")),
                        expr::gt("volume_gallons", json!(10)),
                    ]),
                    expr::eq("featured", json!(true)),
                ])
            ])
        )
        .order_by("created_at", Direction::Desc)
        .to_json();

    println!("{}", serde_json::to_string_pretty(&query).unwrap());
}
```

```rust
// examples/axum_integration.rs
use axum::{routing::post, Json, Router};
use zero_query::QueryBuilder;
use serde_json::json;

async fn get_queries_handler() -> Json<serde_json::Value> {
    let query = QueryBuilder::new("vine")
        .where_eq("user_id", json!("user_from_jwt"))
        .to_json();

    Json(json!({
        "queries": [query]
    }))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/get-queries", post(get_queries_handler));

    // ... serve app
}
```

---

## Phase 8: Polish & Publish (Day 15, 4-6 hours)

### 8.1 README.md
```markdown
# zero-query

A Rust query builder for [Zero](https://zero.rocicorp.dev) synced queries.

## Overview

`zero-query` provides an ergonomic API for building Zero query ASTs in Rust, mirroring
the TypeScript query builder but with Rust's type safety and performance.

## Why?

Zero's synced queries require server-side query definitions that return AST (Abstract
Syntax Tree) JSON. The official Zero SDK only supports TypeScript/JavaScript. This crate
enables Rust backends to generate query ASTs without manual JSON construction.

## Installation

```toml
[dependencies]
zero-query = "0.1"
```

## Quick Start

```rust
use zero_query::{QueryBuilder, Direction};
use serde_json::json;

let query = QueryBuilder::new("vine")
    .where_eq("user_id", json!("user_123"))
    .order_by("created_at", Direction::Desc)
    .limit(50)
    .to_json();
```

## Features

- 🔨 Ergonomic builder API
- 🔒 Type-safe query construction
- 🎯 Zero AST JSON generation
- 📦 Minimal dependencies (only serde)
- ✅ Fully tested against Zero's TypeScript output

## API Documentation

[docs.rs/zero-query](https://docs.rs/zero-query)

## Examples

See the [examples](./examples) directory for:
- Basic usage
- Complex nested queries
- Axum web service integration

## Comparison to TypeScript

**TypeScript (official Zero SDK):**
```typescript
builder.vine.where('user_id', userId).where('block', blockId)
```

**Rust (this crate):**
```rust
QueryBuilder::new("vine")
    .where_eq("user_id", json!(user_id))
    .where_eq("block", json!(block_id))
```

## Supported Zero Version

Compatible with Zero `v0.24.x`

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## License

Licensed under either of Apache License 2.0 or MIT license at your option.
```

### 8.2 Cargo.toml Metadata
```toml
[package]
name = "zero-query"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your@email.com>"]
description = "Rust query builder for Zero synced queries"
documentation = "https://docs.rs/zero-query"
repository = "https://github.com/yourusername/zero-query"
homepage = "https://github.com/yourusername/zero-query"
license = "MIT OR Apache-2.0"
keywords = ["zero", "query", "builder", "sync", "database"]
categories = ["database", "api-bindings"]
readme = "README.md"

[badges]
maintenance = { status = "actively-developed" }
```

### 8.3 Publish to crates.io
```bash
# Dry run first
cargo publish --dry-run

# Check package contents
cargo package --list

# Actually publish
cargo publish
```

### 8.4 Community Announcement
Post on:
- Reddit r/rust
- Zero Discord/community
- Your blog/Twitter
- Hacker News (if traction)

---

## Integration with Gilbert (After Crate Complete)

### Update Gilbert's Backend

```toml
# backend/Cargo.toml
[dependencies]
zero-query = "0.1"
```

```rust
// backend/src/queries.rs
use zero_query::{QueryBuilder, expr, Direction};
use serde_json::{json, Value};

pub fn my_vines(user_id: &str) -> Value {
    QueryBuilder::new("vine")
        .where_eq("user_id", json!(user_id))
        .to_json()
}

pub fn my_vines_by_block(user_id: &str, block_id: &str) -> Value {
    QueryBuilder::new("vine")
        .where_clause(
            expr::and(vec![
                expr::eq("user_id", json!(user_id)),
                expr::eq("block", json!(block_id)),
            ])
        )
        .to_json()
}

pub fn my_wines_active(user_id: &str) -> Value {
    QueryBuilder::new("wine")
        .where_clause(
            expr::and(vec![
                expr::eq("user_id", json!(user_id)),
                expr::or(vec![
                    expr::eq("status", json!("active")),
                    expr::eq("status", json!("aging")),
                ])
            ])
        )
        .order_by("created_at", Direction::Desc)
        .to_json()
}
```

Clean, maintainable, type-safe!

---

## Milestones & Decision Points

### Milestone 0: TypeScript Validation Baseline (Day 2)
**Success Criteria:**
- ✅ Node.js queries-service deployed to Railway
- ✅ User isolation working in Gilbert production
- ✅ Reference JSON outputs captured for all 18 queries
- ✅ Real-time sync confirmed working

**Decision:** Only proceed to Rust if TypeScript proves the approach works!

### Milestone 1: AST Types Complete (Day 5)
**Success Criteria:**
- ✅ All AST structs defined in Rust
- ✅ serde serialization working
- ✅ JSON output matches Zero TypeScript format
- ✅ Snapshot tests passing

**Decision:** Continue to builder or ship AST-only crate?

### Milestone 2: Basic Builder Working (Day 9)
**Success Criteria:**
- ✅ QueryBuilder with where/limit/orderBy
- ✅ Method chaining works
- ✅ Integration tests passing
- ✅ Can build all Gilbert queries

**Decision:** Ship v0.1.0-alpha or continue to expressions?

### Milestone 3: Expression Builder Complete (Day 11)
**Success Criteria:**
- ✅ expr::and/or/not working
- ✅ All comparison operators
- ✅ Complex nested queries work
- ✅ Gilbert integration ready

**Decision:** Ready for cross-validation?

### Milestone 4: Cross-Validation Passes (Day 13)
**Success Criteria:**
- ✅ All 18 Rust queries match TypeScript byte-for-byte
- ✅ Complex query validation passing
- ✅ Gilbert staging works with Rust backend
- ✅ Zero behavioral differences from TypeScript

**Decision:** Ready to publish or need fixes?

### Milestone 5: Published to crates.io (Day 15)
**Success Criteria:**
- ✅ v0.1.0 published to crates.io
- ✅ Documentation complete
- ✅ Examples working
- ✅ README polished
- ✅ Community announcement posted

**Decision:** Integrate with Gilbert or add v0.2.0 features?

---

## Future Enhancements (v0.2.0+)

### Schema-Based Type Safety
Use proc macros to generate type-safe builders:
```rust
// Generated from schema.ts
VineTable::query()
    .where_eq(VineTable::user_id(), "user_123")
    .where_eq(VineTable::block(), "block_456")
// Compile-time error if column doesn't exist!
```

### Relationship Traversals
Support Zero's `.related()` for joins:
```rust
QueryBuilder::new("wine")
    .related("vintage", |q| {
        q.where_eq("year", json!(2023))
    })
```

### Cursor Pagination
Implement `.start()` for cursor-based pagination:
```rust
QueryBuilder::new("vine")
    .start(cursor)
    .limit(50)
```

### Subquery Support
Implement `.whereExists()`:
```rust
QueryBuilder::new("vintage")
    .where_exists("wines", |q| {
        q.where_eq("status", json!("active"))
    })
```

---

## Success Metrics

### Technical
- ✅ 100% of Gilbert queries buildable
- ✅ JSON output byte-identical to TypeScript
- ✅ >90% test coverage
- ✅ Zero compiler warnings
- ✅ Passes clippy strict

### Community
- 🎯 10+ GitHub stars in first month
- 🎯 1+ external contributor
- 🎯 Listed in Zero's ecosystem
- 🎯 Used in 2+ projects besides Gilbert

---

## Risk Mitigation

### Risk 1: Complexity Underestimated
**Mitigation:**
- Ship v0.1.0 with basic features only
- Defer schema type safety to v0.2.0
- Get feedback early with alpha release

**Fallback:**
- Use helper module approach in Gilbert
- Open source AST types only

### Risk 2: Zero Protocol Changes
**Mitigation:**
- Version pin to specific Zero versions
- Document supported versions clearly
- Monitor Zero releases

**Strategy:**
- Follow semantic versioning strictly
- Release patches for Zero updates

### Risk 3: Lost Motivation
**Mitigation:**
- Daily progress tracking in todos
- Ship alpha after Milestone 1
- Get early user feedback
- Pair with Gilbert progress

**Strategy:**
- Timebox to 3 weeks max
- If blocked, ship what exists

### Risk 4: Adoption Challenges
**Mitigation:**
- Write excellent documentation
- Provide working examples
- Integrate with Gilbert as proof
- Announce in Rust/Zero communities

---

## Open Questions

1. **Naming:** `zero-query` vs `zero-rust` vs `zeroql`?
   - Leaning toward `zero-query` for clarity

2. **License:** MIT, Apache-2.0, or dual?
   - Recommend dual license (standard in Rust)

3. **Repository:** New repo or Gilbert workspace?
   - New repo for clean separation

4. **Type safety:** Macros in v0.1 or defer to v0.2?
   - Defer to v0.2 - ship basic builder first

5. **Schema format:** Parse Zero's schema.ts or custom?
   - Parse Zero's format for compatibility

---

## Resources

### Zero Documentation
- [Synced Queries Docs](https://zero.rocicorp.dev/docs/synced-queries)
- [Custom Server Implementation](https://zero.rocicorp.dev/docs/synced-queries#custom-server-implementation)
- [AST Protocol](https://github.com/rocicorp/mono/tree/main/packages/zero-protocol)

### Zero TypeScript Implementation
- `node_modules/@rocicorp/zero/out/zero-protocol/src/ast.d.ts` - AST types
- `node_modules/@rocicorp/zero/out/zql/src/query/query.d.ts` - Query builder types
- `node_modules/@rocicorp/zero/out/zql/src/query/query-impl.js` - Implementation

### Rust Ecosystem Tools
- [serde](https://serde.rs) - Serialization
- [insta](https://insta.rs) - Snapshot testing
- [proptest](https://github.com/proptest-rs/proptest) - Property testing
- [thiserror](https://github.com/dtolnay/thiserror) - Error handling

---

## Next Steps

When ready to start:

1. **Choose repository location**
   - Create new `zero-query` repo OR
   - Add to Gilbert as workspace member

2. **Set up project structure**
   ```bash
   cargo new --lib zero-query
   cd zero-query
   ```

3. **Copy AST type definitions from Zero**
   - Start with `ast.d.ts`
   - Translate to Rust structs

4. **Build first query**
   - Simple WHERE clause
   - Snapshot test
   - Iterate

5. **Daily progress tracking**
   - Update todos
   - Push to GitHub daily
   - Share progress

**Ready to build when you are!** 🚀
