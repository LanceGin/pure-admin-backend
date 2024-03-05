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
import * as dayjs from "dayjs";
import { readFileSync } from 'fs'

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");


// 批量导入驳运ytoj记录
const importYtoj = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const file_name = req.files[0].originalname;
  const file_split = file_name.split(/[-.]/);
  const add_time = file_split[0];
  const voyage = file_split[1];
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  values.forEach((v) => {
    v.unshift("0", add_time, voyage);
  })
  let sql: string = "insert into lightering (type,add_time,voyage,container_no,bl_no,customs_container_type,iso,container_type,container_holder,is_import,extra_operation,trade_type,seal_no,cargo_name,load_port,target_port,unload_port,load_payer,total_weight,cargo_weight,volume,amount,cargo_owner,forwarder,remarks) values ?"
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

// 批量导入驳运Jtoy记录
const importJtoy = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const file_name = req.files[0].originalname;
  const file_split = file_name.split(/[-.]/);
  const add_time = file_split[0];
  const voyage = file_split[1];
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  values.forEach((v) => {
    v.unshift("1", add_time, voyage);
  })
  console.log(11111, values);
  let sql: string = "insert into lightering (type,add_time,voyage,bl_no,load_port,unload_port,target_port,total_weight,container_no,container_holder,extra_operation,container_type,customs_container_type,iso,is_import,empty_weight,trade_type,seal_no,cargo_name,unload_payer,transfer_type) values ?"
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

// 获取驳运统计记录
const lighteringStatList = async (req: Request, res: Response) => {
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
  let sql: string = "select date_format(add_time, '%Y-%m-%d') as add_time, voyage, cargo_name, COUNT(IF(left(container_type, 2) = '40',true,null)) as f, COUNT(IF(left(container_type, 2) = '20',true,null)) as t from lightering where type = " + form.type;
  if (form.add_time.length > 0) { sql += " and add_time between " + "'" + form.add_time[0] + "' and '" + form.add_time[1] + "'" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
  sql +=" group by add_time, voyage, cargo_name order by add_time asc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from lightering where type = " + form.type;
  if (form.add_time.length > 0) { sql += " and add_time between " + "'" + form.add_time[0] + "' and '" + form.add_time[1] + "'" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
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

// 获取箱子以及费用记录
const containerWithFeeList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from container where id is not null ";
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  if (form.temp_status != "") { sql += " and temp_status like " + "'%" + form.temp_status + "%'" }
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.order_type != "") { sql += " and order_type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.seal_no != "") { sql += " and seal_no like " + "'%" + form.seal_no + "%'" }
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and make_time between " + "'" + form.make_time_range[0] + "' and '" + form.make_time_range[1] + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ( select * from container where id is not null ";
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  if (form.temp_status != "") { sql += " and temp_status like " + "'%" + form.temp_status + "%'" }
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.order_type != "") { sql += " and order_type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.seal_no != "") { sql += " and seal_no like " + "'%" + form.seal_no + "%'" }
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and make_time between " + "'" + form.make_time_range[0] + "' and '" + form.make_time_range[1] + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  sql +=" ) as t";
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

// 获取箱子费用记录
const getContainerFeeList = async (req: Request, res: Response) => {
  const container_id  = req.body.form.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select * from container_fee where container_id = '${container_id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { 
          list: data,
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
  const add_by = req.body.add_by;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  values.forEach((v) => {
    v[4] = formatDate(v[4], "/");
    v.push(add_by);
  })
  let sql: string = "insert into container (tmp_excel_no,ship_company,customer,subproject,arrive_time,start_port,target_port,containner_no,seal_no,container_type,ship_name,track_no,load_port,unload_port,door,add_by) values ?"
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

// 批量导入出口箱子记录
const importExportContainer = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const add_by = req.body.add_by;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  let values = sheets[0].data;
  values = values.slice(1);
  values.forEach((v) => {
    v.push("已提交", "出口", "已完成");
    v[4] = formatDate(v[4], "/");
    v.push(add_by);
  })
  const limit_length = values.length;
  let sql: string = `insert into container (tmp_excel_no,ship_company,customer,subproject,make_time,load_port,ship_name,track_no,containner_no,container_type,seal_no,door,unload_port,car_no,start_port,target_port,transfer_port,package_count,gross_weight,volume,container_weight,order_status,order_type,container_status,add_by) values ?`;
  let select_sql: string = `select * from container order by id desc limit ${limit_length};`
  connection.query(sql, [values], function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
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

// 新增箱子费用
const addContainerFee = async (req: Request, res: Response) => {
  const {
    id,
    fee_name,
    amount,
    add_by
  } = req.body;
  let payload = null;
  const type = "应付"
  const status = "已审核";
  const add_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into container_fee (container_id,type,status,fee_name,amount) values ('${id}','${type}','${status}','${fee_name}','${amount}');select LAST_INSERT_ID() as last_id;`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      const is_admin = "业务";
      const is_pay = "付";
      const from = "运作";
      const from_id = data[1][0].last_id;
      let apply_fee_sql: string = `insert into applied_fee (is_admin,fee_name,is_pay,apply_amount,apply_by,create_time,from_tb,from_id) values ('${is_admin}','${fee_name}','${is_pay}','${amount}','${add_by}','${add_time}','${from}','${from_id}')`;
      connection.query(apply_fee_sql, async function (err, data) {
        if (err) {
          console.log(err);
        } else {
          await res.json({
            success: true,
            data: { message: Message[6] },
          });
        }
      });
    }
  });
};

// 删除单证记录
const deleteDocumentCheck = async (req: Request, res: Response) => {
  const select_track_no = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from container where track_no in ('${select_track_no.toString().replaceAll(",", "','")}')`;
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
  if (form.temp_status == "已暂落") { sql += " and temp_status = " + "'" + form.temp_status + "'" }
  if (form.temp_status == "未暂落") { sql += " and temp_status is null" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where order_status = '已提交' ";
  if (form.arrive_time != "") { sql += " and arrive_time = " + "'" + form.arrive_time + "'" }
  if (form.ship_name != "") { sql += " and ship_name like " + "'%" + form.ship_name + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  if (form.temp_status == "已暂落") { sql += " and temp_status = " + "'" + form.temp_status + "'" }
  if (form.temp_status == "未暂落") { sql += " and temp_status is null" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
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
  const { select_container_no, actual_amount } = req.body;
  let payload = null;
  const container_status = "已挑箱";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', actual_amount_temp = '${actual_amount.value}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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
  const { select_container_no, temp_port } = req.body;
  let payload = null;
  const container_status = "已挑箱";
  const temp_status = "已暂落"
  const temp_time = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', temp_status = '${temp_status}', temp_time = '${temp_time}', temp_port = '${temp_port.value}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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

// 批量设置箱子信息
const settingContainer = async (req: Request, res: Response) => {
  const {
    select_container_no,
    load_port,
    remark
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET load_port = '${load_port}', remark = '${remark}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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

// 获取堆场价格列表
const yardPriceList = async (req: Request, res: Response) => {
  const { id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select * from yard_price where yard_id = '${id}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { 
          list: data,
        },
      });
    }
  });
};

// 新增堆场价格
const addYardPrice = async (req: Request, res: Response) => {
  const {
    yard_id,
    yard_price
  } = req.body;
  const price = yard_price.split('/');
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into yard_price (yard_id,day_min,day_max,price_20,price_40) values ('${yard_id}','${price[0]}','${price[1]}','${price[2]}','${price[3]}')`;
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

// 修改堆场价格
const editYardPrice = async (req: Request, res: Response) => {
  const {
    id,
    yard_price
  } = req.body;
  const price = yard_price.split('/');
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE yard_price SET day_min = ?,day_max = ?,price_20 = ?,price_40 = ? WHERE id = ?";
  let modifyParams: string[] = [price[0],price[1],price[2],price[3],id];
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

// 删除堆场价格
const deleteYardPrice = async (req: Request, res: Response) => {
  const { id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from yard_price where id = '${id}'`;
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


export {
  importYtoj,
  importJtoy,
  lighteringStatList,
  documentCheckList,
  containerWithFeeList,
  containerList,
  getContainerFeeList,
  addContainer,
  addContainerFee,
  importDocumentCheck,
  importExportContainer,
  editDocumentCheck,
  deleteDocumentCheck,
  submitDocumentCheck,
  pickBoxList,
  pickBox,
  tempDrop,
  loadPort,
  makeTime,
  settingContainer,
  yardPriceList,
  addYardPrice,
  editYardPrice,
  deleteYardPrice
};
