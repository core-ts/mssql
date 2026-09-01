# mssql-core

A lightweight, SQL-first Microsoft SQL Server infrastructure library for Node.js and TypeScript.

`mssql-core` provides a small database abstraction over [`mssql`](https://www.npmjs.com/package/mssql), with support for:

* Connection pool execution
* Transactions
* Parameterized queries
* Scalar and count queries
* Result mapping
* Boolean conversion
* Metadata-driven insert/update operations
* Optimistic version fields
* Batch execution
* Buffered batch writing
* Reusable database abstractions through `Executor`, `DB`, and `Tx`

It is designed for applications that want the control of SQL without introducing a full ORM.

## Installation

```bash
npm install mssql-core mssql
```

## Philosophy

`mssql-core` follows a simple principle:

> Keep SQL explicit while centralizing database infrastructure.

The library does not attempt to hide SQL behind entities, repositories, or a query DSL.

Instead, it provides infrastructure around SQL:

```text
Application
    │
    ▼
Executor / DB / Tx
    │
    ├── Query execution
    ├── Transactions
    ├── Parameter handling
    ├── Result mapping
    └── Batch execution
    │
    ▼
mssql
    │
    ▼
SQL Server
```

This makes it suitable for enterprise applications where SQL control, predictable performance, and explicit database behavior are important.

---

# Core Abstractions

## Executor

`Executor` is the common database execution interface.

```ts
export interface Executor {
  driver: string
  param(i: number): string

  execute(sql: string, args?: any[]): Promise<number>

  executeBatch(
    statements: Statement[],
    requireFirstAffected?: boolean,
  ): Promise<number>

  query<T>(
    sql: string,
    args?: any[],
    m?: StringMap,
    bools?: Attribute[],
  ): Promise<T[]>

  queryOne<T>(
    sql: string,
    args?: any[],
    m?: StringMap,
    bools?: Attribute[],
  ): Promise<T | null>

  executeScalar<T>(
    sql: string,
    args?: any[],
  ): Promise<T | null>

  count(
    sql: string,
    args?: any[],
  ): Promise<number>
}
```

Because both `PoolManager` and `SqlTransaction` implement `Executor`, application code can use the same interface whether it is running against a connection pool or inside a transaction.

## DB

`DB` extends `Executor` with transaction creation:

```ts
export interface DB extends Executor {
  beginTransaction(): Promise<Tx>
}
```

## Tx

`Tx` extends `Executor` with transaction completion:

```ts
export interface Tx extends Executor {
  commit(): Promise<void>
  rollback(): Promise<void>
}
```

---

# Connection Pool

`PoolManager` wraps an `mssql.ConnectionPool`.

```ts
import sql from "mssql"
import { PoolManager } from "mssql-core"

const pool = await sql.connect({
  server: "localhost",
  database: "app",
  user: "sa",
  password: "password",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
})

const db = new PoolManager(pool)
```

You can now execute SQL through the `Executor` API.

---

# Query

```ts
const users = await db.query<User>(
  `
  select
    USER_ID,
    USER_NAME
  from USERS
  where ACTIVE = @p1
  `,
  [1],
)
```

The values are bound as SQL parameters rather than interpolated directly into the SQL string.

---

# Query One

```ts
const user = await db.queryOne<User>(
  `
  select
    USER_ID,
    USER_NAME
  from USERS
  where USER_ID = @p1
  `,
  [100],
)

if (user) {
  console.log(user.USER_NAME)
}
```

`queryOne()` returns:

```ts
T | null
```

instead of an empty array.

---

# Execute

```ts
const affected = await db.execute(
  `
  update USERS
  set ACTIVE = @p1
  where USER_ID = @p2
  `,
  [1, 100],
)

console.log(affected)
```

The returned value is the number of affected rows reported by SQL Server.

---

# Execute Scalar

```ts
const total = await db.executeScalar<number>(
  `
  select count(*)
  from USERS
  `,
)

console.log(total)
```

`executeScalar()` returns the first column of the first returned row.

---

# Count

For count queries, use the convenience method:

```ts
const total = await db.count(
  `
  select count(*)
  from USERS
  where ACTIVE = @p1
  `,
  [1],
)
```

If the scalar result is `null`, `count()` returns `0`.

---

# Parameters

The default MSSQL parameter format is:

```ts
import { param, params } from "mssql-core"

param(1)
// @p1

params(3)
// ["@p1", "@p2", "@p3"]

params(3, 5)
// ["@p6", "@p7", "@p8"]
```

A custom parameter builder can also be supplied to SQL generation functions and writers.

---

# Transactions

Create a transaction from the database pool:

```ts
const tx = await db.beginTransaction()

try {
  await tx.execute(
    `
    update ACCOUNTS
    set BALANCE = BALANCE - @p1
    where ACCOUNT_ID = @p2
    `,
    [100, 1],
  )

  await tx.execute(
    `
    update ACCOUNTS
    set BALANCE = BALANCE + @p1
    where ACCOUNT_ID = @p2
    `,
    [100, 2],
  )

  await tx.commit()
} catch (err) {
  await tx.rollback()
  throw err
}
```

`SqlTransaction` prevents operations after a transaction has already been completed.

It maintains an internal transaction state:

```text
active
   │
   ├── commit() ──────> committed
   │
   └── rollback() ────> rolledback
```

A failed commit can result in an `unknown` state because the client cannot always determine whether SQL Server committed the transaction before the connection failure.

---

# Result Mapping

Database column names often differ from TypeScript property names.

For example:

```text
USER_ID
USER_NAME
CREATED_AT
```

can be mapped to:

```ts
{
  userId: ...,
  userName: ...,
  createdAt: ...
}
```

A mapping can be supplied to `query()`:

```ts
const users = await db.query<User>(
  `
  select
    USER_ID,
    USER_NAME
  from USERS
  `,
  [],
  {
    user_id: "userId",
    user_name: "userName",
  },
)
```

Unmapped fields are preserved.

The library also exposes:

```ts
map()
mapArray()
```

for direct mapping.

---

# Boolean Mapping

SQL Server applications frequently represent booleans using values such as:

```text
1 / 0
Y / N
T / F
ON / OFF
```

`mssql-core` supports metadata-driven boolean conversion.

```ts
const bools: Attribute[] = [
  {
    name: "active",
    type: "boolean",
    true: 1,
  },
]
```

A value of `1` is converted to:

```ts
true
```

when returned from the database.

Without an explicit `true` value, common true representations such as `1`, `T`, `Y`, and `ON` are recognized.

---

# Metadata

The library provides a lightweight metadata model:

```ts
export interface Attribute {
  name?: string
  column?: string
  type?: DataType
  default?: string | number | Date | boolean
  key?: boolean
  noinsert?: boolean
  noupdate?: boolean
  version?: boolean
  ignored?: boolean
  true?: string | number
  false?: string | number
}
```

Attributes are defined as:

```ts
const attributes: Attributes = {
  id: {
    column: "USER_ID",
    key: true,
    type: "integer",
  },

  name: {
    column: "USER_NAME",
    type: "string",
  },

  active: {
    column: "ACTIVE",
    type: "boolean",
    true: 1,
    false: 0,
  },

  version: {
    column: "VERSION",
    type: "integer",
    version: true,
  },
}
```

Metadata can be inspected using:

```ts
const m = metadata(attributes)

console.log(m.keys)
console.log(m.bools)
console.log(m.version)
console.log(m.fields)
```

---

# Data Types

The metadata model supports:

```ts
type DataType =
  | "ObjectId"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "number"
  | "integer"
  | "string"
  | "text"
  | "object"
  | "array"
  | "binary"
  | "primitives"
  | "booleans"
  | "numbers"
  | "integers"
  | "strings"
  | "dates"
  | "datetimes"
  | "times"
```

The type metadata primarily describes application/database fields and is used by higher-level persistence functionality.

---

# Build Insert / Update Statements

`buildToSave()` generates an `INSERT` or `UPDATE` statement from an object and its metadata.

```ts
const user = {
  id: 100,
  name: "John",
  active: true,
}

const statement = buildToSave(
  user,
  "USERS",
  attributes,
)

console.log(statement.query)
console.log(statement.params)
```

The generated statement contains parameter placeholders such as:

```sql
@p1
@p2
@p3
```

while the actual values are returned separately through:

```ts
statement.params
```

This keeps data values parameterized.

---

# Insert / Update Behavior

Primary keys determine whether the object is treated as an insert or an update.

Conceptually:

```text
Primary key values missing
        │
        ▼
      INSERT

Primary key values present
        │
        ▼
      UPDATE
```

For example:

```ts
{
  id: null,
  name: "John",
}
```

is treated as an insert.

While:

```ts
{
  id: 100,
  name: "John",
}
```

is treated as an update.

Composite keys are supported.

---

# Attribute Options

## `key`

Marks a field as part of the primary-key condition.

```ts
id: {
  key: true,
}
```

## `column`

Maps a TypeScript property to a database column.

```ts
userId: {
  column: "USER_ID",
}
```

## `ignored`

Prevents a field from being persisted.

```ts
password: {
  ignored: true,
}
```

## `noinsert`

Prevents a field from being included in an `INSERT`.

```ts
createdAt: {
  noinsert: true,
}
```

## `noupdate`

Prevents a field from being included in an `UPDATE`.

```ts
createdAt: {
  noupdate: true,
}
```

## `default`

Provides a value when the object field is `null` or `undefined`.

```ts
active: {
  default: 1,
}
```

## `version`

Marks a field as an optimistic version field.

```ts
version: {
  version: true,
}
```

---

# Optimistic Versioning

A version field can be used for optimistic concurrency control.

Example metadata:

```ts
const attributes: Attributes = {
  id: {
    column: "USER_ID",
    key: true,
  },

  name: {
    column: "USER_NAME",
  },

  version: {
    column: "VERSION",
    version: true,
  },
}
```

During an update, the generated SQL increments the version:

```sql
VERSION = VERSION + 1
```

and can include the expected version in the update condition.

This allows applications to detect concurrent modifications using the affected-row count.

---

# Batch Operations

A `Statement` is represented by:

```ts
export interface Statement {
  query: string
  params?: any[]
}
```

Build a batch:

```ts
const statements = buildToSaveBatch(
  users,
  "USERS",
  attributes,
)
```

Then execute:

```ts
const affected = await db.executeBatch(statements)
```

Multiple statements are executed in a transaction.

A single statement is executed directly without creating an additional explicit transaction.

---

# Conditional Batch Execution

`executeBatch()` supports:

```ts
requireFirstAffected
```

When enabled, subsequent statements are executed only when the first statement affects at least one row.

```ts
await db.executeBatch(
  statements,
  true,
)
```

This is useful for workflows such as:

```text
First operation
     │
     ├── affected rows > 0 → execute remaining operations
     │
     └── affected rows = 0 → stop
```

---

# SQLWriter

`SQLWriter<T>` provides a reusable object-to-database writer.

```ts
const writer = new SQLWriter<User>(
  pool,
  "USERS",
  attributes,
)

const affected = await writer.write({
  id: 100,
  name: "John",
  active: true,
})
```

`SQLWriter` combines:

```text
Object
  ↓
Metadata
  ↓
buildToSave()
  ↓
SQL execution
```

An optional mapping function can transform the application object before persistence:

```ts
const writer = new SQLWriter<User>(
  pool,
  "USERS",
  attributes,
  false,
  (user) => ({
    ...user,
    name: user.name.trim(),
  }),
)
```

---

# BatchWriter

`BatchWriter<T>` writes multiple objects in one batch.

```ts
const writer = new BatchWriter<User>(
  pool,
  "USERS",
  attributes,
)

const affected = await writer.write(users)
```

The objects are converted into statements using:

```ts
buildToSaveBatch()
```

and then executed through:

```ts
executeBatch()
```

---

# BufferedBatchWriter

`BufferedBatchWriter<T>` is designed for streaming and high-volume workloads.

```ts
const writer = new BufferedBatchWriter<User>(
  pool,
  "USERS",
  attributes,
  5000,
)

for (const user of users) {
  await writer.write(user)
}

await writer.flush()
```

Objects are buffered until the configured batch size is reached.

```text
write()
write()
write()
...
write()
  │
  ▼
batch size reached
  │
  ▼
flush()
  │
  ▼
executeBatch()
```

This is useful for:

* CSV imports
* ETL
* Data migration
* Synchronization jobs
* Large back-office processing jobs

---

# Duplicate Key Detection

Database errors are normalized for duplicate primary-key violations.

When SQL Server reports a primary-key violation, the error may be marked with:

```ts
err.error = "duplicate"
```

This allows higher-level application code to distinguish duplicate-record failures from other database errors.

---

# Utility Functions

The package also provides several low-level utilities:

```ts
param()
params()
toString()
toArray()
map()
mapArray()
metadata()
handleResults()
handleBool()
```

These functions can be used independently when building custom persistence components.

---

# Complete Example

```ts
import sql from "mssql"
import {
  Attributes,
  PoolManager,
  SQLWriter,
} from "mssql-core"

interface User {
  id?: number
  name: string
  active: boolean
  version?: number
}

const attributes: Attributes = {
  id: {
    column: "USER_ID",
    key: true,
    type: "integer",
  },

  name: {
    column: "USER_NAME",
    type: "string",
  },

  active: {
    column: "ACTIVE",
    type: "boolean",
    true: 1,
    false: 0,
  },

  version: {
    column: "VERSION",
    type: "integer",
    version: true,
  },
}

async function main() {
  const pool = await sql.connect({
    server: "localhost",
    database: "app",
    user: "sa",
    password: "password",
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  })

  const db = new PoolManager(pool)

  const users = await db.query<User>(
    `
    select
      USER_ID as id,
      USER_NAME as name,
      ACTIVE as active,
      VERSION as version
    from USERS
    `,
  )

  console.log(users)

  const writer = new SQLWriter<User>(
    pool,
    "USERS",
    attributes,
  )

  await writer.write({
    id: 100,
    name: "John",
    active: true,
    version: 1,
  })
}

main().catch(console.error)
```

---

# When to Use mssql-core

`mssql-core` is a good fit when you want:

* Direct SQL control
* A small and predictable database API
* Reusable transaction abstractions
* Parameterized query execution
* Metadata-driven persistence
* Batch and buffered processing
* Enterprise-oriented database infrastructure
* A lightweight alternative to a full ORM

It is particularly useful in applications with a strong service/repository architecture where SQL remains part of the infrastructure layer.

# When Not to Use It

`mssql-core` is not intended to replace a full ORM when your application requires features such as:

* Automatic relationship management
* Complex entity graphs
* Change tracking
* Schema migrations
* A fully abstracted query language
* Automatic lazy/eager loading

The library intentionally keeps SQL close to the application.

---

# Design

The library is based on a few simple abstractions:

```text
Executor
   │
   ├── PoolManager
   │
   └── SqlTransaction

Metadata
   │
   ├── Attribute
   ├── metadata()
   ├── buildToSave()
   └── buildToSaveBatch()

Writers
   │
   ├── SQLWriter
   ├── BatchWriter
   └── BufferedBatchWriter
```

This separation allows applications to use only the level of abstraction they need.

---

# License

MIT

# mssql-core

A lightweight TypeScript database core for Microsoft SQL Server, built on top of the [`mssql`](https://www.npmjs.com/package/mssql) driver.

`mssql-core` provides a small and reusable database abstraction for SQL execution, transactions, parameter binding, result mapping, boolean conversion, and common query helpers. It is designed to serve as a **database core layer**, not as an ORM.

## Installation

```bash
npm install mssql-core mssql
```

## Overview

The library exposes a common `Executor` abstraction implemented by both the connection-pool manager and transaction manager:

```text
                    Executor
                       │
             ┌─────────┴─────────┐
             │                   │
        PoolManager        SqlTransaction
             │                   │
      ConnectionPool         Transaction
```

This allows repositories and data-access code to use the same API for normal database operations and transactional operations.

## Features

* TypeScript-first API
* Lightweight wrapper around `mssql`
* Connection-pool based database execution
* Transaction abstraction
* Common `Executor` interface
* Positional SQL parameters
* Generic query results
* `queryOne()` for single-row queries
* `executeScalar()` for scalar values
* `count()` helper
* Batch execution
* Transactional batch execution
* Column/property mapping
* Configurable boolean conversion
* JSON serialization for object parameters
* Dynamic field utilities
* Duplicate primary-key error normalization

## Basic Usage

Create a `PoolManager` from an existing `mssql.ConnectionPool`:

```typescript
import sql from "mssql"
import { PoolManager } from "mssql-core"

const pool = await sql.connect({
  server: "localhost",
  database: "mydb",
  user: "sa",
  password: "your-password",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
})

const db = new PoolManager(pool)
```

`PoolManager` receives an existing pool and uses it for database operations. It does not own the pool lifecycle.

## Query

```typescript
const users = await db.query<User>(
  `
  SELECT id, name, email
  FROM users
  WHERE status = @1
  `,
  ["ACTIVE"]
)
```

Parameters are positional. For SQL Server, `param()` generates names such as:

```typescript
db.param(1) // @1
db.param(2) // @2
```

## Query One

Use `queryOne()` when only the first row is required:

```typescript
const user = await db.queryOne<User>(
  `
  SELECT id, name, email
  FROM users
  WHERE id = @1
  `,
  [100]
)

if (user) {
  console.log(user.name)
}
```

`queryOne()` returns the first result or `null` when no rows are returned.

## Execute

Use `execute()` for `INSERT`, `UPDATE`, `DELETE`, or other statements where the affected-row count is required:

```typescript
const affected = await db.execute(
  `
  UPDATE users
  SET status = @1
  WHERE id = @2
  `,
  ["ACTIVE", 100]
)
```

The returned value is the first `rowsAffected` value reported by `mssql`.

## Execute Scalar

`executeScalar()` returns the first column of the first returned row:

```typescript
const total = await db.executeScalar<number>(
  `
  SELECT COUNT(*) AS total
  FROM users
  `
)
```

It returns `null` when no row is returned.

## Count

`count()` is a convenience wrapper around `executeScalar()`:

```typescript
const total = await db.count(
  `
  SELECT COUNT(*) AS total
  FROM users
  `
)
```

When the scalar result is `null`, `count()` returns `0`.

## Batch Execution

`executeBatch()` accepts an array of SQL statements:

```typescript
const affected = await db.executeBatch([
  {
    query: `
      UPDATE users
      SET status = @1
      WHERE id = @2
    `,
    params: ["ACTIVE", 1]
  },
  {
    query: `
      UPDATE users
      SET status = @1
      WHERE id = @2
    `,
    params: ["ACTIVE", 2]
  }
])
```

For multiple statements, the implementation creates a transaction and executes the statements through `executeBatchTx()`. Errors cause the transaction to be rolled back.

For an empty batch, the function returns `0`. For a single statement, it directly calls `execute()` rather than creating a batch transaction.

## Conditional Batch Execution

`executeBatch()` supports the `requireFirstAffected` option:

```typescript
await db.executeBatch(
  [
    {
      query: `
        UPDATE users
        SET status = @1
        WHERE id = @2
      `,
      params: ["ACTIVE", 100]
    },
    {
      query: `
        INSERT INTO user_logs(user_id, action)
        VALUES (@1, @2)
      `,
      params: [100, "ACTIVATE"]
    }
  ],
  true
)
```

When `requireFirstAffected` is enabled, the first statement is executed first. The remaining statements are executed only when the first statement reports affected rows.

## Transactions

`DB` extends `Executor` with `beginTransaction()`:

```typescript
export interface DB extends Executor {
  beginTransaction(): Promise<Tx>
}
```

`Tx` extends `Executor` with:

```typescript
export interface Tx extends Executor {
  commit(): Promise<void>
  rollback(): Promise<void>
}
```

A transaction is represented by `SqlTransaction`, which wraps `mssql.Transaction` and exposes the same database operations as `PoolManager`.

## Parameters

Parameters are passed as an array:

```typescript
await db.query(
  `
  SELECT *
  FROM users
  WHERE id = @1
    AND status = @2
  `,
  [100, "ACTIVE"]
)
```

`setParameters()` maps array positions to SQL Server parameters:

```text
args[0] → @1
args[1] → @2
args[2] → @3
```

`null` and `undefined` are normalized to `NULL`. `Date` values are passed directly.

## Object Parameters

The `resource.string` setting controls how non-Date JavaScript objects are passed to `mssql`.

```typescript
import { resource } from "mssql-core"

resource.string = true
```

When enabled, objects are serialized with `JSON.stringify()` before being passed as parameters:

```typescript
const document = {
  name: "John",
  age: 30
}

await db.execute(
  `
  INSERT INTO documents(data)
  VALUES (@1)
  `,
  [document]
)
```

The same conversion behavior is available through `toArray()`.

## Result Mapping

Query results can be mapped from database column names to application property names:

```typescript
const users = await db.query<User>(
  `
  SELECT
    user_id,
    first_name,
    last_name
  FROM users
  `,
  [],
  {
    user_id: "id",
    first_name: "firstName",
    last_name: "lastName"
  }
)
```

A row such as:

```typescript
{
  user_id: 100,
  first_name: "John",
  last_name: "Smith"
}
```

becomes:

```typescript
{
  id: 100,
  firstName: "John",
  lastName: "Smith"
}
```

`mapArray()` creates new objects for mapped results.

## Boolean Mapping

SQL Server applications may represent boolean values as numbers or strings. `mssql-core` provides `Attribute` definitions for converting these values to JavaScript booleans.

```typescript
const users = await db.query<User>(
  `
  SELECT id, enabled
  FROM users
  `,
  [],
  undefined,
  [
    {
      name: "enabled"
    }
  ]
)
```

By default, the following values are treated as `true`:

```text
"1"
"T"
"Y"
"ON"
```

Other non-boolean, non-null values are treated as `false`.

A custom true value can be configured:

```typescript
{
  name: "enabled",
  true: "ACTIVE"
}
```

or:

```typescript
{
  name: "enabled",
  true: 1
}
```

`Attribute.true` accepts both strings and numbers.

## Field Selection Utilities

The library includes helpers for dynamically selecting fields.

### `getFields()`

```typescript
const fields = getFields(
  ["id", "name", "invalid"],
  ["id", "name", "email"]
)
```

When `all` is supplied, only fields contained in that list are returned. If there are no valid fields, `undefined` is returned.

### `buildFields()`

```typescript
const fields = buildFields(
  ["id", "name"],
  ["id", "name", "email"]
)

// "id,name"
```

When no fields are available, `buildFields()` returns:

```text
*
```

These helpers are intended for SQL construction. Field names should be validated by the caller before being inserted into SQL.

### `getMapField()`

```typescript
const column = getMapField("userId", mapping)
```

It returns the mapped name when a mapping exists, otherwise the original name.

## Error Handling

`mssql-core` preserves the original `mssql` error and adds a normalized `error` property for primary-key violations.

When SQL Server reports an error beginning with:

```text
Violation of PRIMARY KEY constraint
```

the library sets:

```typescript
err.error = "duplicate"
```

This allows application code to handle duplicate records without depending on the complete SQL Server error message:

```typescript
try {
  await db.execute(...)
} catch (err: any) {
  if (err.error === "duplicate") {
    // Handle duplicate record
  }

  throw err
}
```

## Connection Pool Ownership

`PoolManager` receives an existing `sql.ConnectionPool`:

```typescript
const db = new PoolManager(pool)
```

It does not close the pool itself. The application remains responsible for the pool lifecycle.

For example, during application shutdown:

```typescript
await pool.close()
```

This allows one connection pool to be shared by multiple components without `PoolManager` unexpectedly terminating it.

## API

### Interfaces

```text
StringMap
Statement
Executor
Tx
DB
Attribute
Attributes
```

### Classes

```text
resource
PoolManager
SqlTransaction
```

### Database Operations

```text
execute()
executeBatch()
executeBatchTx()
query()
queryOne()
executeScalar()
count()
```

### Parameter Helpers

```text
setParameters()
toArray()
```

### Result Helpers

```text
handleResult()
handleResults()
handleBool()
mapArray()
```

### Field Helpers

```text
getFields()
buildFields()
getMapField()
```

## Architecture

`mssql-core` sits between application data-access code and the `mssql` driver:

```text
Application
     │
     ▼
Repository / Data Access Layer
     │
     ▼
mssql-core
     │
     ▼
mssql
     │
     ▼
Microsoft SQL Server
```

The library deliberately focuses on database execution infrastructure rather than entity mapping, relationships, migrations, or ORM behavior.

# mssql-core

A lightweight TypeScript library for working with Microsoft SQL Server on Node.js, built on top of [`mssql`](https://www.npmjs.com/package/mssql).

`mssql-core` provides metadata-driven SQL generation and execution utilities for inserting, updating, upserting, batching, versioning, and streaming data.

## Features

* Metadata-driven object-to-table mapping
* Insert and update support
* Insert-or-update (upsert) support
* Optimistic version support
* Batch persistence
* Buffered/streaming writes
* Parameterized SQL values
* Boolean value mapping
* Object and JSON parameter handling
* Custom SQL parameter builders
* Transaction-based batch execution
* Simple duplicate-key error normalization
* Separate SQL generation and database execution

## Installation

```bash
npm install mssql-core mssql
```

## Basic Usage

```typescript
import sql from "mssql"
import {
  Attributes,
  save
} from "mssql-core"

const pool = await sql.connect({
  server: "localhost",
  database: "app",
  user: "sa",
  password: "password",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
})

interface User {
  id: number
  name: string
  active: boolean
}

const attributes: Attributes = {
  id: {
    key: true
  },
  name: {
    type: "string"
  },
  active: {
    type: "boolean",
    true: "1",
    false: "0"
  }
}

await save(
  pool,
  {
    id: 1,
    name: "John",
    active: true
  },
  "users",
  attributes
)
```

## Attributes

The persistence mapping is defined through `Attributes`.

```typescript
export interface Attribute {
  name?: string
  column?: string
  type?: DataType
  default?: string | number | Date | boolean
  key?: boolean
  noinsert?: boolean
  noupdate?: boolean
  version?: boolean
  ignored?: boolean
  true?: string | number
  false?: string | number
}
```

### Key

Marks an attribute as a key used to identify an existing row.

```typescript
id: {
  key: true
}
```

### Column

Maps an object property to a different SQL Server column.

```typescript
userName: {
  column: "user_name"
}
```

### Default

Provides a default application value when the property is `null` or `undefined`.

```typescript
status: {
  default: "ACTIVE"
}
```

### No Insert

Excludes a field from `INSERT`.

```typescript
createdAt: {
  noinsert: true
}
```

### No Update

Excludes a field from `UPDATE`.

```typescript
createdAt: {
  noupdate: true
}
```

### Ignored

Completely excludes a field from persistence.

```typescript
temporary: {
  ignored: true
}
```

### Version

Marks an attribute as the optimistic version field.

```typescript
version: {
  type: "integer",
  version: true
}
```

## Data Types

The library defines the following application-level data types:

```text
ObjectId
date
datetime
time
boolean
number
integer
string
text
object
array
binary
primitives
booleans
numbers
integers
strings
dates
datetimes
times
```

The metadata describes the intended representation while parameter conversion is handled by `mssql`.

## Insert and Update

When key attributes are configured, `buildToSave()` generates an insert-or-update operation.

Conceptually:

```sql
IF EXISTS (
    SELECT ...
    FROM users
    WHERE ...
)
    UPDATE users
    SET ...
    WHERE ...
ELSE
    INSERT INTO users(...)
    VALUES(...)
```

Without key attributes, the operation is generated as an `INSERT`.

## SQL Generation

SQL generation is separated from execution.

```typescript
import {
  buildToSave
} from "mssql-core"

const statement = buildToSave(
  user,
  "users",
  attributes
)

console.log(statement.query)
console.log(statement.params)
```

The result is:

```typescript
export interface Statement {
  query: string
  params?: any[]
}
```

This makes it possible to inspect, test, or execute generated SQL through another persistence layer.

## Save

`save()` combines SQL generation and execution.

```typescript
import { save } from "mssql-core"

const count = await save(
  pool,
  user,
  "users",
  attributes
)
```

A custom execution function can also be supplied:

```typescript
const count = await save(
  execute,
  user,
  "users",
  attributes
)
```

## Batch Save

Use `saveBatch()` for multiple objects.

```typescript
import { saveBatch } from "mssql-core"

const users = [
  {
    id: 1,
    name: "John",
    active: true
  },
  {
    id: 2,
    name: "Jane",
    active: false
  }
]

const count = await saveBatch(
  pool,
  users,
  "users",
  attributes
)
```

Multiple statements are executed through a transaction.

## Batch SQL Generation

To generate statements without executing them:

```typescript
import {
  buildToSaveBatch
} from "mssql-core"

const statements = buildToSaveBatch(
  users,
  "users",
  attributes
)
```

## Transactions

`executeBatch()` executes a collection of statements inside a transaction.

```typescript
import {
  executeBatch
} from "mssql-core"

const count = await executeBatch(
  pool,
  statements
)
```

When an execution fails, the transaction is rolled back.

For an existing transaction, use `executeBatchTx()`:

```typescript
import {
  executeBatchTx
} from "mssql-core"

await executeBatchTx(
  transaction,
  statements
)
```

## Direct SQL Execution

`execute()` executes a parameterized SQL statement using a connection pool or transaction.

```typescript
import {
  execute
} from "mssql-core"

const count = await execute(
  pool,
  "update users set active = @1 where id = @2",
  [true, 1]
)
```

The return value is the affected-row count reported by SQL Server.

## Boolean Mapping

Boolean values can be mapped to the representation expected by the database.

```typescript
active: {
  type: "boolean",
  true: "1",
  false: "0"
}
```

The default representation is:

```text
true  → "1"
false → "0"
```

Numeric values are also supported:

```typescript
active: {
  type: "boolean",
  true: 1,
  false: 0
}
```

## Versioning

An attribute can be marked as a version field:

```typescript
const attributes: Attributes = {
  id: {
    key: true
  },

  name: {},

  version: {
    type: "integer",
    version: true
  }
}
```

When updating an existing row, the current version is included in the update condition and the version is incremented.

This provides optimistic version checking for concurrent updates.

A version can also be explicitly supplied to `buildToSave()`, `save()`, or the writer classes.

## SQLWriter

`SQLWriter<T>` provides an object-oriented interface for saving one object at a time.

```typescript
import {
  SQLWriter
} from "mssql-core"

const writer = new SQLWriter<User>(
  pool,
  "users",
  attributes
)

await writer.write(user)
```

### Mapping Objects

A mapping function can transform an object before persistence.

```typescript
const writer = new SQLWriter<User>(
  pool,
  "users",
  attributes,
  false,
  (user) => ({
    ...user,
    name: user.name.trim()
  })
)
```

### One-If-Success

The `oneIfSuccess` option can normalize a successful write to `1` and an unsuccessful write to `0`.

```typescript
const writer = new SQLWriter<User>(
  pool,
  "users",
  attributes,
  true
)
```

## BatchWriter

`BatchWriter<T>` accepts an array and executes the generated statements as a batch.

```typescript
import {
  BatchWriter
} from "mssql-core"

const writer = new BatchWriter<User>(
  pool,
  "users",
  attributes
)

await writer.write(users)
```

A mapping function can also be supplied.

```typescript
const writer = new BatchWriter<User>(
  pool,
  "users",
  attributes,
  false,
  (user) => ({
    ...user,
    name: user.name.trim()
  })
)
```

## BufferedBatchWriter

`BufferedBatchWriter<T>` buffers objects and automatically flushes when the buffer reaches the configured size.

```typescript
import {
  BufferedBatchWriter
} from "mssql-core"

const writer = new BufferedBatchWriter<User>(
  pool,
  "users",
  attributes,
  5000
)

for (const user of users) {
  await writer.write(user)
}

await writer.flush()
```

The default buffer size is `5000`.

This is useful for processing large data sets incrementally.

## Custom Parameter Builder

The default parameter format is:

```text
@1
@2
@3
...
```

using:

```typescript
import { param } from "mssql-core"

param(1) // @1
param(2) // @2
```

A custom parameter builder can be supplied:

```typescript
const buildParam = (i: number) => `@p${i}`

const statement = buildToSave(
  user,
  "users",
  attributes,
  undefined,
  buildParam
)
```

## Object Parameters

Objects can be used as parameters.

By default, object values are passed directly to `mssql`.

The library also provides the global `resource.string` option:

```typescript
import {
  resource
} from "mssql-core"

resource.string = true
```

When enabled, non-Date objects are serialized using `JSON.stringify()` before being passed to SQL Server.

## Array Parameters

`toArray()` normalizes array values for database parameters.

```typescript
import {
  toArray
} from "mssql-core"

const values = toArray(items)
```

It handles:

* `null`
* `undefined`
* `Date`
* objects
* JSON serialization when `resource.string` is enabled

## Datetime Strings

The library normally sends values to SQL Server through parameters.

For datetime strings, `resource.ignoreDatetime` can be enabled:

```typescript
resource.ignoreDatetime = true
```

When enabled, a string mapped as `datetime` can be written directly into the generated SQL.

Use this setting only with trusted values.

## Error Handling

SQL Server primary-key violations are normalized by adding:

```typescript
err.error = "duplicate"
```

Example:

```typescript
try {
  await save(
    pool,
    user,
    "users",
    attributes
  )
} catch (err) {
  if (err.error === "duplicate") {
    console.log("Duplicate record")
  }

  throw err
}
```

## Security

Normal values are sent to SQL Server through `mssql` parameters.

However, table names and column names are part of the generated SQL and are not parameterized.

Therefore, `table` and `Attribute.column` must come from trusted application configuration and must not be taken directly from untrusted user input.

The `resource.ignoreDatetime` option also allows datetime strings to be inserted directly into generated SQL, so it should only be used with trusted or validated values.

## Architecture

The library separates SQL generation from database execution:

```text
                   Attributes
                       │
                       ▼
                buildToSave()
                       │
                       ▼
                   Statement
                  /         \
               query       params
                  \         /
                   ▼       ▼
                    execute()
                       │
                       ▼
                   mssql.Request
                       │
                       ▼
                    SQL Server
```

The higher-level writers reuse the same core:

```text
                         buildToSave()
                              │
             ┌────────────────┼────────────────┐
             │                │                │
        SQLWriter      BatchWriter    BufferedBatchWriter
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                          execute()
                              │
                              ▼
                         SQL Server
```

## API Overview

| API                  | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `buildToSave()`      | Generate an SQL statement for one object      |
| `buildToSaveBatch()` | Generate statements for multiple objects      |
| `save()`             | Generate and execute a statement              |
| `saveBatch()`        | Generate and execute a batch                  |
| `execute()`          | Execute one SQL statement                     |
| `executeBatch()`     | Execute multiple statements in a transaction  |
| `executeBatchTx()`   | Execute a batch using an existing transaction |
| `setParameters()`    | Bind statement parameters                     |
| `toArray()`          | Normalize array parameters                    |
| `toString()`         | Convert a number to a SQL numeric literal     |
| `param()`            | Build a SQL parameter name                    |
| `version()`          | Find a version attribute                      |
| `SQLWriter`          | Write individual objects                      |
| `BatchWriter`     | Write object arrays                           |
| `BufferedBatchWriter`    | Buffer and write objects in batches           |
| `resource`           | Global behavior configuration                 |

## Design

`mssql-core` is intentionally focused on persistence infrastructure rather than being a full ORM.

It provides:

```text
Object
  │
  ▼
Attribute Mapping
  │
  ▼
SQL Generation
  │
  ▼
Parameterized Statement
  │
  ▼
Transaction / Execution
  │
  ▼
SQL Server
```

Application-specific concerns such as repositories, validation, domain models, and business rules remain outside the library.

## Requirements

* Node.js
* TypeScript
* Microsoft SQL Server
* [`mssql`](https://www.npmjs.com/package/mssql)

## License

MIT


## Repository

https://github.com/core-ts/mssql

## License

MIT

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

`BufferedBatchWriter` processes data one object at a time.

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
