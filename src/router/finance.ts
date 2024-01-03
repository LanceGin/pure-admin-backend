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

// 获取费用申请列表
const appliedFeeList = async (req: Request, res: Response) => {
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
  let sql: string = `select * from applied_fee where id is not null`;
  if (form.apply_by != "") { sql += " and apply_by = " + "'" + form.apply_by + "'" }
  if (form.apply_time != "") { sql += " and apply_time = " + "'" + form.apply_time + "'" }
  if (form.fee_no != "") { sql += " and fee_no like " + "'%" + form.fee_no + "%'" }
  if (form.fee_name != "") { sql += " and fee_name like " + "'%" + form.fee_name + "%'" }
  if (form.is_pay != "") { sql += " and is_pay like " + "'%" + form.is_pay + "%'" }
  if (form.pay_type != "") { sql += " and pay_type like " + "'%" + form.pay_type + "%'" }
  if (form.status != "") { sql += " and status like " + "'%" + form.status + "%'" }
  if (form.keep_time != "") { sql += " and keep_time = " + "'" + form.keep_time + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) from applied_fee where id is not null`;
  if (form.apply_by != "") { sql += " and apply_by = " + "'" + form.apply_by + "'" }
  if (form.apply_time != "") { sql += " and apply_time = " + "'" + form.apply_time + "'" }
  if (form.fee_no != "") { sql += " and fee_no like " + "'%" + form.fee_no + "%'" }
  if (form.fee_name != "") { sql += " and fee_name like " + "'%" + form.fee_name + "%'" }
  if (form.is_pay != "") { sql += " and is_pay like " + "'%" + form.is_pay + "%'" }
  if (form.pay_type != "") { sql += " and pay_type like " + "'%" + form.pay_type + "%'" }
  if (form.status != "") { sql += " and status like " + "'%" + form.status + "%'" }
  if (form.keep_time != "") { sql += " and keep_time = " + "'" + form.keep_time + "'" }
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

// 新增费用申请
const addAppliedFee = async (req: Request, res: Response) => {
  const {
    is_admin,
    fee_name,
    is_pay,
    pay_type,
    apply_amount,
    reimburse_amount,
    tax_amount,
    apply_by,
    apply_department,
  } = req.body;
  let payload = null;
  const create_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into applied_fee (is_admin,fee_name,is_pay,pay_type,apply_amount,reimburse_amount,tax_amount,apply_by,apply_department,create_time) values ('${is_admin}','${fee_name}','${is_pay}','${pay_type}','${apply_amount}','${reimburse_amount}','${tax_amount}','${apply_by}','${apply_department}','${create_time}')`;
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

// 修改费用申请
const editAppliedFee = async (req: Request, res: Response) => {
  const {
    id,
    is_admin,
    fee_name,
    is_pay,
    pay_type,
    apply_amount,
    reimburse_amount,
    tax_amount,
    apply_by,
    apply_department,
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE applied_fee SET is_admin = ?,fee_name = ?,is_pay = ?,pay_type = ?,apply_amount = ?,reimburse_amount = ?,tax_amount = ?,apply_by = ?,apply_department = ? WHERE id = ?";
  let modifyParams: string[] = [is_admin,fee_name,is_pay,pay_type,apply_amount,reimburse_amount,tax_amount,apply_by,apply_department,id];
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

// 生成打单费
const generateOrderFee = async (req: Request, res: Response) => {
  const select_track_no = req.body;
  const type = "应付";
  const fee_name = "打单费";
  const amount = 100;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "insert into container_fee (container_id, type, fee_name, amount) "
  sql += ` select id as container_id,"${type}" as type,"${fee_name}" as fee_name,"${amount}" as amount from container where track_no in ('${select_track_no.toString().replaceAll(",", "','")}')`;
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

// 生成码头计划费
const generatePlanningFee = async (req: Request, res: Response) => {
  const {
    type,
    track_no
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  console.log(2222, "generate planning_fee");
};

// 生成堆存费
const generateStorageFee = async (req: Request, res: Response) => {
  const {
    type,
    track_no
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  console.log(3333, "generate storage_fee");
};

// 生成拖车费
const generateDispatchFee = async (req: Request, res: Response) => {
  const {
    type,
    track_no
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  console.log(4444, "generate dispatch_fee");
};

// 生成异常费
const generateAbnormalFee = async (req: Request, res: Response) => {
  const {
    type,
    track_no
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  console.log(55555, "generate abnormal_fee");
};

// 获取费用审核列表
const financeCheckList = async (req: Request, res: Response) => {
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
  let sql: string = `SELECT a.id,a.type,a.status,a.account_period,a.custom_name,a.project_name,a.flow_direction,a.content,b.container_type,sum(a.amount) as amount,count(b.id) as total, COUNT(IF(left(b.container_type, 2) = '40',true,null)) as f, COUNT(IF(left(b.container_type, 2) = '20',true,null)) as t FROM container_fee as a left join container as b on a.container_id = b.id where a.status = "未审核" `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.account_period, a.custom_name,a.project_name,a.flow_direction,a.content,b.container_type order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) FROM container_fee as a left join container as b on a.container_id = b.id where a.status = "未审核" `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.account_period, a.custom_name,a.project_name,a.flow_direction,a.content,b.container_type";
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

export {
  appliedFeeList,
  addAppliedFee,
  editAppliedFee,
  deleteAppliedFee,
  keepAppliedFee,
  cancelKeepAppliedFee,
  generateOrderFee,
  generatePlanningFee,
  generateStorageFee,
  generateDispatchFee,
  generateAbnormalFee,
  financeCheckList
};
