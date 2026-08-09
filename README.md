# mssql-core

> A lightweight, high-performance SQL Server library for TypeScript applications.

`mssql-core` helps you build enterprise applications on Microsoft SQL Server without the complexity of a traditional ORM.

Instead of hiding SQL behind decorators, proxies, and entity tracking, `mssql-core` provides explicit SQL generation, metadata-driven mapping, streaming processing, optimistic locking, and reusable data access components.

Whether you're building a REST API, microservice, ETL pipeline, or batch processing system, `mssql-core` gives you complete control over your database while keeping your code clean and maintainable.

---

## Features

* Built on the official [`mssql`](https://www.npmjs.com/package/mssql) driver
* Reuses `Repository` and `CRUDRepository` from [`sql-core`](https://www.npmjs.com/package/sql-core)
* Works seamlessly with [`query-mappers`](https://www.npmjs.com/package/query-mappers)
* Metadata-driven CRUD operations
* Batch insert and update
* Stream processing for large datasets
* Optimistic locking
* Transaction support
* SQL Server health check for Kubernetes
* TypeScript first
* Lightweight with no ORM
 
---

## Installation

```bash
npm install mssql-core
```

## Why mssql-core?
Most SQL libraries are either:

- Low-level drivers ([`mssql`](https://www.npmjs.com/package/mssql))
- Full-featured ORMs (TypeORM, Prisma, Sequelize)

This library focuses on infrastructure.

It provides:

- Connection management
- Transactions
- Repository integration
- Batch execution
- Streaming

without hiding SQL from developers.

Moreover, [`mssql-core`](https://www.npmjs.com/package/mssql-core) can work with [`sql-core`](https://www.npmjs.com/package/sql-core) and [`query-mappers`](https://www.npmjs.com/package/query-mappers). They separate responsibilities into independent layers.

* SQL generation belongs to [`sql-core`](https://www.npmjs.com/package/sql-core)
* Object mapping belongs to [`query-mappers`](https://www.npmjs.com/package/query-mappers)
* SQL Server execution belongs to [`mssql-core`](https://www.npmjs.com/package/mssql-core)

This architecture keeps applications lightweight, modular, and easy to maintain.


## Ecosystem

```text
       Application
            │
            ▼
       Repository
       (sql-core)
            │
            ▼
        mssql-core
            │
            ▼
        SQL Server
```

### Responsibilities

| Package                                                        | Responsibility                                                        |
|----------------------------------------------------------------|-----------------------------------------------------------------------|
| [`sql-core`](https://www.npmjs.com/package/sql-core)           | Database-independent repositories, CRUD, SQL builders, transactions   |
| [`query-mappers`](https://www.npmjs.com/package/query-mappers) | Maps database rows to TypeScript models                               |
| [`mssql-core`](https://www.npmjs.com/package/mssql-core)       | SQL Server execution, repositories, writers, streaming, health checks |
| [`mysql2-core`](https://www.npmjs.com/package/mysql2-core)     | My SQL execution, repositories, writers, streaming, health checks     |
| [`postgres-kit`](https://www.npmjs.com/package/postgres-kit)   | PostgreSQL execution, repositories, writers, streaming, health checks |

---

## Metadata-driven Persistence

CRUD operations are generated from metadata instead of handwritten SQL.

Supports:

* Primary keys
* Version fields
* Read-only fields
* Insert-only fields
* Update-only fields
* Automatic SQL generation

---

## Core Components

### SQL Server Execution

Execute SQL statements using SQL Server.

* Transaction support
* Query execution
* Command execution
* Prepared statements

#### Transactions

```text
Begin Transaction

       ↓

Execute Commands

       ↓

Commit / Rollback
```

Supports SQL Server transactions using the abstractions defined in [`sql-core`](https://www.npmjs.com/package/sql-core).

```ts
const tx = await db.beginTransaction()

try {
    await tx.execute(
        `INSERT INTO users(name) VALUES(@p1)`,
        ["John"]
    )
    await tx.commit()
}
catch (err) {
    await tx.rollback()
}
```

#### Query

Rows are automatically mapped into TypeScript objects.

```ts
interface User {
    id: number
    name: string
    active: boolean
}
```

```ts
const users = await db.query<User>(sql)
```

#### Execute

```ts
await db.execute(
    `UPDATE users SET active = @p1 WHERE id = @p2`
    ['A', 10]
)
```

---

#### Batch Execution

```ts
await db.executeBatch([
    {
        query: "INSERT INTO users(name) VALUES(@p1)",
        params: ["John"]
    },
    {
        query: "INSERT INTO users(name) VALUES(@p1)",
        params: ["Jane"]
    }
])
```

### Repository

`mssql-core` provides SQL Server implementations that reuse the generic repositories from[`sql-core`](https://www.npmjs.com/package/sql-core).

Features include:

* Create
* Update
* Delete
* Find by id
* Search
* Paging
* Sorting
* Optimistic locking

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

## Optimistic Locking

Version columns are automatically detected from metadata.


CRUDRepository in [`sql-core`](https://www.npmjs.com/package/sql-core) fully supports optimistic locking.

When a schema defines a version field, sql-core automatically generates update statements that verify the current version before modifying data.

For example:

```sql
UPDATE users
SET
    name = @p1,
    version = version + 1
WHERE
    id = @p2
AND version = @p3
```

If another transaction has already updated the record, the update affects zero rows, allowing the application to detect concurrent modifications.

This prevents lost updates without requiring pessimistic database locks.

---

## Health Check

Monitor SQL Server availability.

```typescript
const checker = new SQLChecker(pool);
const result = await checker.check();
```

Designed for:

* Kubernetes readiness probes
* Kubernetes liveness probes
* Cloud-native deployments
* Production monitoring

Example response:

```json
{
  "status": "UP",
  "details": {
    "mssql": {
      "status": "UP"
    }
  }
}
```

## Integration with query-mappers

`query-mappers` converts SQL Server rows into strongly typed TypeScript models.

```text
SQL Server Row

       ↓

 query-mappers

       ↓

TypeScript Object
```

## Designed for Enterprise Applications

`mssql-core` is suitable for:

* REST APIs
* Microservices
* Batch processing
* ETL pipelines
* Event-driven systems
* Cloud-native applications

## Advantages

* No ORM overhead
* Reusable repositories
* Modular architecture
* High performance
* Strong TypeScript support
* Easy to test
* Clean separation of responsibilities

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
CSV / Fixed-Length File
```

`export-kit` handles file generation while `mssql-core` focuses on efficient database access.

This separation keeps your application modular and reusable.

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
 ExportService
       │
       ▼
  export-kit
       │
       ▼
CSV / Fixed-Length File
```

Each library has a single responsibility.

---

# License

MIT
