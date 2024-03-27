import * as fs from "fs";
import secret from "../config";
import * as mysql from "mysql2";
import * as jwt from "jsonwebtoken";
import { createHash } from "crypto";
import Logger from "../loaders/logger";
import { Message } from "../utils/enums";
import getFormatDate from "../utils/date";
import { connection } from "../utils/mysql";
import { getRandomString, formatDate } from "../utils/utils";
import { Request, Response } from "express";
import { createMathExpr } from "svg-captcha";
import * as dayjs from "dayjs";

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

/** 保存验证码 */
let generateVerify: number;

/** 过期时间 单位：毫秒 默认 1分钟过期，方便演示 */
let expiresIn = 60000000000;

/**
 * @typedef Error
 * @property {string} code.required
 */

/**
 * @typedef Response
 * @property {[integer]} code
 */

// /**
//  * @typedef Login
//  * @property {string} username.required - 用户名 - eg: admin
//  * @property {string} password.required - 密码 - eg: admin123
//  * @property {integer} verify.required - 验证码
//  */

/**
 * @typedef Login
 * @property {string} username.required - 用户名 - eg: admin
 * @property {string} password.required - 密码 - eg: admin123
 */

/**
 * @route POST /login
 * @param {Login.model} point.body.required - the new point
 * @produces application/json application/xml
 * @consumes application/json application/xml
 * @summary 登录
 * @group 用户登录、注册相关
 * @returns {Response.model} 200
 * @returns {Array.<Login>} Login
 * @headers {integer} 200.X-Rate-Limit
 * @headers {string} 200.X-Expires-After
 * @security JWT
 */

const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  let sql: string =
    "select * from base_company_user where name=" + "'" + username + "'";
  connection.query(sql, async function (err, data: any) {
    if (data.length == 0) {
      await res.json({
        success: false,
        data: { message: Message[1] },
      });
    } else {
      if (
        // createHash("md5").update(password).digest("hex") == data[0].Password
        password == data[0].mima
      ) {
        const accessToken = jwt.sign(
          {
            accountId: data[0].id,
          },
          secret.jwtSecret,
          { expiresIn }
        );
        await res.json({
          success: true,
          data: {
            message: Message[2],
            username: data[0].name,
            // 这里模拟角色，根据自己需求修改
            roles: ["common"],
            accessToken: accessToken,
            // 这里模拟刷新token，根据自己需求修改
            refreshToken: "eyJhbGciOiJIUzUxMiJ9.adminRefresh",
            expires: new Date(new Date()).getTime() + expiresIn,
          },
        });
      } else {
        await res.json({
          success: false,
          data: data[0].name,
        });
      }
    }
  });
};

// 获取用户列表
const userList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from base_company_user where realname is not null";
  if (form.realname != "") { sql += " and realname = " + "'" + form.realname + "'" }
  if (form.mobile != "") { sql += " and mobile = " + "'" + form.mobile + "'" }
  if (form.zhuangtai != "") { sql += " and zhuangtai = " + "'" + form.zhuangtai + "'" }
  sql +=" limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from base_company_user where realname is not null"
  if (form.realname != "") { sql += " and realname = " + "'" + form.realname + "'" }
  if (form.mobile != "") { sql += " and mobile = " + "'" + form.mobile + "'" }
  if (form.zhuangtai != "") { sql += " and zhuangtai = " + "'" + form.zhuangtai + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增用户
const addUser = async (req: Request, res: Response) => {
  const {
    name,
    realname,
    mobile,
    email,
    department,
    mima,
    shenfenzheng,
    zhuzhi,
    ruzhishijian,
    zhuangtai
  } = req.body;
  const create_time = dayjs(new Date()).format("YYYY-MM-DD");
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into base_company_user (name, realname, mobile, email, department, mima, shenfenzheng, zhuzhi, ruzhishijian, zhuangtai, create_time) values ('${name}', '${realname}', '${mobile}', '${email}', '${department}', '${mima}', '${shenfenzheng}', '${zhuzhi}', '${ruzhishijian}', '${zhuangtai}', '${create_time}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除用户
const deleteUser = async (req: Request, res: Response) => {
  const realname = req.body.realname;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from base_company_user where realname = '${realname}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑用户
const editUser = async (req: Request, res: Response) => {
  const {
    name,
    realname,
    mobile,
    email,
    department,
    mima,
    shenfenzheng,
    zhuzhi,
    ruzhishijian,
    zhuangtai
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE base_company_user SET name = ?, realname = ?, mobile = ?, email = ?, department = ?, mima = ?, shenfenzheng = ?, zhuzhi = ?, ruzhishijian = ?, zhuangtai = ? WHERE name = ?";
  let modifyParams: string[] = [name, realname, mobile, email, department, mima, shenfenzheng, zhuzhi, ruzhishijian, zhuangtai, name];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取打卡点
const clockPointList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from clock_point where id is not null";
  if (form.name != "") { sql += " and name = " + "'" + form.name + "'" }
  sql +=" limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from clock_point where id is not null"
  if (form.name != "") { sql += " and name = " + "'" + form.name + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增打卡点
const addClockPoint = async (req: Request, res: Response) => {
  const {
    name,
    location
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into clock_point (name, location) values ('${name}', '${location}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除打卡点
const deleteClockPoint = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from clock_point where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑用户
const editClockPoint = async (req: Request, res: Response) => {
  const {
    id,
    name,
    location
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE clock_point SET name = ?, location = ? WHERE id = ?";
  let modifyParams: string[] = [name, location, id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取员工打卡信息
const wxClockList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from wx_user_clock where userName is not null";
  if (form.clock_date && form.clock_date.length > 0) { sql += " and clock_date between " + "'" + form.clock_date[0] + "' and '" + form.clock_date[1] + "'" }
  if (form.userName != "") { sql += " and userName = " + "'" + form.userName + "'" }
  if (form.clockin_type != "") { sql += " and clockin_type = " + "'" + form.clockin_type + "'" }
  if (form.clockout_type != "") { sql += " and clockout_type = " + "'" + form.clockout_type + "'" }
  sql +=" order by clockin_time desc limit " + size + " offset " + size * (page - 1);
  sql +=" ;select COUNT(*) from wx_user_clock where userName is not null"
  if (form.clock_date && form.clock_date.length > 0) { sql += " and clock_date between " + "'" + form.clock_date[0] + "' and '" + form.clock_date[1] + "'" }
  if (form.userName != "") { sql += " and userName = " + "'" + form.userName + "'" }
  if (form.clockin_type != "") { sql += " and clockin_type = " + "'" + form.clockin_type + "'" }
  if (form.clockout_type != "") { sql += " and clockout_type = " + "'" + form.clockout_type + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};


// 获取车队客户列表
const motorcadeList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from base_fleet_customer where companyName is not null";
  if (form.companyShortName != "") { sql += " and companyShortName like " + "'%" + form.companyShortName + "%'" }
  if (form.companyAddress != "") { sql += " and companyAddress like " + "'%" + form.companyAddress + "%'" }
  if (form.state != "") { sql += " and state = " + "'" + form.state + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from base_fleet_customer where companyName is not null"
  if (form.companyShortName != "") { sql += " and companyShortName like " + "'%" + form.companyShortName + "%'" }
  if (form.companyAddress != "") { sql += " and companyAddress like " + "'%" + form.companyAddress + "%'" }
  if (form.state != "") { sql += " and state = " + "'" + form.state + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增车队客户
const addMotorcade = async (req: Request, res: Response) => {
  const {
    companyName,
    companyShortName,
    companyAddress,
    companyContact,
    companyPhone1,
    state
  } = req.body;
  const hash_id = getRandomString(20);
  const registerTime = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into base_fleet_customer (old_id, companyName, companyShortName, companyAddress, companyContact, companyPhone1, state, registerTime) values ('${hash_id}', '${companyName}', '${companyShortName}', '${companyAddress}', '${companyContact}', '${companyPhone1}', '${state}', '${registerTime}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除车队客户
const deleteMotorcade = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from base_fleet_customer where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑车队客户
const editMotorcade = async (req: Request, res: Response) => {
  const {
    id,
    companyName,
    companyShortName,
    companyAddress,
    companyContact,
    companyPhone1,
    state
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE base_fleet_customer SET companyName = ?, companyShortName = ?, companyAddress = ?, companyContact = ?, companyPhone1 = ?, state = ? WHERE id = ?";
  let modifyParams: string[] = [companyName, companyShortName, companyAddress, companyContact, companyPhone1, state, id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取船公司列表
const shipCompanyList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from ship_company where id is not null";
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
  if (form.area != "") { sql += " and area like " + "'%" + form.area + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ship_company where id is not null"
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
  if (form.area != "") { sql += " and area like " + "'%" + form.area + "%'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增船公司
const addShipCompany = async (req: Request, res: Response) => {
  const {
    name,
    area,
    o20,
    o40
  } = req.body;
  const add_time = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into ship_company (name, area, o20, o40, add_time) values ('${name}', '${area}', '${o20}', '${o40}', '${add_time}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除船公司
const deleteShipCompany = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from ship_company where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑船公司
const editShipCompany = async (req: Request, res: Response) => {
  const {
    id,
    name,
    area,
    o20,
    o40
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE ship_company SET name = ?, area = ?, o20 = ?, o40 = ? WHERE id = ?";
  let modifyParams: string[] = [name, area, o20, o40, id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取堆场列表
const yardList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from base_fleet_yard where flag = '0'";
  if (form.yard_name != "") { sql += " and yard_name like " + "'%" + form.yard_name + "%'" }
  if (form.contacts_name != "") { sql += " and contacts_name like " + "'%" + form.contacts_name + "%'" }
  if (form.is_dock != "") { sql += " and is_dock = " + "'" + form.is_dock + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from base_fleet_yard where flag = '0'"
  if (form.yard_name != "") { sql += " and yard_name like " + "'%" + form.yard_name + "%'" }
  if (form.contacts_name != "") { sql += " and contacts_name like " + "'%" + form.contacts_name + "%'" }
  if (form.is_dock != "") { sql += " and is_dock = " + "'" + form.is_dock + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增堆场
const addYard = async (req: Request, res: Response) => {
  const {
    is_dock,
    yard_name,
    port_name,
    yard_adress,
    contacts_name,
    mobile,
    remarks,
    longitude,
    latitude,
    base_price_20,
    base_price_40,
    price_rule
  } = req.body;
  const hash_id = getRandomString(20);
  const create_time = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into base_fleet_yard (old_id, is_dock,yard_name,port_name,yard_adress,contacts_name,mobile,remarks,longitude,latitude,base_price_20,base_price_40,price_rule,create_time) values ('${hash_id}', '${is_dock}', '${yard_name}', '${port_name}', '${yard_adress}', '${contacts_name}', '${mobile}', '${remarks}', '${longitude}', '${latitude}', '${base_price_20}', '${base_price_40}','${price_rule}','${create_time}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除堆场
const deleteYard = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from base_fleet_yard where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑堆场
const editYard = async (req: Request, res: Response) => {
  const {
    id,
    is_dock,
    yard_name,
    port_name,
    yard_adress,
    contacts_name,
    mobile,
    remarks,
    longitude,
    latitude,
    base_price_20,
    base_price_40,
    price_rule
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE base_fleet_yard SET is_dock = ?, yard_name = ?, port_name = ?, yard_adress = ?, contacts_name = ?, mobile = ?, remarks = ?, longitude = ?, latitude = ?, base_price_20 = ?, base_price_40 = ?, price_rule = ? WHERE id = ?";
  let modifyParams: string[] = [is_dock, yard_name, port_name, yard_adress, contacts_name, mobile, remarks, longitude, latitude, base_price_20, base_price_40, price_rule, id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取代收费用列表
const feeCollectionList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from tb_fleet_other_price where costName is not null";
  if (form.costName != "") { sql += " and costName like " + "'%" + form.costName + "%'" }
  if (form.accountCompanyType != "") { sql += " and accountCompanyType like " + "'%" + form.accountCompanyType + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from tb_fleet_other_price where costName is not null"
  if (form.costName != "") { sql += " and costName like " + "'%" + form.costName + "%'" }
  if (form.accountCompanyType != "") { sql += " and accountCompanyType like " + "'%" + form.accountCompanyType + "%'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增代收费用
const addFeeCollection = async (req: Request, res: Response) => {
  const {
    shipCompany,
    fleet_customer_id,
    fleetCompanyId,
    project,
    costType,
    isStart,
    costName,
    costCode,
    accountCompanyType,
    price_gp20,
    price_tk20,
    price_gp40,
    price_tk40,
    price_hc40,
    price_ot40,
    price_ot20,
    price_fr40
  } = req.body;
  const hash_id = getRandomString(20);
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into tb_fleet_other_price (old_id,shipCompany,fleet_customer_id,fleetCompanyId,project,costType,isStart,costName,costCode,accountCompanyType,price_gp20,price_tk20,price_gp40,price_tk40,price_hc40,price_ot40,price_ot20,price_fr40) values ('${hash_id}','${shipCompany}','${fleet_customer_id}','${fleetCompanyId}','${project}','${costType}','${isStart}','${costName}','${costCode}','${accountCompanyType}','${price_gp20}','${price_tk20}','${price_gp40}','${price_tk40}','${price_hc40}','${price_ot40}','${price_ot20}','${price_fr40}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除代收费用
const deleteFeeCollection = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from tb_fleet_other_price where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑代收费用
const editFeeCollection = async (req: Request, res: Response) => {
  const {
    id,
    shipCompany,
    fleet_customer_id,
    fleetCompanyId,
    project,
    costType,
    isStart,
    costName,
    costCode,
    accountCompanyType,
    price_gp20,
    price_tk20,
    price_gp40,
    price_tk40,
    price_hc40,
    price_ot40,
    price_ot20,
    price_fr40
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE tb_fleet_other_price SET shipCompany = ?,fleet_customer_id = ?,fleetCompanyId = ?,project = ?,costType = ?,isStart = ?,costName = ?,costCode = ?,accountCompanyType = ?,price_gp20 = ?,price_tk20 = ?,price_gp40 = ?,price_tk40 = ?,price_hc40 = ?,price_ot40 = ?,price_ot20 = ?,price_fr40 = ? WHERE id = ?";
  let modifyParams: string[] = [shipCompany,fleet_customer_id,fleetCompanyId,project,costType,isStart,costName,costCode,accountCompanyType,price_gp20,price_tk20,price_gp40,price_tk40,price_hc40,price_ot40,price_ot20,price_fr40, id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取散货列表
const bulkCargoList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from bulk_cargo where type = " + form.type;
  if (form.load_address != "") { sql += " and load_address like " + "'%" + form.load_address + "%'" }
  if (form.unload_address != "") { sql += " and unload_address like " + "'%" + form.unload_address + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.voyage != "") { sql += " and voyage like " + "'%" + form.voyage + "%'" }
  if (form.ship_company != "") { sql += " and ship_company like " + "'%" + form.ship_company + "%'" }
  if (form.add_time && form.add_time != "") { sql += " and add_time = " + "'" + form.add_time + "'" }
  if (form.container_no != "") { sql += " and container_no = " + "'" + form.container_no + "'" }
  if (form.seal_no != "") { sql += " and seal_no = " + "'" + form.seal_no + "'" }
  if (form.flow_direction != "") { sql += " and flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from bulk_cargo where type = " + form.type;
  if (form.load_address != "") { sql += " and load_address like " + "'%" + form.load_address + "%'" }
  if (form.unload_address != "") { sql += " and unload_address like " + "'%" + form.unload_address + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.voyage != "") { sql += " and voyage like " + "'%" + form.voyage + "%'" }
  if (form.ship_company != "") { sql += " and ship_company like " + "'%" + form.ship_company + "%'" }
  if (form.add_time && form.add_time != "") { sql += " and add_time = " + "'" + form.add_time + "'" }
  if (form.container_no != "") { sql += " and container_no = " + "'" + form.container_no + "'" }
  if (form.seal_no != "") { sql += " and seal_no = " + "'" + form.seal_no + "'" }
  if (form.flow_direction != "") { sql += " and flow_direction = " + "'" + form.flow_direction + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增散货记录
const addBulkCargo = async (req: Request, res: Response) => {
  const {
    id,
    type,
    customer,
    ship_company,
    fleet,
    load_area,
    unload_area,
    load_address,
    unload_address,
    bl_no,
    container_no,
    container_type,
    seal_no,
    start_point,
    flow_direction,
    voyage,
    address,
    car_type,
    car_no,
    driver_mobile,
    booking_fee,
    exchange_fee,
    freight,
    error_fee,
    remarks,
    add_time
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into bulk_cargo (type,customer,ship_company,fleet,load_area,unload_area,load_address,unload_address,bl_no,container_no,container_type,seal_no,start_point,flow_direction,voyage,address,car_type,car_no,driver_mobile,booking_fee,exchange_fee,freight,error_fee,remarks,add_time) values ('${type}','${customer}','${ship_company}','${fleet}','${load_area}','${unload_area}','${load_address}','${unload_address}','${bl_no}','${container_no}','${container_type}','${seal_no}','${start_point}','${flow_direction}','${voyage}','${address}','${car_type}','${car_no}','${driver_mobile}','${booking_fee}','${exchange_fee}','${freight}','${error_fee}','${remarks}','${add_time}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      const select_sql: string = `select * from bulk_cargo where id = '${JSON.parse(JSON.stringify(data)).insertId}';`
      connection.query(select_sql, async function (err, data) {
        await res.json({
          success: true,
          data: { 
            list: data,
          },
        });
      });
    }
  });
};

// 批量导入船运记录
const importShipping = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const add_by = req.body.add_by;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  let values = sheets[0].data;
  values = values.slice(1);
  values.forEach((v) => {
    v[0] = formatDate(v[0], "/");
    v.push("0");
  })
  let sql: string = `insert ignore into bulk_cargo (add_time,customer,ship_company,bl_no,container_no,container_type,seal_no,flow_direction,voyage,address,car_no,remarks,type) values ?`;
  connection.query(sql, [values], function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      const select_sql: string = `select * from bulk_cargo order by id desc limit ${JSON.parse(JSON.stringify(data)).affectedRows};`
      connection.query(select_sql, async function (err, data) {
        await res.json({
          success: true,
          data: { 
            list: data,
          },
        });
      });
    }
  });
};

// 生成太仓水运费
const generateShippingFee = async (req: Request, res: Response) => {
  const { select_item } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_item.forEach((item) => {
    const c = "c" + item.container_type.substring(0,2).toLowerCase();
    const p = "p" + item.container_type.substring(0,2).toLowerCase();
    let select_sql:string = `select order_fee, ${c} as c_fee, ${p} as p_fee from lightering_price where settlement = '${item.ship_company}';`
    select_sql += `select id from container where containner_no = '${item.container_no}' and seal_no = '${item.seal_no}';`;
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        const order_fee = data[0][0].order_fee;
        const p_fee = data[0][0].p_fee;
        const c_fee = data[0][0].c_fee;
        let container_id = null;
        if (data[1].length > 0) {
          container_id = data[1][0].id
        }
        let insert_sql: string = `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应收','换单费','${order_fee}');`;
        insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应付','换单费','${order_fee}');`;
        insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应收','水运费','${c_fee}');`;
        insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应付','水运费','${p_fee}');`;
        connection.query(insert_sql, async function (err, data) {
          if (err) {
            console.log(err);
          } else {
            console.log(data)
          }
        });
      }
    });
  })
  return res.json({
    success: true,
    data: { message: Message[8] },
  });
};

// 删除太仓水运费
const deleteShippingFee = async (req: Request, res: Response) => {
  const {
    container_no,
    bl_no,
    seal_no
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE a from container_fee as a left join container as b on b.id = a.container_id where b.containner_no = '${container_no}' and b.track_no = '${bl_no}' and b.seal_no = '${seal_no}' and a.fee_name in ('换单费','水运费');`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};



// 删除散货记录
const deleteBulkCargo = async (req: Request, res: Response) => {
  const {
    id
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from bulk_cargo where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑散货记录
const editBulkCargo = async (req: Request, res: Response) => {
  const {
    id,
    type,
    customer,
    ship_company,
    fleet,
    load_area,
    unload_area,
    load_address,
    unload_address,
    bl_no,
    container_no,
    container_type,
    seal_no,
    start_point,
    flow_direction,
    voyage,
    address,
    car_type,
    car_no,
    driver_mobile,
    booking_fee,
    exchange_fee,
    freight,
    error_fee,
    remarks,
    add_time
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE bulk_cargo SET type = ?,customer = ?,ship_company = ?,fleet = ?,load_area = ?,unload_area = ?,load_address = ?,unload_address = ?,bl_no = ?,container_no = ?,container_type = ?,seal_no = ?,start_point = ?,flow_direction = ?,voyage = ?,address = ?,car_type = ?,car_no = ?,driver_mobile = ?,booking_fee = ?,exchange_fee = ?,freight = ?,error_fee = ?,remarks = ?,add_time = ? WHERE id = ?";
  let modifyParams: string[] = [type,customer,ship_company,fleet,load_area,unload_area,load_address,unload_address,bl_no,container_no,container_type,seal_no,start_point,flow_direction,voyage,address,car_type,car_no,driver_mobile,booking_fee,exchange_fee,freight,error_fee,remarks,add_time, id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取驳运记录
const lighteringList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select id,type,container_no,seal_no,is_import,cargo_name,voyage,voyage_index,customs_container_type,container_type,container_holder,iso,extra_operation,trade_type,bl_no,load_port,target_port,unload_port,load_payer,unload_payer,total_weight,cargo_weight,volume,amount,cargo_owner,forwarder,remarks,date_format(add_time, '%Y-%m-%d') as add_time,empty_weight,transfer_type from lightering where type = " + form.type;
  if (form.add_time && form.add_time.length > 0) { sql += " and DATE_FORMAT(add_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.add_time[0] + "','%Y%m%d') and DATE_FORMAT('" + form.add_time[1] + "','%Y%m%d')" }
  if (form.voyage != "") { sql += " and voyage like " + "'%" + form.voyage + "%'" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
  if (form.container_no != "") {
    const select_container_no = form.container_no.split(/\r\n|\r|\n/);
    sql += ` and container_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from lightering where type = " + form.type;
  if (form.add_time && form.add_time.length > 0) { sql += " and DATE_FORMAT(add_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.add_time[0] + "','%Y%m%d') and DATE_FORMAT('" + form.add_time[1] + "','%Y%m%d')" }
  if (form.voyage != "") { sql += " and voyage like " + "'%" + form.voyage + "%'" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
  if (form.container_no != "") {
    const select_container_no = form.container_no.split(/\r\n|\r|\n/);
    sql += ` and container_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 获取门点价格列表
const doorPriceList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from door_price where is_pay = " + form.is_pay;
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.project != "") { sql += " and project like " + "'%" + form.project + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.port != "") { sql += " and port like " + "'%" + form.port + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from door_price where is_pay = " + form.is_pay;
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.project != "") { sql += " and project like " + "'%" + form.project + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.port != "") { sql += " and port like " + "'%" + form.port + "%'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增门点价格
const addDoorPrice = async (req: Request, res: Response) => {
  const {
    id,
    is_pay,
    status,
    customer,
    project,
    door,
    port,
    i20gp,
    i40gp,
    i20tk,
    i40hc,
    o20gp,
    o40gp,
    o20tk,
    o40hc,
  } = req.body;
  let payload = null;
  const add_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into door_price (is_pay,status,customer,project,door,port,i20gp,i40gp,i20tk,i40hc,o20gp,o40gp,o20tk,o40hc,add_time) values ('${is_pay}','${status}','${customer}','${project}','${door}','${port}','${i20gp}','${i40gp}','${i20tk}','${i40hc}','${o20gp}','${o40gp}','${o20tk}','${o40hc}','${add_time}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除门点价格
const deleteDoorPrice = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from door_price where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑门点价格
const editDoorPrice = async (req: Request, res: Response) => {
  const {
    id,
    is_pay,
    status,
    customer,
    project,
    door,
    port,
    i20gp,
    i40gp,
    i20tk,
    i40hc,
    o20gp,
    o40gp,
    o20tk,
    o40hc,
    add_time
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE door_price SET status = ?,customer = ?,project = ?,door = ?,port = ?,i20gp = ?,i40gp = ?,i20tk = ?,i40hc = ?,o20gp = ?,o40gp = ?,o20tk = ?,o40hc = ? WHERE id = ?";
  let modifyParams: string[] = [status,customer,project,door,port,i20gp,i40gp,i20tk,i40hc,o20gp,o40gp,o20tk,o40hc,id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

// 获取费用列表
const projectFeeList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select * from project_fee where is_pay = " + form.is_pay;
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from project_fee where is_pay = " + form.is_pay;
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 新增费用
const addProjectFee = async (req: Request, res: Response) => {
  const {
    id,
    is_pay,
    status,
    account_period,
    fee_name,
    amount,
    box_making_time,
    customer_short_name,
    start_port,
    target_port,
    port,
    ship_company,
    voyage,
    seal_no,
    container_no,
    waybill_no,
    container_type,
    document_type,
    door,
    business_name,
    dealing_company,
    car,
    remarks,
    invoice_no,
    fleet,
    bill_no,
    plan_no,
    add_staff,
    fee_type,
    receipt_remark
  } = req.body;
  let payload = null;
  const add_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into project_fee (is_pay,status,account_period,fee_name,amount,box_making_time,customer_short_name,start_port,target_port,port,ship_company,voyage,seal_no,container_no,waybill_no,container_type,document_type,door,business_name,dealing_company,car,remarks,invoice_no,fleet,bill_no,plan_no,add_staff,add_time,fee_type,receipt_remark) values ('${is_pay}','${status}','${account_period}','${fee_name}','${amount}','${box_making_time}','${customer_short_name}','${start_port}','${target_port}','${port}','${ship_company}','${voyage}','${seal_no}','${container_no}','${waybill_no}','${container_type}','${document_type}','${door}','${business_name}','${dealing_company}','${car}','${remarks}','${invoice_no}','${fleet}','${bill_no}','${plan_no}','${add_staff}','${add_time}','${fee_type}','${receipt_remark}')`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[6] },
      });
    }
  });
};

// 删除费用
const deleteProjectFee = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from project_fee where id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};


// 编辑费用
const editProjectFee = async (req: Request, res: Response) => {
  const {
    id,
    is_pay,
    status,
    account_period,
    fee_name,
    amount,
    box_making_time,
    customer_short_name,
    start_port,
    target_port,
    port,
    ship_company,
    voyage,
    seal_no,
    container_no,
    waybill_no,
    container_type,
    document_type,
    door,
    business_name,
    dealing_company,
    car,
    remarks,
    invoice_no,
    fleet,
    bill_no,
    plan_no,
    add_staff,
    fee_type,
    receipt_remark
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE door_price SET status = ?,account_period = ?,fee_name = ?,amount = ?,box_making_time = ?,customer_short_name = ?,start_port = ?,target_port = ?,port = ?,ship_company = ?,voyage = ?,seal_no = ?,container_no = ?,waybill_no = ?,container_type = ?,document_type = ?,door = ?,business_name = ?,dealing_company = ?,car = ?,remarks = ?,invoice_no = ?,fleet = ?,bill_no = ?,plan_no = ?,add_staff = ?,fee_type = ?,receipt_remar = ? WHERE id = ?";
  let modifyParams: string[] = [status,account_period,fee_name,amount,box_making_time,customer_short_name,start_port,target_port,port,ship_company,voyage,seal_no,container_no,waybill_no,container_type,document_type,door,business_name,dealing_company,car,remarks,invoice_no,fleet,bill_no,plan_no,add_staff,fee_type,receipt_remark,id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[7] },
      });
    }
  });
};

/**
 * @typedef UpdateList
 * @property {string} username.required - 用户名 - eg: admin
 */

/**
 * @route PUT /updateList/{id}
 * @summary 列表更新
 * @param {UpdateList.model} point.body.required - 用户名
 * @param {UpdateList.model} id.path.required - 用户id
 * @group 用户管理相关
 * @returns {object} 200
 * @returns {Array.<UpdateList>} UpdateList
 * @security JWT
 */

const updateList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE users SET username = ? WHERE id = ?";
  let sql: string = "select * from users where id=" + id;
  connection.query(sql, function (err, data) {
    connection.query(sql, function (err) {
      if (err) {
        Logger.error(err);
      } else {
        let modifyParams: string[] = [username, id];
        // 改
        connection.query(modifySql, modifyParams, async function (err, result) {
          if (err) {
            Logger.error(err);
          } else {
            await res.json({
              success: true,
              data: { message: Message[7] },
            });
          }
        });
      }
    });
  });
};

/**
 * @typedef DeleteList
 * @property {integer} id.required - 当前id
 */

/**
 * @route DELETE /deleteList/{id}
 * @summary 列表删除
 * @param {DeleteList.model} id.path.required - 用户id
 * @group 用户管理相关
 * @returns {object} 200
 * @returns {Array.<DeleteList>} DeleteList
 * @security JWT
 */

const deleteList = async (req: Request, res: Response) => {
  const { id } = req.params;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "DELETE FROM users where id=" + "'" + id + "'";
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      await res.json({
        success: true,
        data: { message: Message[8] },
      });
    }
  });
};

/**
 * @typedef SearchPage
 * @property {integer} page.required - 第几页 - eg: 1
 * @property {integer} size.required - 数据量（条）- eg: 5
 */

/**
 * @route POST /searchPage
 * @param {SearchPage.model} point.body.required - the new point
 * @produces application/json application/xml
 * @consumes application/json application/xml
 * @summary 分页查询
 * @group 用户管理相关
 * @returns {Response.model} 200
 * @returns {Array.<SearchPage>} SearchPage
 * @headers {integer} 200.X-Rate-Limit
 * @headers {string} 200.X-Expires-After
 * @security JWT
 */

const searchPage = async (req: Request, res: Response) => {
  const { page, size } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string =
    "select * from users limit " + size + " offset " + size * (page - 1);
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data,
      });
    }
  });
};

/**
 * @typedef SearchVague
 * @property {string} username.required - 用户名  - eg: admin
 */

/**
 * @route POST /searchVague
 * @param {SearchVague.model} point.body.required - the new point
 * @produces application/json application/xml
 * @consumes application/json application/xml
 * @summary 模糊查询
 * @group 用户管理相关
 * @returns {Response.model} 200
 * @returns {Array.<SearchVague>} SearchVague
 * @headers {integer} 200.X-Rate-Limit
 * @headers {string} 200.X-Expires-After
 * @security JWT
 */

const searchVague = async (req: Request, res: Response) => {
  const { username } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  if (username === "" || username === null)
    return res.json({
      success: false,
      data: { message: Message[9] },
    });
  let sql: string = "select * from users";
  sql += " WHERE username LIKE " + mysql.escape("%" + username + "%");
  connection.query(sql, function (err, data) {
    connection.query(sql, async function (err) {
      if (err) {
        Logger.error(err);
      } else {
        await res.json({
          success: true,
          data,
        });
      }
    });
  });
};

// express-swagger-generator中没有文件上传文档写法，所以请使用postman调试
const upload = async (req: Request, res: Response) => {
  // 文件存放地址
  const des_file: any = (index: number) =>
    "./public/files/" + req.files[index].originalname;
  let filesLength = req.files.length as number;
  let result = [];

  function asyncUpload() {
    return new Promise((resolve, rejects) => {
      (req.files as Array<any>).forEach((ev, index) => {
        fs.readFile(req.files[index].path, function (err, data) {
          fs.writeFile(des_file(index), data, function (err) {
            if (err) {
              rejects(err);
            } else {
              while (filesLength > 0) {
                result.push({
                  filename: req.files[filesLength - 1].originalname,
                  filepath: utils.getAbsolutePath(des_file(filesLength - 1)),
                });
                filesLength--;
              }
              if (filesLength === 0) resolve(result);
            }
          });
        });
      });
    });
  }

  asyncUpload()
    .then((fileList) => {
      res.json({
        success: true,
        data: {
          message: Message[11],
          fileList,
        },
      });
    })
    .catch(() => {
      res.json({
        success: false,
        data: {
          message: Message[10],
          fileList: [],
        },
      });
    });
};

/**
 * @route GET /captcha
 * @summary 图形验证码
 * @group captcha - 图形验证码
 * @returns {object} 200
 */

const captcha = async (req: Request, res: Response) => {
  const create = createMathExpr({
    mathMin: 1,
    mathMax: 4,
    mathOperator: "+",
  });
  generateVerify = Number(create.text);
  res.type("svg"); // 响应的类型
  res.json({ success: true, data: { text: create.text, svg: create.data } });
};

export {
  login,
  userList,
  addUser,
  deleteUser,
  editUser,
  clockPointList,
  addClockPoint,
  deleteClockPoint,
  editClockPoint,
  wxClockList,
  motorcadeList,
  addMotorcade,
  deleteMotorcade,
  editMotorcade,
  shipCompanyList,
  addShipCompany,
  deleteShipCompany,
  editShipCompany,
  yardList,
  addYard,
  deleteYard,
  editYard,
  feeCollectionList,
  addFeeCollection,
  deleteFeeCollection,
  editFeeCollection,
  bulkCargoList,
  addBulkCargo,
  importShipping,
  generateShippingFee,
  deleteShippingFee,
  deleteBulkCargo,
  editBulkCargo,
  lighteringList,
  doorPriceList,
  addDoorPrice,
  deleteDoorPrice,
  editDoorPrice,
  projectFeeList,
  addProjectFee,
  deleteProjectFee,
  editProjectFee,
  updateList,
  deleteList,
  searchPage,
  searchVague,
  upload,
  captcha,
};
