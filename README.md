# mssql-core

A lightweight, metadata-driven SQL Server library for TypeScript applications.

`mssql-core` provides high-performance data access, batch processing, streaming import/export, optimistic locking, and health checking without requiring an ORM. It is designed for enterprise applications that prefer explicit SQL, strong typing, and reusable metadata.

## Features

* Metadata-driven SQL generation
* Insert, update and save operations
* Batch insert and batch save
* Streaming database writer
* Streaming data exporter
* Optimistic locking
* Transaction support
* Health checker for Kubernetes
* Object mapping
* Works with `sql-core`
* Integrates with `export-kit`

## Installation

```bash
npm install mssql-core
```

## Architecture

```
Application
      │
      ▼
Repository
      │
      ▼
mssql-core
      │
      ▼
Microsoft SQL Server
```

For export operations:

```
SQL Server
      │
      ▼
Exporter / ExportService
      │
      ▼
export-kit
      │
      ▼
CSV / Fixed-Length File
```

## Metadata

Entity metadata describes how an object maps to a database table.

```ts
const attributes = {
    id: {
        key: true
    },
    version: {
        version: true
    },
    name: {},
    email: {}
}
```

The same metadata is reused for:

* SQL generation
* Object mapping
* Insert
* Update
* Save
* Export

## Writing Data

### Save

`SQLWriter` automatically determines whether each object should be inserted or updated.

```ts
await writer.write(user)
```

The decision is based on the entity metadata.

You don't need to call separate insert or update methods.

### Batch Save

Write an entire collection efficiently.

```ts
await writer.write(users)
```

`SQLBatchWriter` builds SQL for the entire collection and executes it using batch operations.

### Streaming Save

For very large imports, `SQLStreamWriter` processes one object at a time without loading the entire dataset into memory.

Typical use cases include:

* CSV import
* Excel import
* ETL pipelines
* Message consumers

## Exporting Data

`mssql-core` supports streaming export directly from SQL Server.

Two APIs are available.

### Exporter

A functional API designed for JavaScript, TypeScript and Go developers.

### ExportService

An interface-based API designed for developers who prefer object-oriented programming and dependency injection.

Both APIs stream rows directly from SQL Server.

## Integration with export-kit

`mssql-core` works seamlessly with `export-kit`.

```
SQL Server
      │
      ▼
Exporter
      │
      ▼
Formatter<T>
      │
      ▼
FileWriter
      │
      ▼
CSV / Fixed-Length File
```

`export-kit` provides:

* `Formatter<T>` for converting objects into text records
* `FileWriter` for writing CSV and fixed-length files

This separation keeps SQL access independent from file generation.

## Optimistic Locking

Entities may define a version field.

```ts
version: {
    version: true
}
```

The generated update statements automatically include version checking.

## Transactions

All writers can execute using an existing transaction.

```ts
await transaction.begin()

...

await transaction.commit()
```

## Health Check

`SQLChecker` verifies database connectivity.

Typical usage includes:

* Kubernetes readiness probes
* Kubernetes liveness probes
* Monitoring
* Startup validation

## Object Mapping

Rows returned from SQL Server are automatically mapped into strongly typed objects using the configured metadata.

## Why mssql-core?

Unlike traditional ORMs, `mssql-core` focuses on:

* Explicit SQL
* High performance
* Streaming
* Low memory usage
* Metadata reuse
* Enterprise architecture
* Strong typing

It provides reusable building blocks instead of a heavyweight persistence framework.

## Related Libraries

* **sql-core** — SQL generation and repository utilities
* **export-kit** — Streaming file export framework
* **query-mappers** — Object mapping utilities

## License

MIT
