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

// 获取往来单位列表
const accCompanyList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from acc_company where id is not null ";
  if (form.company_name != "") { sql += " and company_name like " + "'%" + form.company_name + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from acc_company where id is not null ";
  if (form.company_name != "") { sql += " and company_name like " + "'%" + form.company_name + "%'" }
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

// 新增往来单位
const addAccCompany = async (req: Request, res: Response) => {
  const {
    company_code,
    company_name,
    bank,
    account_no,
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
  let sql: string = `insert into acc_company (company_code,company_name,bank,account_no,remark) values ('${company_code}','${company_name}','${bank}','${account_no}','${remark}')`;
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

// 修改往来单位
const editAccCompany = async (req: Request, res: Response) => {
  const {
    id,
    company_code,
    company_name,
    bank,
    account_no,
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
  let modifySql: string = "UPDATE acc_company SET company_code = ?,company_name = ?,bank = ?,account_no = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [company_code,company_name,bank,account_no,remark,id];
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

// 删除往来单位
const deleteAccCompany = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from acc_company where id = '${id}'`;
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

// 获取合同列表
const contractList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from contract where id is not null ";
  if (form.sign_time != "") { sql += " and sign_time = " + "'" + form.sign_time + "'" }
  if (form.end_time != "") { sql += " and end_time = " + "'" + form.end_time + "'" }
  if (form.contract_no != "") { sql += " and contract_no like " + "'%" + form.contract_no + "%'" }
  if (form.total_amount != "") { sql += " and total_amount = " + "'" + form.total_amount + "'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  if (form.status != "") { sql += " and status like " + "'%" + form.status + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from contract where id is not null ";
  if (form.sign_time != "") { sql += " and sign_time = " + "'" + form.sign_time + "'" }
  if (form.end_time != "") { sql += " and end_time = " + "'" + form.end_time + "'" }
  if (form.contract_no != "") { sql += " and contract_no like " + "'%" + form.contract_no + "%'" }
  if (form.total_amount != "") { sql += " and total_amount = " + "'" + form.total_amount + "'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  if (form.status != "") { sql += " and status like " + "'%" + form.status + "%'" }
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

// 新增合同
const addContract = async (req: Request, res: Response) => {
  const {
    contract_no,
    sign_time,
    contract_name,
    type,
    content,
    we_company,
    oppo_company,
    we_agent,
    effective_time,
    end_time,
    total_amount,
    paid_amount,
    counts,
    department,
    status,
    remark
  } = req.body;
  let payload = null;
  const remain_amount = total_amount - paid_amount;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into contract (contract_no,sign_time,contract_name,type,content,we_company,oppo_company,we_agent,effective_time,end_time,total_amount,paid_amount,remain_amount,counts,department,status,remark) values ('${contract_no}','${sign_time}','${contract_name}','${type}','${content}','${we_company}','${oppo_company}','${we_agent}','${effective_time}','${end_time}','${total_amount}','${paid_amount}','${remain_amount}','${counts}','${department}','${status}','${remark}')`;
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

// 修改合同
const editContract = async (req: Request, res: Response) => {
  const {
    id,
    contract_no,
    sign_time,
    contract_name,
    type,
    content,
    we_company,
    oppo_company,
    we_agent,
    effective_time,
    end_time,
    total_amount,
    paid_amount,
    counts,
    department,
    status,
    remark
  } = req.body;
  let payload = null;
  const remain_amount = total_amount - paid_amount;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE contract SET contract_no = ?,sign_time = ?,contract_name = ?,type = ?,content = ?,we_company = ?,oppo_company = ?,we_agent = ?,effective_time = ?,end_time = ?,total_amount = ?,paid_amount = ?,remain_amount = ?,counts = ?,department = ?,status = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [contract_no,sign_time,contract_name,type,content,we_company,oppo_company,we_agent,effective_time,end_time,total_amount,paid_amount,remain_amount,counts,department,status,remark,id];
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

// 删除合同
const deleteContract = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from contract where id = '${id}'`;
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
  accCompanyList,
  addAccCompany,
  editAccCompany,
  deleteAccCompany,
  contractList,
  addContract,
  editContract,
  deleteContract
};
