import * as fs from "fs";
import secret from "../config";
import * as mysql from "mysql2";
import * as jwt from "jsonwebtoken";
import { createHash } from "crypto";
import Logger from "../loaders/logger";
import { Message } from "../utils/enums";
import getFormatDate from "../utils/date";
import { connection } from "../utils/mysql";
import { getRandomString } from "../utils/utils";
import { Request, Response } from "express";
import * as dayjs from "dayjs";
import { readFileSync } from 'fs'

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

// 获取单证记录
const documentCheckList = async (req: Request, res: Response) => {
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
  let sql: string = "select *,count(track_no) as count from container where id is not null ";
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.subproject != "") { sql += " and subproject like " + "'%" + form.subproject + "%'" }
  if (form.order_type != "") { sql += " and order_type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.order_status != "") { sql += " and order_status like " + "'%" + form.order_status + "%'" }
  if (form.order_time != "") { sql += " and order_time = " + "'" + form.order_time + "'" }
  sql +=" group by track_no order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ( select * from container where id is not null ";
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.subproject != "") { sql += " and subproject like " + "'%" + form.subproject + "%'" }
  if (form.order_type != "") { sql += " and order_type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.order_status != "") { sql += " and order_status like " + "'%" + form.order_status + "%'" }
  if (form.order_time != "") { sql += " and order_time = " + "'" + form.order_time + "'" }
  sql +=" group by track_no) as t";
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

// 获取箱子记录
const containerList = async (req: Request, res: Response) => {
  const track_no  = req.body.form.track_no;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select * from container where track_no = '${track_no}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      console.log(2222, data);
      await res.json({
        success: true,
        data: { 
          list: data,
        },
      });
    }
  });
};

// 批量导入单证记录
const importDocumentCheck = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, { cellDates: true });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "insert into container (tmp_excel_no,ship_company,customer,subproject,arrive_time,start_port,target_port,containner_no,seal_no,container_type,ship_name,track_no,unload_port,door) values ?"
  connection.query(sql, [values], async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { 
          list: data[0],
        },
      });
    }
  });
};

// 新增箱子记录
const addContainer = async (req: Request, res: Response) => {
  const {
    ship_company,
    customer,
    subproject,
    arrive_time,
    start_port,
    target_port,
    containner_no,
    seal_no,
    container_type,
    ship_name,
    track_no,
    load_port,
    door,
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into container (ship_company,customer,subproject,arrive_time,start_port,target_port,containner_no,seal_no,container_type,ship_name,track_no,load_port,door) values ('${ship_company}','${customer}','${subproject}','${arrive_time}','${start_port}','${target_port}','${containner_no}','${seal_no}','${container_type}','${ship_name}','${track_no}','${load_port}','${door}')`;
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

// 删除单证记录
const deleteDocumentCheck = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from container where id = '${id}'`;
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


// 编辑单证记录
const editDocumentCheck = async (req: Request, res: Response) => {
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
  let modifySql: string = "UPDATE container SET status = ?,customer = ?,project = ?,door = ?,port = ?,i20gp = ?,i40gp = ?,i20tk = ?,i40hc = ?,o20gp = ?,o40gp = ?,o20tk = ?,o40hc = ? WHERE id = ?";
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

// 提交单证记录
const submitDocumentCheck = async (req: Request, res: Response) => {
  const select_track_no = req.body;
  let payload = null;
  const order_status = "已提交";
  const order_time = dayjs(new Date()).format("YYYY-MM-DD");
  const order_fee = "100";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET order_status = '${order_status}',order_time = '${order_time}',order_fee = '${order_fee}' WHERE track_no in ('${select_track_no.toString().replaceAll(",", "','")}')`;
  connection.query(sql, async function (err, result) {
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

// 获取挑箱列表
const pickBoxList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from container where order_status = '已提交' ";
  if (form.arrive_time != "") { sql += " and arrive_time = " + "'" + form.arrive_time + "'" }
  if (form.ship_name != "") { sql += " and ship_name like " + "'%" + form.ship_name + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.make_time != "") { sql += " and make_time = " + "'" + form.make_time + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where order_status = '已提交' ";
  if (form.arrive_time != "") { sql += " and arrive_time = " + "'" + form.arrive_time + "'" }
  if (form.ship_name != "") { sql += " and ship_name like " + "'%" + form.ship_name + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.make_time != "") { sql += " and make_time = " + "'" + form.make_time + "'" }
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

// 挑箱
const pickBox = async (req: Request, res: Response) => {
  const select_container_no = req.body;
  let payload = null;
  const container_status = "已挑箱";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  connection.query(sql, async function (err, result) {
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

// 暂落
const tempDrop = async (req: Request, res: Response) => {
  const select_container_no = req.body;
  let payload = null;
  const container_status = "已暂落";
  const temp_time = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', temp_time = '${temp_time}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  connection.query(sql, async function (err, result) {
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

// 批量修改提箱点
const loadPort = async (req: Request, res: Response) => {
  const { select_container_no, port } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET load_port = '${port.value}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  connection.query(sql, async function (err, result) {
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

// 批量设置做箱时间
const makeTime = async (req: Request, res: Response) => {
  const { select_container_no, make_time } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET make_time = '${make_time.value}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  connection.query(sql, async function (err, result) {
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


export {
  documentCheckList,
  containerList,
  addContainer,
  importDocumentCheck,
  editDocumentCheck,
  deleteDocumentCheck,
  submitDocumentCheck,
  pickBoxList,
  pickBox,
  tempDrop,
  loadPort,
  makeTime,
};
