# mssql-core

> A lightweight, high-performance SQL Server library for TypeScript applications.

`mssql-core` helps you build enterprise applications on Microsoft SQL Server without the complexity of a traditional ORM.

Instead of hiding SQL behind decorators, proxies, and entity tracking, `mssql-core` provides explicit SQL generation, metadata-driven mapping, streaming processing, optimistic locking, and reusable data access components.

Whether you're building a REST API, microservice, ETL pipeline, or batch processing system, `mssql-core` gives you complete control over your database while keeping your code clean and maintainable.

---

## Why mssql-core?

Most applications don't need a heavyweight ORM.

They need a library that is:

* Fast
* Predictable
* Easy to debug
* Easy to maintain
* Suitable for enterprise architecture

`mssql-core` is designed with these goals in mind.

## Built for Enterprise Applications

`mssql-core` is ideal for:

* REST APIs
* Microservices
* Batch jobs
* Import services
* Export services
* ETL pipelines
* Back-office systems
* Financial applications
* Healthcare systems
* Government applications

---

# Features

## Metadata-Driven SQL

Define your entity metadata once.

Reuse it everywhere.

* SQL generation
* Object mapping
* Insert
* Update
* Save
* Batch processing
* Export

No duplicated mapping configuration.

---

## Smart Save

Most libraries force developers to choose between insert and update.

```text
Insert?

or

Update?
```

`mssql-core` introduces **Save**.

Simply write:

```ts
await writer.write(user)
```

The library automatically determines whether the entity should be inserted or updated based on its metadata.

No duplicated business logic.

---

## Batch Processing

Process thousands of records efficiently.

```ts
await batchWriter.write(users)
```

Designed for:

* Data migration
* ETL
* Synchronization
* Scheduled jobs

---

## Streaming Processing

Need to process millions of records?

`SQLStreamWriter` processes data one object at a time.

Benefits:

* Low memory usage
* High throughput
* Suitable for very large datasets

Perfect for:

* CSV imports
* Excel imports
* Queue consumers
* Message processing

---

## Streaming Export

Export large SQL Server tables without loading everything into memory.

Two APIs are available.

### Exporter

A functional API for JavaScript, TypeScript, and Go developers.

### ExportService

An interface-based API for developers who prefer object-oriented programming and dependency injection.

Both APIs stream rows directly from SQL Server for maximum performance.

---

## Works with export-kit

`mssql-core` integrates seamlessly with **export-kit**.

```text
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
CSV
Fixed-Length File
```

`export-kit` handles file generation while `mssql-core` focuses on efficient database access.

This separation keeps your application modular and reusable.

---

## Optimistic Locking

Protect your data from concurrent updates.

Simply define a version field in your metadata.

The generated SQL automatically performs optimistic locking.

No additional business logic required.

---

## Transaction Support

Execute multiple operations safely within a transaction.

Perfect for business workflows that require consistency.

---

## Health Check

Monitor SQL Server availability.

Designed for:

* Kubernetes readiness probes
* Kubernetes liveness probes
* Cloud-native deployments
* Production monitoring

---

## Lightweight

`mssql-core` is not an ORM.

It doesn't generate proxies.

It doesn't track entities.

It doesn't require decorators.

It simply provides reusable building blocks for modern applications.

---

# Architecture

```text
Application
        │
        ▼
Repository
        │
        ▼
mssql-core
        │
        ▼
SQL Server
```

For exporting data:

```text
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

Each library has a single responsibility.

---

# Designed Around Reusable Components

The library is built from composable building blocks.

* SQL generation
* Save operations
* Batch processing
* Streaming processing
* Exporting
* Transactions
* Health checking
* Object mapping

Use only the components your application needs.

---

# Why Developers Choose mssql-core

✅ Explicit SQL

✅ High performance

✅ Streaming support

✅ Batch processing

✅ Smart save

✅ Optimistic locking

✅ Metadata reuse

✅ Enterprise architecture

✅ Low memory usage

✅ Strong TypeScript support

---

# Related Libraries

The library is part of the **core-ts** ecosystem.

* **sql-core** — SQL generation and repository utilities
* **export-kit** — Streaming file export framework
* **query-mappers** — Object mapping utilities

Together, these libraries help you build scalable, maintainable enterprise applications.

---

# License

MIT
