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

// 获取操作记录列表
const operationLogList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from operation_log where id is not null ";
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
  if (form.operation != "") { sql += " and operation like " + "'%" + form.operation + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from operation_log where id is not null ";
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
  if (form.operation != "") { sql += " and operation like " + "'%" + form.operation + "%'" }
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
    company_name,
    bank,
    account_no,
    remark
  } = req.body;
  const company_code = `ACMP${new Date().getTime()}`;
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
  let modifySql: string = "UPDATE acc_company SET company_name = ?,bank = ?,account_no = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [company_name,bank,account_no,remark,id];
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

// 获取工作报告列表
const reportList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from report where id is not null ";
  if (form.add_by != "") { sql += " and add_by = " + "'" + form.add_by + "'" }
  if (form.title != "") { sql += " and title like " + "'%" + form.title + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from report where id is not null ";
  if (form.add_by != "") { sql += " and add_by = " + "'" + form.add_by + "'" }
  if (form.title != "") { sql += " and title like " + "'%" + form.title + "%'" }
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

// 新增工作报告
const addReport = async (req: Request, res: Response) => {
  const {
    type,
    title,
    content,
    add_by
  } = req.body;
  const add_time = dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss");
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into report (type,title,content,add_by,add_time) values ('${type}','${title}','${content}','${add_by}','${add_time}')`;
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

// 修改工作报告
const editReport = async (req: Request, res: Response) => {
  const {
    id,
    type,
    title,
    content
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE report SET type = ?,title = ?,content = ? WHERE id = ?";
  let modifyParams: string[] = [type,title,content,id];
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

// 提交工作报告
const submitReport = async (req: Request, res: Response) => {
  const {
    id
  } = req.body;
  const status = "已提交"
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE report SET status = ? WHERE id = ?";
  let modifyParams: string[] = [status,id];
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

// 删除工作报告
const deleteReport = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from report where id = '${id}'`;
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
  if (form.we_company != "") { sql += " and we_company like " + "'%" + form.we_company + "%'" }
  if (form.oppo_company != "") { sql += " and oppo_company like " + "'%" + form.oppo_company + "%'" }
  if (form.add_by != "" && form.city != "管理员") { sql += " and we_agent = " + "'" + form.add_by + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from contract where id is not null ";
  if (form.sign_time != "") { sql += " and sign_time = " + "'" + form.sign_time + "'" }
  if (form.end_time != "") { sql += " and end_time = " + "'" + form.end_time + "'" }
  if (form.contract_no != "") { sql += " and contract_no like " + "'%" + form.contract_no + "%'" }
  if (form.total_amount != "") { sql += " and total_amount = " + "'" + form.total_amount + "'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  if (form.status != "") { sql += " and status like " + "'%" + form.status + "%'" }
  if (form.we_company != "") { sql += " and we_company like " + "'%" + form.we_company + "%'" }
  if (form.oppo_company != "") { sql += " and oppo_company like " + "'%" + form.oppo_company + "%'" }
  if (form.add_by != "" && form.city != "管理员") { sql += " and we_agent = " + "'" + form.add_by + "'" }
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

// 获取费用申请列表
const appliedFeeList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const admin_list = ["陈雯", "富安", "杜艳玲", "陆晓菁"];
  const city_list = ["李珍","李巧英","唐羽","刘洋","钱波","周佳","胡雪梅","太仓胡雪梅","田雨鑫"];
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
  let sql: string = `select a.id,a.status,a.is_admin,a.fee_name,a.is_pay,a.pay_type,format(a.apply_amount,2) as apply_amount,format(a.reimburse_amount,2) as reimburse_amount,format(a.tax_amount,2) as tax_amount,a.acc_company_id,a.apply_by,a.apply_department,a.create_time,a.reimburse_by,a.audit_by,a.audit_time,a.approve_by,a.fee_no,a.invoice_no,a.remark,a.apply_time,a.keep_by,a.keep_time,a.from_tb,a.from_id,a.reciept_url,b.company_name,b.bank,b.account_no from applied_fee as a left join acc_company as b on a.acc_company_id = b.id left join base_company_user as c on c.name = a.apply_by where a.id is not null`;
  if (form.apply_by != "" && !admin_list.includes(form.apply_by) && !city_list.includes(form.apply_by)) { sql += " and a.apply_by = " + "'" + form.apply_by + "'" }
  if (form.apply_by != "" && city_list.includes(form.apply_by)) { sql += ` and left(c.city, 2) in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  if (form.apply_by_select != "") { sql += " and a.apply_by like " + "'%" + form.apply_by_select + "%'" }
  if (form.apply_time_range && form.apply_time_range.length > 0) { sql += " and DATE_FORMAT(a.apply_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.apply_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.apply_time_range[1] + "','%Y%m%d')" }
  if (form.keep_time_range && form.keep_time_range.length > 0) { sql += " and DATE_FORMAT(a.keep_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.keep_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.keep_time_range[1] + "','%Y%m%d')" }
  if (form.fee_no != "") { sql += " and a.fee_no like " + "'%" + form.fee_no + "%'" }
  if (form.fee_name != "") { sql += " and a.fee_name like " + "'%" + form.fee_name + "%'" }
  if (form.apply_department != "") { sql += " and a.apply_department like " + "'%" + form.apply_department + "%'" }
  if (form.company_name != "") { sql += " and b.company_name like " + "'%" + form.company_name + "%'" }
  if (form.is_pay != "") { sql += " and a.is_pay like " + "'%" + form.is_pay + "%'" }
  if (form.pay_type != "") { sql += " and a.pay_type like " + "'%" + form.pay_type + "%'" }
  if (form.status != "") { sql += " and a.status like " + "'%" + form.status + "%'" }
  if (form.remark != "") { sql += " and a.remark like " + "'%" + form.remark + "%'" }
  if (form.reciept_url == "已上传" || form.reciept_url == "") { sql += " and a.reciept_url like " + "'%" + form.reciept_url + "%'" }
  if (form.reciept_url == "未上传") { sql += " and a.reciept_url = ''" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) from applied_fee as a left join acc_company as b on a.acc_company_id = b.id left join base_company_user as c on c.name = a.apply_by where a.id is not null`;
  if (form.apply_by != "" && !admin_list.includes(form.apply_by) && !city_list.includes(form.apply_by)) { sql += " and a.apply_by = " + "'" + form.apply_by + "'" }
  if (form.apply_by != "" && city_list.includes(form.apply_by)) { sql += ` and left(c.city, 2) in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  if (form.apply_by_select != "") { sql += " and a.apply_by like " + "'%" + form.apply_by_select + "%'" }
  if (form.apply_time_range && form.apply_time_range.length > 0) { sql += " and DATE_FORMAT(a.apply_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.apply_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.apply_time_range[1] + "','%Y%m%d')" }
  if (form.keep_time_range && form.keep_time_range.length > 0) { sql += " and DATE_FORMAT(a.keep_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.keep_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.keep_time_range[1] + "','%Y%m%d')" }
  if (form.fee_no != "") { sql += " and a.fee_no like " + "'%" + form.fee_no + "%'" }
  if (form.fee_name != "") { sql += " and a.fee_name like " + "'%" + form.fee_name + "%'" }
  if (form.apply_department != "") { sql += " and a.apply_department like " + "'%" + form.apply_department + "%'" }
  if (form.company_name != "") { sql += " and b.company_name like " + "'%" + form.company_name + "%'" }
  if (form.is_pay != "") { sql += " and a.is_pay like " + "'%" + form.is_pay + "%'" }
  if (form.pay_type != "") { sql += " and a.pay_type like " + "'%" + form.pay_type + "%'" }
  if (form.status != "") { sql += " and a.status like " + "'%" + form.status + "%'" }
  if (form.remark != "") { sql += " and a.remark like " + "'%" + form.remark + "%'" }
  if (form.reciept_url == "已上传" || form.reciept_url == "") { sql += " and a.reciept_url like " + "'%" + form.reciept_url + "%'" }
  if (form.reciept_url == "未上传") { sql += " and a.reciept_url = ''" }
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
  let {
    is_admin,
    fee_name,
    is_pay,
    pay_type,
    apply_amount,
    reimburse_amount,
    reimburse_by,
    tax_amount,
    acc_company_id,
    apply_by,
    apply_department,
    remark,
    invoice_no
  } = req.body;
  apply_amount = Number(apply_amount.replace(/,/g, ''))
  reimburse_amount = Number(reimburse_amount.replace(/,/g, ''))
  tax_amount = Number(tax_amount.replace(/,/g, ''))
  let payload = null;
  const create_time = dayjs(new Date()).format("YYYY-MM-DD");
  const fee_no = "FAO" + dayjs(new Date()).format("YYYYMMDD") + Math.floor(Math.random()*10000);
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into applied_fee (is_admin,fee_name,is_pay,pay_type,apply_amount,reimburse_amount,reimburse_by,tax_amount,acc_company_id,apply_by,apply_department,remark,create_time,fee_no,invoice_no) values ('${is_admin}','${fee_name}','${is_pay}','${pay_type}','${apply_amount}','${reimburse_amount}','${reimburse_by}','${tax_amount}','${acc_company_id}','${apply_by}','${apply_department}','${remark}','${create_time}','${fee_no}','${invoice_no}')`;
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
    reimburse_by,
    tax_amount,
    acc_company_id,
    apply_by,
    apply_department,
    remark,
    invoice_no
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = `UPDATE applied_fee SET is_admin=?,fee_name=?,is_pay=?,pay_type=?,apply_amount=?,reimburse_amount=?,reimburse_by=?,tax_amount=?,acc_company_id=?,apply_by=?,apply_department=?,remark=?,invoice_no=? WHERE id = ?;`;
  let modifyParams: string[] = [is_admin,fee_name,is_pay,pay_type,Number(apply_amount.replace(/,/g, '')),Number(reimburse_amount.replace(/,/g, '')),reimburse_by,Number(tax_amount.replace(/,/g, '')),acc_company_id,apply_by,apply_department,remark,invoice_no.join(','),id];
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
  const select_id = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from applied_fee where id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 提交费用申请
const submitAppliedFee = async (req: Request, res: Response) => {
  const select_id = req.body;
  let payload = null;
  const status = "已提交";
  const apply_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE applied_fee SET status = '${status}',apply_time = '${apply_time}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 撤销费用申请
const revokeAppliedFee = async (req: Request, res: Response) => {
  const select_id = req.body;
  let payload = null;
  const status = "未提交";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE applied_fee SET status = '${status}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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
  operationLogList,
  accCompanyList,
  addAccCompany,
  editAccCompany,
  deleteAccCompany,
  reportList,
  addReport,
  editReport,
  submitReport,
  deleteReport,
  contractList,
  addContract,
  editContract,
  deleteContract,
  appliedFeeList,
  addAppliedFee,
  editAppliedFee,
  deleteAppliedFee,
  submitAppliedFee,
  revokeAppliedFee
};
