"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
  var _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) _.ops.pop();
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
    if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mssql_1 = require("mssql");
var build_1 = require("./build");
var resource = (function () {
  function resource() {
  }
  return resource;
}());
exports.resource = resource;
var PoolManager = (function () {
  function PoolManager(db) {
    this.db = db;
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.execScalar = this.execScalar.bind(this);
    this.count = this.count.bind(this);
  }
  PoolManager.prototype.exec = function (q, args) {
    return exec(this.db, q, args);
  };
  PoolManager.prototype.execBatch = function (statements, firstSuccess) {
    return execBatch(this.db, statements, firstSuccess);
  };
  PoolManager.prototype.query = function (q, args, m, fields) {
    return query(this.db, q, args, m, fields);
  };
  PoolManager.prototype.queryOne = function (q, args, m, fields) {
    return queryOne(this.db, q, args, m, fields);
  };
  PoolManager.prototype.execScalar = function (q, args) {
    return execScalar(this.db, q, args);
  };
  PoolManager.prototype.count = function (q, args) {
    return count(this.db, q, args);
  };
  return PoolManager;
}());
exports.PoolManager = PoolManager;
function execBatch(db, statements, firstSuccess) {
  return __awaiter(this, void 0, void 0, function () {
    var c, transaction, query0, queries, request, result1, _i, queries_1, q, result, err_1, request, _a, statements_1, item, result, err_2;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          if (!statements || statements.length === 0) {
            return [2, Promise.resolve(0)];
          }
          else if (statements.length === 1) {
            return [2, exec(db, statements[0].query, statements[0].params)];
          }
          c = 0;
          transaction = new mssql_1.default.Transaction(db);
          if (!firstSuccess) return [3, 12];
          _b.label = 1;
        case 1:
          _b.trys.push([1, 9, , 11]);
          query0 = statements[0];
          queries = statements.slice(1);
          request = new mssql_1.default.Request(transaction);
          return [4, transaction.begin()];
        case 2:
          _b.sent();
          request.parameters = {};
          setParameters(request, query0.params);
          return [4, request.query(query0.query)];
        case 3:
          result1 = _b.sent();
          if (!(result1 && result1.rowsAffected[0] !== 0)) return [3, 7];
          c += result1.rowsAffected[0];
          _i = 0, queries_1 = queries;
          _b.label = 4;
        case 4:
          if (!(_i < queries_1.length)) return [3, 7];
          q = queries_1[_i];
          request.parameters = {};
          setParameters(request, q.params);
          return [4, request.query(q.query)];
        case 5:
          result = _b.sent();
          c += result.rowsAffected[0];
          _b.label = 6;
        case 6:
          _i++;
          return [3, 4];
        case 7: return [4, transaction.commit()];
        case 8:
          _b.sent();
          return [2, c];
        case 9:
          err_1 = _b.sent();
          buildError(err_1);
          return [4, transaction.rollback()];
        case 10:
          _b.sent();
          throw err_1;
        case 11: return [3, 21];
        case 12:
          _b.trys.push([12, 19, , 21]);
          request = new mssql_1.default.Request(transaction);
          return [4, transaction.begin()];
        case 13:
          _b.sent();
          _a = 0, statements_1 = statements;
          _b.label = 14;
        case 14:
          if (!(_a < statements_1.length)) return [3, 17];
          item = statements_1[_a];
          request.parameters = {};
          setParameters(request, item.params);
          return [4, request.query(item.query)];
        case 15:
          result = _b.sent();
          c += result.rowsAffected[0];
          _b.label = 16;
        case 16:
          _a++;
          return [3, 14];
        case 17: return [4, transaction.commit()];
        case 18:
          _b.sent();
          return [2, c];
        case 19:
          err_2 = _b.sent();
          return [4, transaction.rollback()];
        case 20:
          _b.sent();
          throw err_2;
        case 21: return [2];
      }
    });
  });
}
exports.execBatch = execBatch;
function buildError(err) {
  if (err.originalError && err.originalError.info) {
    var info = err.originalError.info;
    var m = info.message;
    if (m && typeof m === 'string' && m.startsWith('Violation of PRIMARY KEY constraint')) {
      err.error = 'duplicate';
    }
  }
  return err;
}
function exec(db, q, args) {
  var request = db.request();
  setParameters(request, args);
  return request.query(q)
    .then(function (results) { return results.rowsAffected[0]; })
    .catch(function (err) {
      buildError(err);
      throw err;
    });
}
exports.exec = exec;
function query(db, q, args, m, bools) {
  var request = db.request();
  setParameters(request, args);
  return request.query(q)
    .then(function (results) {
      return handleResults(results.recordset, m, bools);
    });
}
exports.query = query;
function queryOne(db, q, args, m, bools) {
  return query(db, q, args, m, bools)
    .then(function (results) {
      if (results && results.length > 0) {
        return results[0];
      }
      else {
        return null;
      }
    }).catch(function (err) {
      throw err;
    });
}
exports.queryOne = queryOne;
function execScalar(db, q, args) {
  return queryOne(db, q, args).then(function (r) {
    if (!r) {
      return null;
    }
    else {
      var keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}
exports.execScalar = execScalar;
function count(db, q, args) {
  return execScalar(db, q, args);
}
exports.count = count;
function save(db, obj, table, attrs, ver, buildParam, i) {
  var stm = build_1.buildToSave(obj, table, attrs, ver, buildParam, null, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    if (typeof db === 'function') {
      return db(stm.query, stm.params);
    }
    else {
      return exec(db, stm.query, stm.params);
    }
  }
}
exports.save = save;
function saveBatch(db, objs, table, attrs, ver, buildParam) {
  var stmts = build_1.buildToSaveBatch(objs, table, attrs, ver, buildParam);
  if (!stmts || stmts.length === 0) {
    return Promise.resolve(0);
  }
  else {
    if (typeof db === 'function') {
      return db(stmts);
    }
    else {
      return execBatch(db, stmts);
    }
  }
}
exports.saveBatch = saveBatch;
function setParameters(request, args) {
  if (args && args.length > 0) {
    var l = args.length;
    for (var i = 0; i < l; i++) {
      var j = i + 1;
      if (args[i] === undefined || args[i] == null) {
        request.input("" + j, null);
      }
      else {
        if (typeof args[i] === 'object') {
          if (args[i] instanceof Date) {
            request.input("" + j, args[i]);
          }
          else {
            if (resource.string) {
              var s = JSON.stringify(args[i]);
              request.input("" + j, s);
            }
            else {
              request.input("" + j, args[i]);
            }
          }
        }
        else {
          request.input("" + j, args[i]);
        }
      }
    }
  }
}
exports.setParameters = setParameters;
function toArray(arr) {
  if (!arr || arr.length === 0) {
    return [];
  }
  var p = [];
  var l = arr.length;
  for (var i = 0; i < l; i++) {
    if (arr[i] === undefined || arr[i] == null) {
      p.push(null);
    }
    else {
      if (typeof arr[i] === 'object') {
        if (arr[i] instanceof Date) {
          p.push(arr[i]);
        }
        else {
          if (resource.string) {
            var s = JSON.stringify(arr[i]);
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
exports.toArray = toArray;
function handleResult(r, m, bools) {
  if (r == null || r === undefined || (!m && (!bools || bools.length === 0))) {
    return r;
  }
  handleResults([r], m, bools);
  return r;
}
exports.handleResult = handleResult;
function handleResults(r, m, bools) {
  if (m) {
    var res = mapArray(r, m);
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
exports.handleResults = handleResults;
function handleBool(objs, bools) {
  if (!bools || bools.length === 0 || !objs) {
    return objs;
  }
  for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
    var obj = objs_1[_i];
    for (var _a = 0, bools_1 = bools; _a < bools_1.length; _a++) {
      var field = bools_1[_a];
      var v = obj[field.name];
      if (typeof v !== 'boolean' && v != null && v !== undefined) {
        var b = field.true;
        if (b == null || b === undefined) {
          obj[field.name] = ('1' == v || 'T' == v || 'Y' == v || 'ON' == v);
        }
        else {
          obj[field.name] = (v == b ? true : false);
        }
      }
    }
  }
  return objs;
}
exports.handleBool = handleBool;
function map(obj, m) {
  if (!m) {
    return obj;
  }
  var mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  var obj2 = {};
  var keys = Object.keys(obj);
  for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
    var key = keys_1[_i];
    var k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
exports.map = map;
function mapArray(results, m) {
  if (!m) {
    return results;
  }
  var mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  var objs = [];
  var length = results.length;
  for (var i = 0; i < length; i++) {
    var obj = results[i];
    var obj2 = {};
    var keys = Object.keys(obj);
    for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
      var key = keys_2[_i];
      var k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = obj[key];
    }
    objs.push(obj2);
  }
  return objs;
}
exports.mapArray = mapArray;
function getFields(fields, all) {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  var ext = [];
  if (all) {
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
      var s = fields_1[_i];
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
exports.getFields = getFields;
function buildFields(fields, all) {
  var s = getFields(fields, all);
  if (!s || s.length === 0) {
    return '*';
  }
  else {
    return s.join(',');
  }
}
exports.buildFields = buildFields;
function getMapField(name, mp) {
  if (!mp) {
    return name;
  }
  var x = mp[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  return name;
}
exports.getMapField = getMapField;
function isEmpty(s) {
  return !(s && s.length > 0);
}
exports.isEmpty = isEmpty;
function version(attrs) {
  var ks = Object.keys(attrs);
  for (var _i = 0, ks_1 = ks; _i < ks_1.length; _i++) {
    var k = ks_1[_i];
    var attr = attrs[k];
    if (attr.version) {
      attr.name = k;
      return attr;
    }
  }
  return undefined;
}
exports.version = version;
var SQLWriter = (function () {
  function SQLWriter(db, table, attributes, toDB, buildParam, ver) {
    this.table = table;
    this.attributes = attributes;
    this.write = this.write.bind(this);
    if (typeof db === 'function') {
      this.exec = db;
    }
    else {
      this.db = db;
    }
    this.param = buildParam;
    this.map = toDB;
    if (ver && ver.length > 0) {
      this.version = ver;
    }
    else {
      var x = version(this.attributes);
      if (x) {
        this.version = x.name;
      }
    }
  }
  SQLWriter.prototype.write = function (obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    var obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    var stmt = build_1.buildToSave(obj2, this.table, this.attributes, this.version, this.param);
    if (stmt) {
      if (this.exec) {
        return this.exec(stmt.query, stmt.params);
      }
      else {
        return exec(this.db, stmt.query, stmt.params);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SQLWriter;
}());
exports.SQLWriter = SQLWriter;
var SQLBatchWriter = (function () {
  function SQLBatchWriter(db, table, attributes, toDB, buildParam, ver) {
    this.table = table;
    this.attributes = attributes;
    this.write = this.write.bind(this);
    if (typeof db === 'function') {
      this.execute = db;
    }
    else {
      this.pool = db;
    }
    this.param = buildParam;
    this.map = toDB;
    if (ver && ver.length > 0) {
      this.version = ver;
    }
    else {
      var x = version(this.attributes);
      if (x) {
        this.version = x.name;
      }
    }
  }
  SQLBatchWriter.prototype.write = function (objs) {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    var list = objs;
    if (this.map) {
      list = [];
      for (var _i = 0, objs_2 = objs; _i < objs_2.length; _i++) {
        var obj = objs_2[_i];
        var obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    var stmts = build_1.buildToSaveBatch(list, this.table, this.attributes, this.version, this.param);
    if (stmts && stmts.length > 0) {
      if (this.execute) {
        return this.execute(stmts);
      }
      else {
        return execBatch(this.pool, stmts);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SQLBatchWriter;
}());
exports.SQLBatchWriter = SQLBatchWriter;
var SQLChecker = (function () {
  function SQLChecker(db, service, timeout) {
    this.db = db;
    this.service = service;
    this.timeout = timeout;
    if (!this.timeout) {
      this.timeout = 4200;
    }
    if (!this.service) {
      this.service = 'sqlite';
    }
    this.check = this.check.bind(this);
    this.name = this.name.bind(this);
    this.build = this.build.bind(this);
  }
  SQLChecker.prototype.check = function () {
    var obj = {};
    var request = this.db.request();
    var promise = request.query('select getdate();')
      .then(function (results) { return results.recordset; });
    if (this.timeout > 0) {
      return promiseTimeOut(this.timeout, promise);
    }
    else {
      return promise;
    }
  };
  SQLChecker.prototype.name = function () {
    return this.service;
  };
  SQLChecker.prototype.build = function (data, err) {
    if (err) {
      if (!data) {
        data = {};
      }
      data['error'] = err;
    }
    return data;
  };
  return SQLChecker;
}());
exports.SQLChecker = SQLChecker;
function promiseTimeOut(timeoutInMilliseconds, promise) {
  return Promise.race([
    promise,
    new Promise(function (resolve, reject) {
      setTimeout(function () {
        reject("Timed out in: " + timeoutInMilliseconds + " milliseconds!");
      }, timeoutInMilliseconds);
    })
  ]);
}
