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

// 获取统计费用列表
const containerFeeList = async (req: Request, res: Response) => {
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
  let sql: string = `SELECT a.id as fee_id, a.status, a.account_period, a.type, a.amount,a.invoice_no, a.fee_name, a.fee_type, a.custom_name, a.project_name, a.content, a.flow_direction,a.remark, b.* FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null`;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.make_time != "") { sql += " and b.make_time = " + "'" + form.make_time + "'" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.containner_no != "") { sql += " and b.containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.car_no != "") { sql += " and b.car_no like " + "'%" + form.car_no + "%'" }
  if (form.customer != "") { sql += " and b.customer like " + "'%" + form.customer + "%'" }
  sql +=" order by a.id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null`;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.make_time != "") { sql += " and b.make_time = " + "'" + form.make_time + "'" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.containner_no != "") { sql += " and b.containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.car_no != "") { sql += " and b.car_no like " + "'%" + form.car_no + "%'" }
  if (form.customer != "") { sql += " and b.customer like " + "'%" + form.customer + "%'" }
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

// 提交统计费用
const submitContainerFee = async (req: Request, res: Response) => {
  const { select_id, data } = req.body;
  const ids = select_id.length;
  const less_amount = data.less_amount / ids;
  const more_amount = data.more_amount / ids;
  const status = "未审核"
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee SET status = '${status}',account_period = '${data.account_period}',custom_name = '${data.custom_name}',project_name = '${data.project_name}',content = '${data.content}',flow_direction = '${data.flow_direction}',less_amount = '${less_amount}',more_amount = '${more_amount}',remark = '${data.remark}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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
  console.log(111, sql);
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
  let sql: string = `UPDATE container_fee SET remark = '${remark.value}' WHERE id in ('${select_id  .toString().replaceAll(",", "','")}')`;
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

export {
  containerFeeList,
  submitContainerFee,
  setInvoiceNo,
  setAmount,
  setRemark
};
