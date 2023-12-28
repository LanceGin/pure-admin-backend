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

export {
  appliedFeeList,
  addAppliedFee,
  editAppliedFee,
  deleteAppliedFee,
  keepAppliedFee,
  cancelKeepAppliedFee
};
