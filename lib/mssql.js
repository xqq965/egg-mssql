'use strict';

const assert = require('assert');
const mssql = require('mssql');

module.exports = app => {
  app.addSingleton('mssql', createClient);
};


let count = 0;

async function createClient(config, app) {
  // test config
  assert(config.server && config.port && config.user && config.database, `[egg-mssql] 'server: ${config.server}', 'port: ${config.port}', 'user: ${config.user}', 'database: ${config.database}' are required on config`);

  app.coreLogger.info('[egg-mssql] connecting %s@%s:%s/%s', config.user, config.server, config.port, config.database);
  const pool = new mssql.ConnectionPool(config);
  const client = await pool.connect();
  
  //-----add
  
  //语句
  client.execdo = async function (dosql) {

    try {
       await mssql.close();// close
        let request = client.request();
        
       return await pool.request().query(dosql)

     // return await this.query(dosql)
    }
    catch (e) {
      console.error("----------------------------------------------------SQL语句操作错误-------------------------------------")
      console.error(dosql)
      console.log("--------------------------------------------------请注意查看------------------------------------")
      console.error("--------------------------------------------------begin----------------------------------------")
      console.log(e)
      console.error("---------------------------------------------------end-----------------------------------------")
      console.log("---------------------------------------------------请注意查看-----------------------------------")
      console.error("---------------------------------------------------SQL语句操作错误-------------------------------------")
      return {recordsets: [[],[{ RValue: 0 }]],recordset: [],msg:"操作失败，请稍后重试！"}
    }
  }
  
  client.exec = async function (proc, params, outparams) {
    await mssql.close();// close
    let request = client.request()
    try {
      if (params != null) {
        for (var index in params) {
          if (params[index] === undefined) {
            if (params[index] == undefined || params[index].val == undefined)
              console.log("index:" + index + " --params[index]-- " + params[index])
          }
          request.input(index, params[index])
        }
      }
      if (outparams != null)
        for (var index in outparams) {
          if (!outparams[index].type) {
            console.warn('output val must be like: @outname:{type:sql.Int}')
          } else
            request.output(index, outparams[index].type)

        }
      let res = await request.execute(proc)
      res.recordsets.push([{ RValue: res.returnValue||0 }])
      return res
    }
    catch (e) {
      console.error("----------------------------------------------------SQL_存过执行错误-------------------------------------")
      console.log(proc)
      console.log("--------------------------------------------------请注意查看------------------------------------")
      console.log(params,outparams)
      console.error("--------------------------------------------------begin----------------------------------------")
      console.log(e)
      console.error("---------------------------------------------------end-----------------------------------------")
      console.log("---------------------------------------------------请注意查看-----------------------------------")
      console.error("---------------------------------------------------SQL_存过执行错误-------------------------------------")
      return { recordsets: [[], [{ RValue: 0 }]], recordset: [], msg: "操作失败，请稍后重试！" }
    } finally {
      await mssql.close();// close
    }
  }

  //-----add end

  pool.on('error', err => {
    app.coreLogger.error('mssqlpool', err);
  });

  mssql.on('error', err => {
    app.coreLogger.error('mssqlglobal', err);
  });

  // 做启动应用前的检查
  app.beforeStart(async function startMssql() {
    const request = new mssql.Request(client);
    const rows = await request.query('select getdate() as currentTime;');
    const index = count++;
    app.coreLogger.info(`[egg-mssql] instance[${index}] status OK, mssql currentTime: ${rows.recordset[0].currentTime}`);
  });
  return client;
}
