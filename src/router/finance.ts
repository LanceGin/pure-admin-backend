import * as fs from "fs";
import secret from "../config";
import * as mysql from "mysql2";
import * as jwt from "jsonwebtoken";
import { createHash } from "crypto";
import Logger from "../loaders/logger";
import { Message } from "../utils/enums";
import getFormatDate from "../utils/date";
import { connection } from "../utils/mysql";
import { getRandomString, calPlanningFee } from "../utils/utils";
import { Request, Response } from "express";
import * as dayjs from "dayjs";

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

// 费用申请记账
const keepAppliedFee = async (req: Request, res: Response) => {
  const { select_id, username, keep_time } = req.body;
  let payload = null;
  const status = "已记账";
  let time;
  if (keep_time.value === null) {
    time = dayjs(new Date()).format("YYYY-MM-DD");
  } else {
    time = keep_time.value;
  }
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE applied_fee SET status = '${status}',keep_time = '${time}',keep_by = '${username}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 生成应收费用
const generateContainerFee = async (req: Request, res: Response) => {
  const {
    account_period,
    custom_name,
    project_name,
    flow_direction,
    content,
    amount
  } = req.body;
  const type = "应收";
  const status = "已审核";
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into container_fee (type,status,account_period,custom_name,project_name,flow_direction,content,amount) values ('${type}','${status}','${account_period}','${custom_name}','${project_name}','${flow_direction}','${content}','${amount}')`;
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
  const type_pay = "应付";
  const type_collect = "应收"
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
  let sql: string = `insert into container_fee (container_id, type, fee_name, amount) select id as container_id,"${type_pay}" as type,"${fee_name}" as fee_name,"${amount}" as amount from container where track_no in ('${select_track_no.toString().replaceAll(",", "','")}');`;
  sql += ` insert into container_fee (container_id, type, fee_name, amount) select id as container_id,"${type_collect}" as type,"${fee_name}" as fee_name,"${amount}" as amount from container where track_no in ('${select_track_no.toString().replaceAll(",", "','")}');`;
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
    actual_amount,
    select_container
  } = req.body;
  const type_pay = "应付";
  const type_collect = "应收"
  let fee_name = "计划费";
  let amount = actual_amount.value;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_container.forEach((container) => {
    const select_sql:string = `select a.*, b.yard_name from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.load_port}';`
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        if (amount === null) {
          amount = calPlanningFee(data,container.arrive_time)
        }
        if (container.temp_status == "已暂落") {
          fee_name = "堆存费";
        }
        let insert_sql: string = `insert into container_fee (container_id, type, fee_name, amount) values ('${container.id}','${type_pay}','${fee_name}','${amount}');`;
        insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container.id}','${type_collect}','${fee_name}','${amount}');`
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
};

// 生成拖车费
const generateDispatchFee = async (req: Request, res: Response) => {
  const {
    select_container
  } = req.body;
  const type_pay = "应付";
  const type_collect = "应收"
  let fee_name = "拖车费";
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_container.forEach((container) => {
    let a = "";
    if (container.order_type === "进口") {
      a = "i";
    } else if (container.order_type === "出口") {
      a = "o";
    }
    const b = a + container.container_type.toLowerCase();
    let select_sql:string = `select ${b} from door_price where is_pay = '1' and customer = '${container.customer}' and project = '${container.subproject}' and door = '${container.door}' and port = '${container.load_port}';`
    select_sql += `select ${b} from door_price where is_pay = '0' and customer = '${container.customer}' and project = '${container.subproject}' and door = '${container.door}' and port = '${container.load_port}';`
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        const amount_pay = data[0][0][b];
        const amount_collect = data[1][0][b];
        let insert_sql: string = `insert into container_fee (container_id, type, fee_name, amount) values ('${container.id}','${type_pay}','${fee_name}','${amount_pay}');`;
        insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container.id}','${type_collect}','${fee_name}','${amount_collect}');`
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
  const account_period = dayjs(form.account_period).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `SELECT a.id,a.type,a.status,a.fee_name,a.account_period,a.custom_name,a.project_name,a.flow_direction,a.content,a.is_invoice,a.remark,b.container_type,b.add_by,sum(a.amount) as amount,sum(a.less_amount) as less_amount,sum(a.more_amount) as more_amount,sum(a.amount-a.less_amount+a.more_amount) as actual_amount,count(b.id) as total, COUNT(IF(left(b.container_type, 2) = '40',true,null)) as f, COUNT(IF(left(b.container_type, 2) = '20',true,null)) as t FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null`;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.account_period, a.custom_name,a.project_name,a.flow_direction,a.content order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.account_period, a.custom_name,a.project_name,a.flow_direction,a.content";
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      if (data[1] == 0) {
        total = 0;
      } else {
        total = data[1][0]['COUNT(*)'];
      }
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

// 获取费用报表列表
const financeStatList = async (req: Request, res: Response) => {
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
  let sql: string = `SELECT a.id,a.type,a.status,a.fee_name,a.account_period,a.custom_name,a.project_name,a.flow_direction,a.content,a.is_invoice,b.container_type,b.door,b.add_by,sum(a.amount) as amount,sum(a.less_amount) as less_amount,sum(a.more_amount) as more_amount,sum(a.amount-a.less_amount+a.more_amount) as actual_amount,count(b.id) as total, COUNT(IF(left(b.container_type, 2) = '40',true,null)) as f, COUNT(IF(left(b.container_type, 2) = '20',true,null)) as t FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null and a.status in ('未审核', '已审核')`;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.custom_name,a.project_name,b.door order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.custom_name,a.project_name,b.door";
  console.log(1111, sql);
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      if (data[1] == 0) {
        total = 0;
      } else {
        total = data[1][0]['COUNT(*)'];
      }
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

// 获取发票列表
const invoicetList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.tax_rate != "") { sql += " and tax_rate like " + "'%" + form.tax_rate + "%'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.tax_rate != "") { sql += " and tax_rate like " + "'%" + form.tax_rate + "%'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
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

// 新增发票
const addInvoice = async (req: Request, res: Response) => {
  const {
    code,
    no,
    digital_ticket_no,
    seller_identification_no,
    seller_name,
    buyer_identification_no,
    buyer_name,
    invoice_time,
    amount,
    tax_rate,
    invoice_from,
    invoice_type,
    status,
    is_positive,
    risk_level,
    invoice_by,
    remark
  } = req.body;
  let payload = null;
  const tax = amount * tax_rate;
  const total_amount = Number(amount) + Number(tax);
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into invoice_info (code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,amount,tax_rate,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark) values ('${code}','${no}','${digital_ticket_no}','${seller_identification_no}','${seller_name}','${buyer_identification_no}','${buyer_name}','${invoice_time}','${amount}','${tax_rate}','${tax}','${total_amount}','${invoice_from}','${invoice_type}','${status}','${is_positive}','${risk_level}','${invoice_by}','${remark}')`;
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

// 修改发票
const editInvoice = async (req: Request, res: Response) => {
  const {
    id,
    code,
    no,
    digital_ticket_no,
    seller_identification_no,
    seller_name,
    buyer_identification_no,
    buyer_name,
    invoice_time,
    amount,
    tax_rate,
    invoice_from,
    invoice_type,
    status,
    is_positive,
    risk_level,
    invoice_by,
    remark
  } = req.body;
  let payload = null;
  const tax = amount * tax_rate;
  const total_amount = Number(amount) + Number(tax);
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE invoice_info SET code = ?,no = ?,digital_ticket_no = ?,seller_identification_no = ?,seller_name = ?,buyer_identification_no = ?,buyer_name = ?,invoice_time = ?,amount = ?,tax_rate = ?,tax = ?,total_amount = ?,invoice_from = ?,invoice_type = ?,status = ?,is_positive = ?,risk_level = ?,invoice_by = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,amount,tax_rate,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark,id];
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

// 删除发票
const deleteInvoice = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from invoice_info where id = '${id}'`;
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

// 批量设置发票收款日期
const setReceiptTime = async (req: Request, res: Response) => {
  const { select_id, receipt_time } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE invoice_info SET receipt_time = '${receipt_time.value}', receipt_amount = total_amount WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 批量导入发票
const importInvoice = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, { cellDates: true });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "insert into invoice_info (tmp_excel_no,code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,amount,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark) values ?"
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

// 获取应付发票列表
const payInvoicetList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from pay_invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.tax_rate != "") { sql += " and tax_rate like " + "'%" + form.tax_rate + "%'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from pay_invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.tax_rate != "") { sql += " and tax_rate like " + "'%" + form.tax_rate + "%'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
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

// 新增应付发票
const addPayInvoice = async (req: Request, res: Response) => {
  const {
    code,
    no,
    digital_ticket_no,
    seller_identification_no,
    seller_name,
    buyer_identification_no,
    buyer_name,
    invoice_time,
    classification_code,
    specific_type,
    goods_or_taxable_service,
    specification,
    unit,
    quantity,
    unit_price,
    tax_rate,
    invoice_from,
    invoice_type,
    status,
    is_positive,
    risk_level,
    invoice_by,
    remark
  } = req.body;
  let payload = null;
  const amount = quantity * unit_price;
  const tax = amount * tax_rate;
  const total_amount = Number(amount) + Number(tax);
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into pay_invoice_info (code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,classification_code,specific_type,goods_or_taxable_service,specification,unit,quantity,unit_price,amount,tax_rate,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark) values ('${code}','${no}','${digital_ticket_no}','${seller_identification_no}','${seller_name}','${buyer_identification_no}','${buyer_name}','${invoice_time}','${classification_code}','${specific_type}','${goods_or_taxable_service}','${specification}','${unit}','${quantity}','${unit_price}','${amount}','${tax_rate}','${tax}','${total_amount}','${invoice_from}','${invoice_type}','${status}','${is_positive}','${risk_level}','${invoice_by}','${remark}')`;
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

// 修改应付发票
const editPayInvoice = async (req: Request, res: Response) => {
  const {
    id,
    code,
    no,
    digital_ticket_no,
    seller_identification_no,
    seller_name,
    buyer_identification_no,
    buyer_name,
    invoice_time,
    classification_code,
    specific_type,
    goods_or_taxable_service,
    specification,
    unit,
    quantity,
    unit_price,
    tax_rate,
    invoice_from,
    invoice_type,
    status,
    is_positive,
    risk_level,
    invoice_by,
    remark
  } = req.body;
  let payload = null;
  const amount = quantity * unit_price;
  const tax = amount * tax_rate;
  const total_amount = Number(amount) + Number(tax);
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE pay_invoice_info SET code = ?,no = ?,digital_ticket_no = ?,seller_identification_no = ?,seller_name = ?,buyer_identification_no = ?,buyer_name = ?,invoice_time = ?,classification_code = ?,specific_type = ?,goods_or_taxable_service = ?,specification = ?,unit = ?,quantity = ?,unit_price = ?,amount = ?,tax_rate = ?,tax = ?,total_amount = ?,invoice_from = ?,invoice_type = ?,status = ?,is_positive = ?,risk_level = ?,invoice_by = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,classification_code,specific_type,goods_or_taxable_service,specification,unit,quantity,unit_price,amount,tax_rate,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark,id];
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

// 删除应付发票
const deletePayInvoice = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from pay_invoice_info where id = '${id}'`;
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

// 批量登记应付发票
const registerPayInvoice = async (req: Request, res: Response) => {
  const { select_id, form } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE pay_invoice_info SET is_invoice = '${form.is_invoice}',paid_time = '${form.paid_time}',certification_period = '${form.certification_period}' WHERE id in ('${select_id.toString().replaceAll(",", "','")}')`;
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

// 批量导入应付发票
const importPayInvoice = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, { cellDates: true });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "insert into pay_invoice_info (tmp_excel_no,code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,classification_code,specific_type,goods_or_taxable_service,specification,unit,quantity,unit_price,amount,tax_rate,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark) values ?"
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

// 获取应收箱子记录
const collectionContainerList = async (req: Request, res: Response) => {
  const {
    account_period,
    custom_name,
    project_name,
    flow_direction,
    content
  }  = req.body.form;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select a.*, b.amount,b.less_amount,b.more_amount,(b.amount-b.less_amount+b.more_amount) as actual_amount from container as a left join container_fee as b on a.id = b.container_id where b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
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

// 通过应收费用审核
const approveCollection = async (req: Request, res: Response) => {
  const {
    account_period,
    fee_name,
    custom_name,
    project_name,
    flow_direction,
    content
  }  = req.body;
  let payload = null;
  const status = '已审核';
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update container_fee as b set b.status = '${status}' where b.type = "应收" and b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
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

// 驳回应收费用审核
const rejectCollection = async (req: Request, res: Response) => {
  const {
    account_period,
    custom_name,
    project_name,
    flow_direction,
    content
  }  = req.body;
  let payload = null;
  const status = '未提交';
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update container_fee as b set b.status = '${status}' where b.type = "应收" and b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
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

// 通过应付费用审核
const approvePay = async (req: Request, res: Response) => {
  const {
    account_period,
    fee_name,
    custom_name,
    project_name,
    flow_direction,
    content,
    amount,
    add_by
  }  = req.body;
  let payload = null;
  const status = '已审核';
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update container_fee as b set b.status = '${status}' where b.type = "应付" and b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      const is_admin = "业务";
      const is_pay = "付";
      const add_time = dayjs(new Date()).format("YYYY-MM-DD");
      let apply_fee_sql: string = `insert into applied_fee (is_admin,fee_name,is_pay,apply_amount,apply_by,create_time) values ('${is_admin}','${fee_name}','${is_pay}','${amount}','${add_by}','${add_time}')`;
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


// 驳回应付费用审核
const rejectPay = async (req: Request, res: Response) => {
  const {
    account_period,
    custom_name,
    project_name,
    flow_direction,
    content
  }  = req.body;
  let payload = null;
  const status = '未提交';
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update container_fee as b set b.status = '${status}' where b.type = "应付" and b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
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

export {
  keepAppliedFee,
  cancelKeepAppliedFee,
  generateContainerFee,
  generateOrderFee,
  generatePlanningFee,
  generateStorageFee,
  generateDispatchFee,
  generateAbnormalFee,
  financeCheckList,
  financeStatList,
  invoicetList,
  addInvoice,
  editInvoice,
  deleteInvoice,
  setReceiptTime,
  importInvoice,
  payInvoicetList,
  addPayInvoice,
  editPayInvoice,
  deletePayInvoice,
  registerPayInvoice,
  importPayInvoice,
  collectionContainerList,
  approveCollection,
  rejectCollection,
  approvePay,
  rejectPay
};
