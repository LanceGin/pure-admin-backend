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

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

// 获取统计费用列表
const containerFeeList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let total_amount = 0;
  let pageSize = 0;
  let currentPage = 0;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `SELECT a.id as fee_id, a.status, a.account_period, a.dispatch_type, a.type, a.amount,a.invoice_no, a.fee_name, a.fee_type, a.custom_name, a.project_name, a.content, a.flow_direction,a.remark as fee_remark, b.*, c.owner as car_owner, d.car_no as temp_car_no FROM container_fee as a left join container as b on a.container_id = b.id left join vehicle_info as c on c.car_no = b.car_no left join dispatch as d on d.container_id = a.container_id and d.type = '暂落' where a.id is not null and a.amount != '0' `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.order_type != "") { sql += " and b.order_type like " + "'%" + form.order_type + "%'" }
  if (form.fee_name != "") { sql += " and a.fee_name = " + "'" + form.fee_name + "'" }
  if (form.status != "") { sql += " and a.status like " + "'%" + form.status + "%'" }
  // if (form.make_time != "") { sql += " and b.make_time = " + "'" + form.make_time + "'" }
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and date_format(make_time, '%Y-%m-%d') between " + "'" + form.make_time_range[0] + "' and '" + form.make_time_range[1] + "'" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    if (select_container_no.length > 1) {
      sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`
    } else {
      sql += " and b.containner_no like " + "'%" + form.containner_no + "%'"
    }
  }
  if (form.load_port != "") { sql += " and b.load_port like " + "'%" + form.load_port + "%'" }
  if (form.temp_port != "") { sql += " and b.temp_port like " + "'%" + form.temp_port + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.car_no != "") { sql += " and b.car_no like " + "'%" + form.car_no + "%'" }
  if (form.customer != "") { sql += " and b.customer like " + "'%" + form.customer + "%'" }
  if (form.custom_name != "") { sql += " and b.custom_name like " + "'%" + form.custom_name + "%'" }
  if (form.remark != "") { sql += " and b.remark like " + "'%" + form.remark + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += " and b.city = " + "'" + form.city + "'" }
  sql +=" order by a.id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*), sum(a.amount) as total_amount FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null and a.amount != '0' `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.order_type != "") { sql += " and b.order_type like " + "'%" + form.order_type + "%'" }
  if (form.fee_name != "") { sql += " and a.fee_name = " + "'" + form.fee_name + "'" }
  if (form.status != "") { sql += " and a.status like " + "'%" + form.status + "%'" }
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and date_format(make_time, '%Y-%m-%d') between " + "'" + form.make_time_range[0] + "' and '" + form.make_time_range[1] + "'" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    if (select_container_no.length > 1) {
      sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`
    } else {
      sql += " and b.containner_no like " + "'%" + form.containner_no + "%'"
    }
  }
  if (form.load_port != "") { sql += " and b.load_port like " + "'%" + form.load_port + "%'" }
  if (form.temp_port != "") { sql += " and b.temp_port like " + "'%" + form.temp_port + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.car_no != "") { sql += " and b.car_no like " + "'%" + form.car_no + "%'" }
  if (form.customer != "") { sql += " and b.customer like " + "'%" + form.customer + "%'" }
  if (form.custom_name != "") { sql += " and b.custom_name like " + "'%" + form.custom_name + "%'" }
  if (form.remark != "") { sql += " and b.remark like " + "'%" + form.remark + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += " and b.city = " + "'" + form.city + "'" }
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      total_amount = data[1][0]['total_amount'];
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total_amount: total_amount,
          total: total,
          pageSize: size,
          currentPage: page,
        },
      });
    }
  });
};

// 提交统计费用
const submitContainerFee = async (req: Request, res: Response) => {
  const { select_id, data } = req.body;
  const ids = select_id.length;
  const less_amount = data.less_amount / ids;
  const more_amount = data.more_amount / ids;
  const status = "未审核"
  const account_period = dayjs(data.account_period).format("YYYY-MM-DD");
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee SET status = '${status}',account_period = '${account_period}',custom_name = '${data.custom_name}',project_name = '${data.project_name}',content = '${data.content}',flow_direction = '${data.flow_direction}',acc_company = '${data.acc_company}',less_amount = '${less_amount}',more_amount = '${more_amount}',remark = '${data.remark}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 设置发票号
const setInvoiceNo = async (req: Request, res: Response) => {
  const { select_id, invoice_no } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee SET invoice_no = '${invoice_no.value}' WHERE id in ('${select_id  .toString().replaceAll(",", "','")}')`;
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

// 设置金额
const setAmount = async (req: Request, res: Response) => {
  const { select_id, amount } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee SET amount = '${amount.value}' WHERE id in ('${select_id  .toString().replaceAll(",", "','")}')`;
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

// 设置备注
const setRemark = async (req: Request, res: Response) => {
  const { select_id, remark } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee as a left join container as b on b.id = a.container_id SET b.remark = '${remark.value}' WHERE a.id in ('${select_id  .toString().replaceAll(",", "','")}')`;
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

// 删除费用申请
const deleteAppliedFee = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from applied_fee where id = '${id}'`;
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


// 费用申请记账
const keepAppliedFee = async (req: Request, res: Response) => {
  const { select_id, username } = req.body;
  let payload = null;
  const status = "已记账";
  const keep_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE applied_fee SET status = '${status}',keep_time = '${keep_time}',keep_by = '${username}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 撤销费用申请记账
const cancelKeepAppliedFee = async (req: Request, res: Response) => {
  const select_id = req.body;
  let payload = null;
  const status = "通过审批";
  const keep_time = "";
  const username = "";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE applied_fee SET status = '${status}',keep_time = '${keep_time}',keep_by = '${username}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 批量导入门点价格列表
const importDoorPrice = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const is_pay = req.body.is_pay;
  const city = req.body.city;
  const status = "1";
  const add_time = dayjs(new Date()).format("YYYY-MM-DD");
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  values.forEach((v) => {
    v.push(is_pay, status, city, add_time);
  })
  let sql: string = "insert into door_price (customer,project,door,port,i20gp,i40gp,i20tk,i40hc,o20gp,o40gp,o20tk,o40hc,is_pay,status,city,add_time) values ?"
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

// 应收数据比对
const dataCheckCollection = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  let sql: string = "";
  values.shift();
  values.forEach((v) => {
    sql += `SELECT a.id as fee_id, a.status, a.account_period, a.type, a.amount,a.invoice_no, a.fee_name, a.fee_type, a.custom_name, a.project_name, a.content, a.flow_direction,a.remark, b.*, c.owner as car_owner FROM container_fee as a left join container as b on a.container_id = b.id left join vehicle_info as c on c.car_no = b.car_no where b.seal_no = '${v[0]}' and b.containner_no = '${v[1]}' `;
    if (v[2] != "") {
      sql += ` and b.track_no = '${v[2]}'`;
    }
    sql += ` and b.container_type = '${v[3]}' and b.door = '${v[4]}';`
  })
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

// 应付数据比对
const dataCheckPay = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  let sql: string = "";
  values.shift();
  values.forEach((v) => {
    sql += `SELECT a.id as fee_id, a.status, a.account_period, a.type, a.amount,a.invoice_no, a.fee_name, a.fee_type, a.custom_name, a.project_name, a.content, a.flow_direction,a.remark, b.*, c.owner as car_owner FROM container_fee as a left join container as b on a.container_id = b.id left join vehicle_info as c on c.car_no = b.car_no where b.containner_no = '${v[0]}' `;
    if (v[1] != "") {
      sql += ` and b.track_no = '${v[1]}'`;
    }
    sql += ` and b.container_type = '${v[2]}' and b.door = '${v[3]}';`
  })
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

// 获取车辆费用统计列表
const vehicleFeeStatList = async (req: Request, res: Response) => {
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
  let sql: string = "select a.allocation_amount, a.account_period, b.* from vehicle_fee_stat as a left join vehicle_fee as b on b.id = a.vehicle_fee_id where a.id is not null ";
  if (form.account_period && form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.car_fees != "") { sql += " and b.car_fees = " + "'" + form.car_fees + "'" }
  if (form.company != "") { sql += " and b.company like " + "'%" + form.company + "%'" }
  if (form.car_no != "") { sql += " and b.car_no like " + "'%" + form.car_no + "%'" }
  if (form.hang_board_no != "") { sql += " and b.hang_board_no like " + "'%" + form.hang_board_no + "%'" }
  if (form.content != "") { sql += " and b.content like " + "'%" + form.content + "%'" }
  sql +=" order by a.account_period desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_fee_stat as a left join vehicle_fee as b on b.id = a.vehicle_fee_id where a.id is not null ";
  if (form.account_period && form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.car_fees != "") { sql += " and b.car_fees = " + "'" + form.car_fees + "'" }
  if (form.company != "") { sql += " and b.company like " + "'%" + form.company + "%'" }
  if (form.car_no != "") { sql += " and b.car_no like " + "'%" + form.car_no + "%'" }
  if (form.hang_board_no != "") { sql += " and b.hang_board_no like " + "'%" + form.hang_board_no + "%'" }
  if (form.content != "") { sql += " and b.content like " + "'%" + form.content + "%'" }
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

// 获取驳运价格列表
const lighteringPriceList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from lightering_price where id is not null ";
  if (form.settlement != "") { sql += " and settlement like " + "'%" + form.settlement + "%'" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from lightering_price where id is not null ";
  if (form.settlement != "") { sql += " and settlement like " + "'%" + form.settlement + "%'" }
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

// 新增驳运价格
const addLighteringPrice = async (req: Request, res: Response) => {
  const {
    settlement,
    cargo_name,
    order_fee,
    p40,
    p20,
    c40,
    c20
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into lightering_price (settlement,cargo_name,order_fee,p40,p20,c40,c20) values ('${settlement}','${cargo_name}','${order_fee}','${p40}','${p20}','${c40}','${c20}')`;
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

// 删除驳运价格
const deleteLighteringPrice = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from lightering_price where id = '${id}'`;
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


// 编辑驳运价格
const editLighteringPrice = async (req: Request, res: Response) => {
  const {
    id,
    settlement,
    cargo_name,
    order_fee,
    p40,
    p20,
    c40,
    c20
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE lightering_price SET settlement = ?,cargo_name = ?,order_fee = ?,p40 = ?,p20 = ?,c40 = ?,c20 = ? WHERE id = ?";
  let modifyParams: string[] = [settlement,cargo_name,order_fee,p40,p20,c40,c20,id];
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


export {
  containerFeeList,
  submitContainerFee,
  setInvoiceNo,
  setAmount,
  setRemark,
  importDoorPrice,
  dataCheckCollection,
  dataCheckPay,
  vehicleFeeStatList,
  lighteringPriceList,
  addLighteringPrice,
  deleteLighteringPrice,
  editLighteringPrice
}
