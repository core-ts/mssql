var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
import sql from "mssql";
export class resource {
}
export function param(i) {
  return "@p" + i;
}
export function params(length, from) {
  if (from == null) {
    from = 0;
  }
  const ps = [];
  for (let i = 1; i <= length; i++) {
    ps.push(param(i + from));
  }
  return ps;
}
export function metadata(attrs) {
  const mp = {};
  const ks = Object.keys(attrs);
  const ats = [];
  const bools = [];
  const fields = [];
  const m = { keys: ats, fields };
  let isMap = false;
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      ats.push(attr);
    }
    if (!attr.ignored) {
      fields.push(k);
    }
    if (attr.type === "boolean") {
      bools.push(attr);
    }
    if (attr.version) {
      m.version = k;
    }
    const field = attr.column ? attr.column : k;
    const s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
      isMap = true;
    }
  }
  if (isMap) {
    m.map = mp;
  }
  if (bools.length > 0) {
    m.bools = bools;
  }
  return m;
}
export function buildToSave(obj, table, attrs, pks, ver, buildParam, i) {
  if (i == null) {
    i = 1;
  }
  if (!buildParam) {
    buildParam = param;
  }
  const cols = [];
  const values = [];
  const args = [];
  const ks = Object.keys(attrs);
  if (!pks) {
    pks = [];
    for (const k of ks) {
      const attr = attrs[k];
      attr.name = k;
      if (attr.key) {
        pks.push(attr);
      }
      if (attr.version) {
        ver = k;
      }
    }
  }
  const colQuery0 = [];
  let isUpdate = true;
  let isVersion = false;
  const o = obj;
  for (const k of pks) {
    if (k.name) {
      let v = obj[k.name];
      if (v == null) {
        isUpdate = false;
      }
    }
  }
  if (pks.length > 0 && isUpdate) {
    for (const attr of pks) {
      if (attr.name) {
        let v = o[attr.name];
        const field = attr.column ? attr.column : attr.name;
        let x;
        if (v === "") {
          x = `''`;
        }
        else if (typeof v === "number") {
          x = toString(v);
        }
        else {
          x = buildParam(i++);
          if (typeof v === "boolean") {
            if (v === true) {
              const v2 = attr.true !== undefined ? attr.true : 1;
              args.push(v2);
            }
            else {
              const v2 = attr.false !== undefined ? attr.false : 0;
              args.push(v2);
            }
          }
          else {
            args.push(v);
          }
        }
        colQuery0.push(`${field}=${x}`);
      }
    }
  }
  for (const k of ks) {
    const attr = attrs[k];
    if (!attr) {
      continue;
    }
    let v = o[k];
    if (v == null && attr.default !== undefined) {
      v = attr.default;
    }
    if (v != null && !attr.ignored && !attr.noinsert) {
      const field = attr.column ? attr.column : k;
      cols.push(field);
      if (attr.version) {
        isVersion = true;
        ver = k;
        values.push(`${1}`);
      }
      else {
        if (v === "") {
          values.push(`''`);
        }
        else if (typeof v === "number") {
          values.push(toString(v));
        }
        else if (typeof v === "boolean") {
          const p = buildParam(i++);
          values.push(p);
          if (v === true) {
            const v2 = attr.true !== undefined ? attr.true : 1;
            args.push(v2);
          }
          else {
            const v2 = attr.false !== undefined ? attr.false : 0;
            args.push(v2);
          }
        }
        else {
          values.push(buildParam(i++));
          args.push(v);
        }
      }
    }
  }
  if (cols.length > 0 && ver && isVersion === false) {
    const attr = attrs[ver];
    if (attr) {
      const field = attr.column ? attr.column : ver;
      cols.push(field);
      values.push("1");
    }
  }
  if (isUpdate === false || pks.length === 0) {
    if (cols.length === 0) {
      return { query: "", params: args };
    }
    else {
      const q = `insert into ${table}(${cols.join(",")})values(${values.join(",")})`;
      return { query: q, params: args };
    }
  }
  else {
    const colSet = [];
    let version = null;
    for (const k of ks) {
      let v = o[k];
      if (v !== undefined) {
        const attr = attrs[k];
        if (attr && !attr.key && !attr.ignored && !attr.noupdate) {
          const field = attr.column ? attr.column : k;
          let x;
          if (attr.version) {
            version = k;
            x = `${field} + 1`;
          }
          else {
            if (v === null) {
              x = "null";
            }
            else if (v === "") {
              x = `''`;
            }
            else if (typeof v === "number") {
              x = toString(v);
            }
            else {
              x = buildParam(i++);
              if (typeof v === "boolean") {
                if (v === true) {
                  const v2 = attr.true !== undefined ? attr.true : 1;
                  args.push(v2);
                }
                else {
                  const v2 = attr.false !== undefined ? attr.false : 0;
                  args.push(v2);
                }
              }
              else {
                args.push(v);
              }
            }
          }
          colSet.push(`${field}=${x}`);
        }
      }
    }
    if (colSet.length === 0) {
      return { query: "", params: args };
    }
    else {
      const colQuery = [];
      for (const attr of pks) {
        if (attr.name) {
          const v = o[attr.name];
          const field = attr.column ? attr.column : attr.name;
          let x;
          if (v === "") {
            x = `''`;
          }
          else if (typeof v === "number") {
            x = toString(v);
          }
          else {
            x = buildParam(i++);
            if (typeof v === "boolean") {
              if (v === true) {
                const v2 = attr.true !== undefined ? attr.true : 1;
                args.push(v2);
              }
              else {
                const v2 = attr.false !== undefined ? attr.false : 0;
                args.push(v2);
              }
            }
            else {
              args.push(v);
            }
          }
          colQuery.push(`${field}=${x}`);
        }
      }
      if (version && version.length > 0) {
        const v = o[version];
        if (typeof v === "number" && !isNaN(v)) {
          const attr = attrs[version];
          if (attr) {
            const field = attr.column ? attr.column : version;
            colQuery.push(`${field}=${v}`);
          }
        }
      }
      const field1 = pks[0].column ? pks[0].column : pks[0].name;
      const query = `if not exists (select ${field1} from ${table} where ${colQuery0.join(" and ")})
  insert into ${table}(${cols.join(",")})values(${values.join(",")})
  else
  update ${table} set ${colSet.join(",")} where ${colQuery.join(" and ")}`;
      return { query, params: args };
    }
  }
}
export function buildToSaveBatch(objs, table, attrs, pks, ver, buildParam) {
  if (!buildParam) {
    buildParam = param;
  }
  const sts = [];
  if (!pks) {
    pks = [];
    const ks = Object.keys(attrs);
    for (const k of ks) {
      const attr = attrs[k];
      attr.name = k;
      if (attr.key) {
        pks.push(attr);
      }
      if (attr.version) {
        ver = k;
      }
    }
  }
  for (const obj of objs) {
    const smt = buildToSave(obj, table, attrs, pks, ver, buildParam);
    if (smt.query) {
      sts.push(smt);
    }
  }
  return sts;
}
export function toString(v) {
  if (v === v && v !== Infinity && v !== -Infinity) {
    return "" + v;
  }
  return "null";
}
export class PoolManager {
  constructor(pool) {
    this.pool = pool;
    this.driver = "mssql";
    this.param = this.param.bind(this);
    this.beginTransaction = this.beginTransaction.bind(this);
    this.execute = this.execute.bind(this);
    this.executeBatch = this.executeBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  beginTransaction() {
    const transaction = new sql.Transaction(this.pool);
    return transaction.begin().then(() => {
      return new SqlTransaction(transaction);
    });
  }
  param(i) {
    return "@p" + i;
  }
  execute(q, args) {
    return execute(this.pool, q, args);
  }
  executeBatch(statements, requireFirstAffected) {
    return executeBatch(this.pool, statements, requireFirstAffected);
  }
  query(q, args, m, fields) {
    return query(this.pool, q, args, m, fields);
  }
  queryOne(q, args, m, fields) {
    return queryOne(this.pool, q, args, m, fields);
  }
  executeScalar(q, args) {
    return executeScalar(this.pool, q, args);
  }
  count(q, args) {
    return count(this.pool, q, args);
  }
}
function toErrorString(v) {
  if (typeof v === "string") {
    return v;
  }
  else {
    return JSON.stringify(v);
  }
}
export class SqlTransaction {
  constructor(tx, logError) {
    this.tx = tx;
    this.logError = logError;
    this.state = "active";
    this.driver = "mssql";
    this.param = this.param.bind(this);
    this.execute = this.execute.bind(this);
    this.executeBatch = this.executeBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
    this.commit = this.commit.bind(this);
    this.rollback = this.rollback.bind(this);
    this.ensureActive = this.ensureActive.bind(this);
  }
  ensureActive() {
    if (this.state !== "active") {
      throw new Error(`Transaction is already ${this.state}`);
    }
  }
  commit() {
    return __awaiter(this, void 0, void 0, function* () {
      this.ensureActive();
      try {
        yield this.tx.commit();
        this.state = "committed";
      }
      catch (err) {
        this.state = "unknown";
        throw err;
      }
    });
  }
  rollback() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.state !== "active" && this.state !== "unknown") {
        return;
      }
      try {
        yield this.tx.rollback();
        this.state = "rolledback";
      }
      catch (err) {
        this.state = "unknown";
        if (this.logError) {
          this.logError(`Transaction rollback failed: ${toErrorString(err)}`);
        }
      }
    });
  }
  param(i) {
    return "@p" + i;
  }
  execute(q, args) {
    this.ensureActive();
    return execute(this.tx, q, args);
  }
  executeBatch(statements, requireFirstAffected) {
    this.ensureActive();
    return executeBatchTx(this.tx, statements, requireFirstAffected);
  }
  query(q, args, m, fields) {
    this.ensureActive();
    return query(this.tx, q, args, m, fields);
  }
  queryOne(q, args, m, fields) {
    this.ensureActive();
    return queryOne(this.tx, q, args, m, fields);
  }
  executeScalar(q, args) {
    this.ensureActive();
    return executeScalar(this.tx, q, args);
  }
  count(q, args) {
    this.ensureActive();
    return count(this.tx, q, args);
  }
}
export function executeBatch(pool, statements, requireFirstAffected) {
  return __awaiter(this, void 0, void 0, function* () {
    if (!statements || statements.length === 0) {
      return Promise.resolve(0);
    }
    else if (statements.length === 1) {
      return execute(pool, statements[0].query, statements[0].params);
    }
    const transaction = new sql.Transaction(pool);
    return executeBatchWithTx(transaction, statements, requireFirstAffected);
  });
}
export function executeBatchWithTx(transaction, statements, requireFirstAffected) {
  return __awaiter(this, void 0, void 0, function* () {
    if (!statements || statements.length === 0) {
      return Promise.resolve(0);
    }
    let c = 0;
    if (requireFirstAffected) {
      try {
        const query0 = statements[0];
        yield transaction.begin();
        const request0 = new sql.Request(transaction);
        setParameters(request0, query0.params);
        const result1 = yield request0.query(query0.query);
        if (result1 && result1.rowsAffected[0] > 0) {
          c += result1.rowsAffected[0];
          const l = statements.length;
          for (let j = 1; j < l; j++) {
            const request = new sql.Request(transaction);
            setParameters(request, statements[j].params);
            const result = yield request.query(statements[j].query);
            if (result && result.rowsAffected[0] > 0) {
              c += result.rowsAffected[0];
            }
          }
        }
        yield transaction.commit();
        return c;
      }
      catch (err) {
        buildError(err);
        try {
          yield transaction.rollback();
        }
        catch (_a) {
        }
        throw err;
      }
    }
    else {
      try {
        yield transaction.begin();
        for (const item of statements) {
          const request = new sql.Request(transaction);
          setParameters(request, item.params);
          const result = yield request.query(item.query);
          if (result && result.rowsAffected[0] > 0) {
            c += result.rowsAffected[0];
          }
        }
        yield transaction.commit();
        return c;
      }
      catch (err) {
        buildError(err);
        try {
          yield transaction.rollback();
        }
        catch (_b) {
        }
        throw err;
      }
    }
  });
}
export function executeBatchTx(transaction, statements, requireFirstAffected) {
  return __awaiter(this, void 0, void 0, function* () {
    if (!statements || statements.length === 0) {
      return Promise.resolve(0);
    }
    else if (statements.length === 1) {
      return execute(transaction, statements[0].query, statements[0].params);
    }
    let c = 0;
    if (requireFirstAffected) {
      try {
        const query0 = statements[0];
        const request0 = new sql.Request(transaction);
        setParameters(request0, query0.params);
        const result1 = yield request0.query(query0.query);
        if (result1 && result1.rowsAffected[0] > 0) {
          c += result1.rowsAffected[0];
          const l = statements.length;
          for (let j = 1; j < l; j++) {
            const request = new sql.Request(transaction);
            setParameters(request, statements[j].params);
            const result = yield request.query(statements[j].query);
            if (result && result.rowsAffected[0] > 0) {
              c += result.rowsAffected[0];
            }
          }
        }
        return c;
      }
      catch (err) {
        buildError(err);
        throw err;
      }
    }
    else {
      try {
        for (const item of statements) {
          const request = new sql.Request(transaction);
          setParameters(request, item.params);
          const result = yield request.query(item.query);
          if (result && result.rowsAffected[0] > 0) {
            c += result.rowsAffected[0];
          }
        }
        return c;
      }
      catch (err) {
        buildError(err);
        throw err;
      }
    }
  });
}
function buildError(err) {
  if (err.originalError && err.originalError.info) {
    const info = err.originalError.info;
    const m = info.message;
    if (m && typeof m === "string" && m.startsWith("Violation of PRIMARY KEY constraint")) {
      err.error = "duplicate";
    }
  }
  return err;
}
export function execute(db, q, args) {
  const request = db.request();
  setParameters(request, args);
  return request
    .query(q)
    .then((results) => results.rowsAffected[0])
    .catch((err) => {
    buildError(err);
    throw err;
  });
}
export function query(db, q, args, m, bools) {
  const request = db.request();
  setParameters(request, args);
  return request.query(q).then((results) => {
    return handleResults(results.recordset, m, bools);
  });
}
export function queryOne(db, q, args, m, bools) {
  return query(db, q, args, m, bools).then((results) => {
    if (results && results.length > 0) {
      return results[0];
    }
    else {
      return null;
    }
  });
}
export function executeScalar(db, q, args) {
  return queryOne(db, q, args).then((r) => {
    if (!r) {
      return null;
    }
    else {
      const keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}
export function count(db, q, args) {
  return executeScalar(db, q, args).then((res) => (res !== null ? res : 0));
}
export function setParameters(request, args) {
  if (args && args.length > 0) {
    const l = args.length;
    for (let i = 0; i < l; i++) {
      const j = i + 1;
      if (args[i] === undefined || args[i] == null) {
        request.input(`p${j}`, null);
      }
      else {
        if (typeof args[i] === "object") {
          if (args[i] instanceof Date) {
            request.input(`p${j}`, args[i]);
          }
          else {
            if (resource.string) {
              const s = JSON.stringify(args[i]);
              request.input(`p${j}`, s);
            }
            else {
              request.input(`p${j}`, args[i]);
            }
          }
        }
        else {
          request.input(`p${j}`, args[i]);
        }
      }
    }
  }
}
export function toArray(arr) {
  if (!arr || arr.length === 0) {
    return [];
  }
  const p = [];
  const l = arr.length;
  for (let i = 0; i < l; i++) {
    if (arr[i] === undefined || arr[i] == null) {
      p.push(null);
    }
    else {
      if (typeof arr[i] === "object") {
        if (arr[i] instanceof Date) {
          p.push(arr[i]);
        }
        else {
          if (resource.string) {
            const s = JSON.stringify(arr[i]);
            p.push(s);
          }
          else {
            p.push(arr[i]);
          }
        }
      }
      else {
        p.push(arr[i]);
      }
    }
  }
  return p;
}
export function handleResult(r, m, bools) {
  if (r == null || r === undefined || (!m && (!bools || bools.length === 0))) {
    return r;
  }
  handleResults([r], m, bools);
  return r;
}
export function handleResults(r, m, bools) {
  if (m) {
    const res = mapArray(r, m);
    if (bools && bools.length > 0) {
      return handleBool(res, bools);
    }
    else {
      return res;
    }
  }
  else {
    if (bools && bools.length > 0) {
      return handleBool(r, bools);
    }
    else {
      return r;
    }
  }
}
export function handleBool(objs, bools) {
  if (!bools || bools.length === 0 || !objs) {
    return objs;
  }
  for (const obj of objs) {
    const o = obj;
    for (const field of bools) {
      if (field.name) {
        const v = o[field.name];
        if (typeof v !== "boolean" && v != null && v !== undefined) {
          const b = field.true;
          if (b == null || b === undefined) {
            o[field.name] = "1" == v || "T" == v || "Y" == v || "ON" == v;
          }
          else {
            o[field.name] = v == b ? true : false;
          }
        }
      }
    }
  }
  return objs;
}
export function map(obj, m) {
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const o = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    o[k0] = obj[key];
  }
  return o;
}
export function mapArray(results, m) {
  if (!m) {
    return results;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2 = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      const k0 = m[key] !== undefined ? m[key] : key;
      obj2[k0] = obj[key];
    }
    objs.push(obj2);
  }
  return objs;
}
export function getFields(fields, all) {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const ext = [];
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        ext.push(s);
      }
    }
    if (ext.length === 0) {
      return undefined;
    }
    else {
      return ext;
    }
  }
  else {
    return fields;
  }
}
export function buildFields(fields, all) {
  const s = getFields(fields, all);
  if (!s || s.length === 0) {
    return "*";
  }
  else {
    return s.join(",");
  }
}
export function getMapField(name, mp) {
  if (!mp) {
    return name;
  }
  const x = mp[name];
  if (!x) {
    return name;
  }
  if (typeof x === "string") {
    return x;
  }
  return name;
}
export function isEmpty(s) {
  return !(s && s.length > 0);
}
export class SQLWriter {
  constructor(pool, table, attributes, oneIfSuccess, map, buildParam) {
    this.pool = pool;
    this.table = table;
    this.attributes = attributes;
    this.oneIfSuccess = oneIfSuccess;
    this.map = map;
    this.write = this.write.bind(this);
    this.param = buildParam ? buildParam : param;
    const m = metadata(attributes);
    this.keys = m.keys;
    this.version = m.version;
  }
  write(obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    let obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    const stmt = buildToSave(obj2, this.table, this.attributes, this.keys, this.version, this.param);
    if (stmt.query) {
      if (this.oneIfSuccess) {
        return execute(this.pool, stmt.query, stmt.params).then((ct) => (ct > 0 ? 1 : 0));
      }
      else {
        return execute(this.pool, stmt.query, stmt.params);
      }
    }
    else {
      return Promise.resolve(0);
    }
  }
}
export class BufferedBatchWriter {
  constructor(pool, table, attributes, size = 5000, map, buildParam) {
    this.pool = pool;
    this.table = table;
    this.attributes = attributes;
    this.size = size;
    this.map = map;
    this.list = [];
    this.write = this.write.bind(this);
    this.flush = this.flush.bind(this);
    this.param = buildParam ? buildParam : param;
    const m = metadata(attributes);
    this.keys = m.keys;
    this.version = m.version;
  }
  write(obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    let obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
      this.list.push(obj2);
    }
    else {
      this.list.push(obj);
    }
    if (this.list.length < this.size) {
      return Promise.resolve(0);
    }
    else {
      return this.flush();
    }
  }
  flush() {
    if (!this.list || this.list.length === 0) {
      return Promise.resolve(0);
    }
    else {
      const stmt = buildToSaveBatch(this.list, this.table, this.attributes, this.keys, this.version, this.param);
      if (stmt.length > 0) {
        return executeBatch(this.pool, stmt).then((r) => {
          this.list = [];
          return r;
        });
      }
      else {
        this.list = [];
        return Promise.resolve(0);
      }
    }
  }
}
export class BatchWriter {
  constructor(pool, table, attributes, map, buildParam) {
    this.pool = pool;
    this.table = table;
    this.attributes = attributes;
    this.map = map;
    this.write = this.write.bind(this);
    this.param = buildParam ? buildParam : param;
    const m = metadata(attributes);
    this.keys = m.keys;
    this.version = m.version;
  }
  write(objs) {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    let list = objs;
    if (this.map) {
      list = [];
      for (const obj of objs) {
        const obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    const stmts = buildToSaveBatch(list, this.table, this.attributes, this.keys, this.version, this.param);
    if (stmts && stmts.length > 0) {
      return executeBatch(this.pool, stmts);
    }
    else {
      return Promise.resolve(0);
    }
  }
}
export class SQLChecker {
  constructor(pool, service = "mssql", timeout = 4500) {
    this.pool = pool;
    this.service = service;
    this.timeout = timeout;
  }
  name() {
    return this.service;
  }
  build(data, error) {
    return {
      name: this.name(),
      status: error ? "down" : "up",
      data,
      error,
    };
  }
  check() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const start = Date.now();
        yield Promise.race([this.pool.request().query("SELECT 1"), new Promise((_, reject) => setTimeout(() => reject(new Error("Health check timeout")), this.timeout))]);
        return this.build({
          responseTime: Date.now() - start,
        }, undefined);
      }
      catch (err) {
        return this.build({}, err);
      }
    });
  }
}
export class Exporter {
  constructor(pool, filename, buildQuery, format, write, end, attributes, logInfo, progressSize = 10000) {
    this.pool = pool;
    this.filename = filename;
    this.buildQuery = buildQuery;
    this.format = format;
    this.write = write;
    this.end = end;
    this.attributes = attributes;
    this.logInfo = logInfo;
    this.progressSize = progressSize;
    if (attributes) {
      this.map = buildMap(attributes);
    }
    this.export = this.export.bind(this);
  }
  export(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      const pool = yield this.pool.connect();
      const stmt = yield this.buildQuery(ctx);
      const request = pool.request();
      request.stream = true;
      request.query(stmt.query);
      let i = 0;
      let j = 0;
      request.on("row", (row) => {
        if (this.map) {
          i++;
          j++;
          const obj = mapOne(row, this.map);
          const str = this.format(obj);
          this.write(str);
          if (j >= this.progressSize) {
            if (this.logInfo) {
              this.logInfo(`Progress: ${i} records processed of file '${this.filename}'`);
            }
            j = 0;
          }
        }
        else {
          i++;
          j++;
          const str = this.format(row);
          this.write(str);
          if (j >= this.progressSize) {
            if (this.logInfo) {
              this.logInfo(`Progress: ${i} records processed of file '${this.filename}'`);
            }
            j = 0;
          }
        }
      });
      let er;
      request.on("error", (err) => {
        er = err;
        console.log(err);
      });
      return new Promise((resolve, reject) => {
        request.on("done", (res) => {
          this.end();
          if (er) {
            reject(er);
          }
          else {
            resolve(i);
          }
        });
      });
    });
  }
}
export class ExportService {
  constructor(pool, filename, queryBuilder, formatter, writer, attributes, logInfo, progressSize = 10000) {
    this.pool = pool;
    this.filename = filename;
    this.queryBuilder = queryBuilder;
    this.formatter = formatter;
    this.writer = writer;
    this.attributes = attributes;
    this.logInfo = logInfo;
    this.progressSize = progressSize;
    if (attributes) {
      this.map = buildMap(attributes);
    }
    this.export = this.export.bind(this);
  }
  export(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      const pool = yield this.pool.connect();
      const stmt = yield this.queryBuilder.build(ctx);
      const request = pool.request();
      request.stream = true;
      request.query(stmt.query);
      let i = 0;
      let k = 0;
      request.on("row", (row) => {
        if (this.map) {
          i++;
          k++;
          const obj = mapOne(row, this.map);
          const str = this.formatter.format(obj);
          this.writer.write(str);
          if (k >= this.progressSize) {
            if (this.logInfo) {
              this.logInfo(`Progress: ${i} records processed of file '${this.filename}'`);
            }
            k = 0;
          }
        }
        else {
          i++;
          k++;
          const str = this.formatter.format(row);
          this.writer.write(str);
          if (k >= this.progressSize) {
            if (this.logInfo) {
              this.logInfo(`Progress: ${i} records processed of file '${this.filename}'`);
            }
            k = 0;
          }
        }
      });
      let er;
      request.on("error", (err) => {
        er = err;
        console.log(err);
      });
      return new Promise((resolve, reject) => {
        request.on("done", (res) => {
          this.writer.end();
          if (er) {
            reject(er);
          }
          else {
            resolve(i);
          }
        });
      });
    });
  }
}
export function mapOne(result, m) {
  const obj = result;
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const obj2 = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
export function buildMap(attrs) {
  const mp = {};
  const ks = Object.keys(attrs);
  let isMap = false;
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    const field = attr.column ? attr.column : k;
    const s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
      isMap = true;
    }
  }
  if (isMap) {
    return mp;
  }
  return undefined;
}
export function select(table, attrs) {
  const cols = [];
  const ks = Object.keys(attrs);
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    const field = attr.column ? attr.column : k;
    cols.push(field);
  }
  return `select ${cols.join(",")} from ${table}`;
}
export function dateToString(date, separator) {
  const year = date.getFullYear().toString();
  let month = date.getMonth() + 1;
  let dt = date.getDate();
  if (dt < 10) {
    dt = "0" + dt.toString();
  }
  if (month < 10) {
    month = "0" + month;
  }
  if (separator !== undefined) {
    return year + separator + month + separator + dt;
  }
  else {
    return year + month + dt;
  }
}
export function timeToString(date, separator) {
  let hh = date.getHours();
  let mm = date.getMinutes();
  let ss = date.getSeconds();
  if (hh < 10) {
    hh = "0" + hh.toString();
  }
  if (ss < 10) {
    ss = "0" + ss.toString();
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  if (separator !== undefined) {
    return hh.toString() + separator + mm + separator + ss;
  }
  else {
    return hh.toString() + mm + ss;
  }
}
export function toISOString(d) {
  const s = `${dateToString(d, "-")}T${timeToString(d, ":")}.${getMilliseconds(d)}${getTimezone(d)}`;
  return s;
}
export function getTimezone(d) {
  const t = d.getTimezoneOffset() / 60;
  const p = d.getTimezoneOffset() % 60;
  if (t > 0) {
    return t > -10 ? "-0" + Math.abs(t) + ":00" : "-" + Math.abs(t) + ":" + getMinutes(p);
  }
  else {
    return t < 9 ? "+0" + Math.abs(t) + ":00" : Math.abs(t).toString() + ":" + getMinutes(p);
  }
}
export function getMinutes(p) {
  const x = Math.abs(p);
  return x >= 10 ? x.toString() : "0" + x;
}
export function getMilliseconds(d) {
  const m = d.getMilliseconds();
  if (m >= 100) {
    return m.toString();
  }
  else if (m >= 10) {
    return "0" + m;
  }
  else {
    return "00" + m;
  }
}
export function getFieldsByType(attrs, t) {
  const fis = [];
  const keys = Object.keys(attrs);
  for (const key of keys) {
    const attr = attrs[key];
    if (attr.type === t) {
      fis.push(key);
    }
  }
  return fis;
}
export function reformatDates(obj, ignores, dToString) {
  const toS = dToString ? dToString : toISOString;
  const keys = Object.keys(obj);
  for (const key of keys) {
    const v = obj[key];
    if (v instanceof Date) {
      if (!ignores.includes(key)) {
        obj[key] = toS(v);
      }
    }
  }
  return obj;
}
