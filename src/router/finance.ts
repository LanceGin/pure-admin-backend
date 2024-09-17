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
  let sql: string = `UPDATE applied_fee as a left join pay_invoice_info as b on a.invoice_no = if(b.no='', b.digital_ticket_no, b.no) SET a.status = '${status}',a.keep_time = '${time}',a.keep_by = '${username}',b.paid_time = '${time}' WHERE a.id in ('${select_id.toString().replaceAll(",", "','")}');`;
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
  const keep_time = null;
  const username = "";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE applied_fee as a left join pay_invoice_info as b on a.invoice_no = if(b.no='', b.digital_ticket_no, b.no) SET a.status = '${status}',a.keep_time = '${keep_time}',a.keep_by = '${username}',b.paid_time = '${keep_time}' WHERE a.id in ('${select_id.toString().replaceAll(",", "','")}')`;
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
  const select_container = req.body;
  const type_pay = "应付";
  const type_collect = "应收"
  const fee_name = "打单费";
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_container.forEach((container) => {
    let select_sql = '';
    const type = "o" + container.container_type.substring(0,2).toLowerCase();
    if (container.order_type == "进口") {
      select_sql += `select ${type} as order_fee from ship_company where name = '${container.ship_company}' and area = '${container.load_port}';`;
    } else {
      select_sql += `select ${type} as order_fee from ship_company where name = '${container.ship_company}' and area = '${container.unload_port}';`;
    }
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        let amount = 0;
        if (data[0] != undefined) {
          amount = data[0].order_fee;
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
};

// 生成码头计划费
const generatePlanningFee = async (req: Request, res: Response) => {
  const {
    type,
    actual_amount,
    select_container
  } = req.body;
  const type_pay = "应付";
  const type_collect = "应收"
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_container.forEach((container) => {
    let fee_name = "计划费";
    let select_sql = '';
    if (container.temp_status == "已暂落") {
      fee_name = "堆存费";
      select_sql += `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.temp_port}';`
    } else {
      select_sql += `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.load_port}';`
    }
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        let amount = actual_amount.value / select_container.length;
        if ( actual_amount.value === null || container.temp_status == "已暂落") {
          if (data[0] != undefined) {
            amount = calPlanningFee(data,container);
          } else {
            amount = 9999;
          }
        }
        let insert_sql: string = `insert into container_fee (container_id, type, dispatch_type, fee_name, amount) values ('${container.id}','${type_pay}','${type}','${fee_name}','${amount.toFixed(2)}');`;
        insert_sql += `insert into container_fee (container_id, type, dispatch_type, fee_name, amount) values ('${container.id}','${type_collect}','${type}','${fee_name}','${amount.toFixed(2)}');`
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

// 更新堆存费&计划费，目前计划费未更新
const updatePlanningFee = async (req: Request, res: Response) => {
  const select_container = req.body;
  const type_pay = "应付";
  const type_collect = "应收"
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_container.forEach((container) => {
    let fee_name = "计划费";
    let select_sql = '';
    if (container.temp_port !== null) {
      fee_name = "堆存费";
      select_sql += `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.temp_port}';`
    } else {
      select_sql += `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.load_port}';`
    }
    // let select_sql: string = `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.temp_port}';`
    // console.log(11111, select_sql);
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        const amount = calPlanningFee(data,container)
        let insert_sql: string = `update container_fee set amount = '${amount}' where container_id = '${container.id}' and type = '${type_pay}' and fee_name = '${fee_name}';`;
        insert_sql += `update container_fee set amount = '${amount}' where container_id = '${container.id}' and type = '${type_collect}' and fee_name = '${fee_name}';`
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


// 生成驳运费
// const generateLighteringFee = async (req: Request, res: Response) => {
//   const select_lightering = req.body;
//   const type_pay = "应付";
//   const type_collect = "应收"
//   let fee_name = "计划费";
//   let amount = actual_amount.value;
//   let payload = null;
//   try {
//     const authorizationHeader = req.get("Authorization") as string;
//     const accessToken = authorizationHeader.substr("Bearer ".length);
//     payload = jwt.verify(accessToken, secret.jwtSecret);
//   } catch (error) {
//     return res.status(401).end();
//   }
//   select_container.forEach((container) => {
//     let select_sql = '';
//     if (container.temp_status == "已暂落") {
//       fee_name = "堆存费";
//       select_sql += `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.temp_port}';`
//     } else {
//       select_sql += `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.load_port}';`
//     }
//     connection.query(select_sql, function (err, data) {
//       if (err) {
//         console.log(err);
//       } else {
//         if (amount === null) {
//           amount = calPlanningFee(data,container)
//         }
//         let insert_sql: string = `insert into container_fee (container_id, type, fee_name, amount) values ('${container.id}','${type_pay}','${fee_name}','${amount}');`;
//         insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container.id}','${type_collect}','${fee_name}','${amount}');`
//         connection.query(insert_sql, async function (err, data) {
//           if (err) {
//             console.log(err);
//           } else {
//             console.log(data)
//           }
//         });
//       }
//     });
//   })
//   return res.json({
//     success: true,
//     data: { message: Message[8] },
//   });
// };


// 生成堆存费
const generateStorageFee = async (req: Request, res: Response) => {
  console.log(22222);
  const {
    select_container
  } = req.body;
  const type_pay = "应付";
  const type_collect = "应收"
  let fee_name = "堆存费";
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_container.forEach((container) => {
    const select_sql:string = `select a.*, b.yard_name, b.base_price_20, b.base_price_40, b.price_rule from yard_price as a left join base_fleet_yard as b on a.yard_id = b.id where b.yard_name = '${container.temp_port}';`
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        const amount = calPlanningFee(data,container)
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

// 生成拖车费
const generateDispatchFee = async (req: Request, res: Response) => {
  console.log("生成拖车费");
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
    let dispatch_type = "拆箱";
    let pay_fee_port = container.load_port;
    let collect_fee_port = container.load_port;
    let collect_door = container.door;
    let pay_door = container.door;
    if (container.order_type === "进口") {
      a = "i";
    } else if (container.order_type === "出口") {
      a = "o";
      pay_fee_port = container.unload_port;
      collect_fee_port = container.unload_port;
      dispatch_type = "装箱";
    }
    if (container.transfer_port !== null && container.transfer_port !== "") {
      pay_fee_port = container.transfer_port;
    }
    if (container.pay_door !== null && container.pay_door !== "") {
      pay_door = container.pay_door;
    }
    if (container.temp_status === "已暂落") {
      collect_door = container.temp_port;
      pay_door = container.temp_port;
      dispatch_type = "暂落";
    } else if (container.temp_port !== null) {
      pay_fee_port = container.temp_port;
      collect_fee_port = container.temp_port;
    }
    const b = a + container.container_type.toLowerCase();
    let select_sql:string = `select ${b} from door_price where is_pay = '1' and customer = '${container.customer}' and door = '${pay_door}' and port = '${pay_fee_port}';`
    select_sql += `select ${b} from door_price where is_pay = '0' and customer = '${container.customer}' and door = '${collect_door}' and port = '${collect_fee_port}';`
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        let amount_pay = 9999;
        let amount_collect = 9999;
        if (data[0].length > 0) {
          amount_pay = data[0][0][b];
        }
        if (data[1].length > 0) {
          amount_collect = data[1][0][b];
        }
        let insert_sql: string = `insert into container_fee (container_id, type, dispatch_type, fee_name, amount) values ('${container.id}','${type_pay}','${dispatch_type}','${fee_name}','${amount_pay}');`;
        insert_sql += `insert into container_fee (container_id, type, dispatch_type, fee_name, amount) values ('${container.id}','${type_collect}','${dispatch_type}','${fee_name}','${amount_collect}');`
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

// 更新拖车费
const updateDispatchFee = async (req: Request, res: Response) => {
  console.log("更新拖车费");
  const select_container = req.body;
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
    let dispatch_type = "拆箱";
    let pay_fee_port = container.load_port;
    let collect_fee_port = container.load_port;
    let collect_door = container.door;
    let pay_door = container.door;
    if (container.order_type === "进口") {
      a = "i";
    } else if (container.order_type === "出口") {
      a = "o";
      pay_fee_port = container.unload_port;
      collect_fee_port = container.unload_port;
      dispatch_type = "装箱";
    }
    if (container.transfer_port !== null && container.transfer_port !== "") {
      pay_fee_port = container.transfer_port;
    }
    if (container.pay_door !== null && container.pay_door !== "") {
      pay_door = container.pay_door;
    }
    if (container.temp_status === "已暂落") {
      collect_door = container.temp_port;
      pay_door = container.temp_port;
      dispatch_type = "暂落";
    } else if (container.temp_port !== null) {
      pay_fee_port = container.temp_port;
      collect_fee_port = container.temp_port;
    }
    const b = a + container.container_type.toLowerCase();
    let select_sql:string = `select ${b} from door_price where is_pay = '1' and customer = '${container.customer}' and door = '${pay_door}' and port = '${pay_fee_port}';`
    select_sql += `select ${b} from door_price where is_pay = '0' and customer = '${container.customer}' and door = '${collect_door}' and port = '${collect_fee_port}';`
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        let amount_pay = 9999;
        let amount_collect = 9999;
        if (data[0].length > 0) {
          amount_pay = data[0][0][b];
        }
        if (data[1].length > 0) {
          amount_collect = data[1][0][b];
        }
        let update_sql: string = `update container_fee set amount = '${amount_pay}' where container_id = '${container.id}' and type = '${type_pay}' and dispatch_type = '${dispatch_type}' and fee_name = '${fee_name}';`;
        update_sql += `update container_fee set amount = '${amount_collect}' where container_id = '${container.id}' and type = '${type_collect}' and dispatch_type = '${dispatch_type}' and fee_name = '${fee_name}';`
        connection.query(update_sql, async function (err, data) {
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
  let sql: string = `SELECT a.id,a.type,a.status,a.fee_name,a.account_period,a.custom_name,a.apply_department,a.project_name,a.flow_direction,a.acc_company,a.content,a.is_invoice,a.remark,a.submit_by,c.company_name,c.bank,c.account_no,b.container_type,b.add_by,FORMAT(sum(a.amount),2) as amount,FORMAT(sum(a.less_amount),2) as less_amount,FORMAT(sum(a.more_amount),2) as more_amount,FORMAT(sum(a.amount-a.less_amount+a.more_amount),2) as actual_amount,count(b.id) as total, COUNT(IF(left(b.container_type, 2) = '40',true,null)) as f, COUNT(IF(left(b.container_type, 2) = '20',true,null)) as t FROM container_fee as a left join container as b on a.container_id = b.id left join acc_company as c on c.id = a.acc_company where a.id is not null`;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name like " + "'%" + form.custom_name + "%'" }
  if (form.project_name != "") { sql += " and a.project_name like " + "'%" + form.project_name + "%'" }
  if (form.company_name != "") { sql += " and c.company_name like " + "'%" + form.company_name + "%'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  if (form.city_type != "") { sql += " and b.city like " + "'%" + form.city_type + "%'" }
  sql +=" GROUP BY a.account_period, a.acc_company, a.custom_name, a.apply_department, a.project_name,a.flow_direction,a.content order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`; select COUNT(*) from (select a.id FROM container_fee as a left join container as b on a.container_id = b.id left join acc_company as c on c.id = a.acc_company where a.id is not null `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name like " + "'%" + form.custom_name + "%'" }
  if (form.project_name != "") { sql += " and a.project_name like " + "'%" + form.project_name + "%'" }
  if (form.company_name != "") { sql += " and c.company_name like " + "'%" + form.company_name + "%'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  if (form.city_type != "") { sql += " and b.city like " + "'%" + form.city_type + "%'" }
  sql +=" GROUP BY a.account_period, a.acc_company, a.custom_name, a.apply_department, a.project_name,a.flow_direction,a.content) as t";
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
  let sql: string = `SELECT a.id,a.type,a.status,a.fee_name,a.account_period,a.custom_name,a.project_name,a.flow_direction,a.content,a.is_invoice,b.container_type,b.door,b.add_by,FORMAT(sum(a.amount),2) as amount,FORMAT(sum(a.less_amount),2) as less_amount,FORMAT(sum(a.more_amount),2) as more_amount,FORMAT(sum(a.amount-a.less_amount+a.more_amount),2) as actual_amount,count(b.id) as total, COUNT(IF(left(b.container_type, 2) = '40',true,null)) as f, COUNT(IF(left(b.container_type, 2) = '20',true,null)) as t FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null and a.status in ('未审核', '已审核')`;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.custom_name,a.project_name,b.door order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=`;select COUNT(*) from ( SELECT a.id,a.type,a.status,a.fee_name,a.account_period,a.custom_name,a.project_name,a.flow_direction,a.content,a.is_invoice,b.container_type,b.door,b.add_by,sum(a.amount) as amount,sum(a.less_amount) as less_amount,sum(a.more_amount) as more_amount,sum(a.amount-a.less_amount+a.more_amount) as actual_amount,count(b.id) as total, COUNT(IF(left(b.container_type, 2) = '40',true,null)) as f, COUNT(IF(left(b.container_type, 2) = '20',true,null)) as t FROM container_fee as a left join container as b on a.container_id = b.id where a.id is not null and a.status in ('未审核', '已审核') `;
  if (form.type != "") { sql += " and a.type = " + "'" + form.type + "'" }
  if (form.status != "") { sql += " and a.status = " + "'" + form.status + "'" }
  if (form.custom_name != "") { sql += " and a.custom_name = " + "'" + form.custom_name + "'" }
  if (form.project_name != "") { sql += " and a.project_name = " + "'" + form.project_name + "'" }
  if (form.account_period != "") { sql += " and a.account_period = " + "'" + form.account_period + "'" }
  if (form.flow_direction != "") { sql += " and a.flow_direction = " + "'" + form.flow_direction + "'" }
  sql +=" GROUP BY a.custom_name,a.project_name,b.door ) as t";
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
  if (form.invoice_time && form.invoice_time.length > 0) { sql += " and invoice_time between " + "'" + form.invoice_time[0] + "' and '" + form.invoice_time[1] + "'" }
  if (form.receipt_time && form.receipt_time.length > 0) { sql += " and receipt_time between " + "'" + form.receipt_time[0] + "' and '" + form.receipt_time[1] + "'" }
  if (form.is_receipt != "" && form.is_receipt == "未收款") { sql += " and receipt_time is null" }
  if (form.is_receipt != "" && form.is_receipt == "已收款") { sql += " and receipt_time is not null" }
  if (form.tax_rate != "") { sql += " and tax_rate like " + "'%" + form.tax_rate + "%'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_name != "") { sql += " and seller_name like " + "'%" + form.seller_name + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.buyer_name != "") { sql += " and buyer_name like " + "'%" + form.buyer_name + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from invoice_info where id is not null ";
  if (form.invoice_time && form.invoice_time.length > 0) { sql += " and invoice_time between " + "'" + form.invoice_time[0] + "' and '" + form.invoice_time[1] + "'" }
  if (form.receipt_time && form.receipt_time.length > 0) { sql += " and receipt_time between " + "'" + form.receipt_time[0] + "' and '" + form.receipt_time[1] + "'" }
  if (form.is_receipt != "" && form.is_receipt == "未收款") { sql += " and receipt_time is null" }
  if (form.is_receipt != "" && form.is_receipt == "已收款") { sql += " and receipt_time is not null" }
  if (form.tax_rate != "") { sql += " and tax_rate like " + "'%" + form.tax_rate + "%'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_name != "") { sql += " and seller_name like " + "'%" + form.seller_name + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.buyer_name != "") { sql += " and buyer_name like " + "'%" + form.buyer_name + "%'" }
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
    tax,
    invoice_from,
    invoice_type,
    status,
    is_positive,
    risk_level,
    invoice_by,
    remark
  } = req.body;
  let payload = null;
  const tax_rate = (tax / amount * 100).toString() + "%";
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
    tax,
    invoice_from,
    invoice_type,
    status,
    is_positive,
    risk_level,
    invoice_by,
    remark
  } = req.body;
  let payload = null;
  const tax_rate = (tax / amount * 100).toString() + "%";
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
  const { select_id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from invoice_info where id in ('${select_id.toString().replaceAll(",", "','")}')`;
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
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  let tax_rate = "";
  const values = sheets[0].data;
  values.shift();
  values.forEach((v) => {
    tax_rate = Math.round(v[10] / v[9] * 100).toString() + "%";
    v.push(tax_rate);
  })
  let sql: string = "insert ignore into invoice_info (tmp_excel_no,code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,amount,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark,tax_rate) values ?"
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
  let sql: string = "select id,code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,classification_code,specific_type,goods_or_taxable_service,specification,unit,quantity,unit_price,sum(amount) as amount,tax_rate,sum(tax) as tax, sum(total_amount) as total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark,is_invoice,paid_time,certification_period,tmp_excel_no from pay_invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.seller_name != "") { sql += " and seller_name like " + "'%" + form.seller_name + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  if (form.buyer_name != "") { sql += " and buyer_name like " + "'%" + form.buyer_name + "%'" }
  if (form.is_invoice && form.is_invoice != "") { sql += " and is_invoice = " + "'" + form.is_invoice + "'" }
  if (form.certification_period && form.certification_period != "") { sql += " and certification_period = " + "'" + form.certification_period + "'" }
  sql +=" group by digital_ticket_no,no,code order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ( select * from pay_invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no like " + "'%" + form.digital_ticket_no + "%'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.seller_name != "") { sql += " and seller_name like " + "'%" + form.seller_name + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  if (form.buyer_name != "") { sql += " and buyer_name like " + "'%" + form.buyer_name + "%'" }
  if (form.is_invoice && form.is_invoice != "") { sql += " and is_invoice = " + "'" + form.is_invoice + "'" }
  if (form.certification_period && form.certification_period != "") { sql += " and certification_period = " + "'" + form.certification_period + "'" }
  sql +=" group by digital_ticket_no,no,code ) as t";
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

// 获取应付发票列表 仅供筛选使用
const selectPayInvoicetList = async (req: Request, res: Response) => {
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select if(a.no='', a.digital_ticket_no, a.no) as invoice_no from pay_invoice_info as a left join applied_fee as b on FIND_IN_SET(if(a.no='', a.digital_ticket_no, a.no), b.invoice_no) > 0 where b.id is null `;
  sql +=" group by a.digital_ticket_no,a.no,a.code order by a.id desc;";
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { 
          list: data
        },
      });
    }
  });
};

// 获取应付发票列表
const payInvoicetOrigList = async (req: Request, res: Response) => {
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
  if (form.invoice_type != "") { sql += " and invoice_type like " + "'%" + form.invoice_type + "%'" }
  if (form.status != "") { sql += " and status = " + "'" + form.status + "'" }
  if (form.certification_period != "" && form.certification_period != null) { sql += " and certification_period = " + "'" + form.certification_period + "'" }
  if (form.tax_rate != "") { sql += " and tax_rate = " + "'" + form.tax_rate + "'" }
  if (form.code != "") { sql += " and code = " + "'" + form.code + "'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no = " + "'" + form.digital_ticket_no + "'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.seller_name != "") { sql += " and seller_name like " + "'%" + form.seller_name + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  if (form.buyer_name != "") { sql += " and buyer_name like " + "'%" + form.buyer_name + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from pay_invoice_info where id is not null ";
  if (form.invoice_time != "") { sql += " and invoice_time = " + "'" + form.invoice_time + "'" }
  if (form.invoice_type != "") { sql += " and invoice_type like " + "'%" + form.invoice_type + "%'" }
  if (form.status != "") { sql += " and status = " + "'" + form.status + "'" }
  if (form.certification_period != "" && form.certification_period != null) { sql += " and certification_period = " + "'" + form.certification_period + "'" }
  if (form.tax_rate != "") { sql += " and tax_rate = " + "'" + form.tax_rate + "'" }
  if (form.code != "") { sql += " and code = " + "'" + form.code + "'" }
  if (form.no != "") { sql += " and no = " + "'" + form.no + "'" }
  if (form.digital_ticket_no != "") { sql += " and digital_ticket_no = " + "'" + form.digital_ticket_no + "'" }
  if (form.seller_identification_no != "") { sql += " and seller_identification_no like " + "'%" + form.seller_identification_no + "%'" }
  if (form.seller_name != "") { sql += " and seller_name like " + "'%" + form.seller_name + "%'" }
  if (form.buyer_identification_no != "") { sql += " and buyer_identification_no like " + "'%" + form.buyer_identification_no + "%'" }
  if (form.buyer_name != "") { sql += " and buyer_name like " + "'%" + form.buyer_name + "%'" }
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
  const { select_id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from pay_invoice_info where id in ('${select_id.toString().replaceAll(",", "','")}')`;
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
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "insert ignore into pay_invoice_info (tmp_excel_no,code,no,digital_ticket_no,seller_identification_no,seller_name,buyer_identification_no,buyer_name,invoice_time,classification_code,specific_type,goods_or_taxable_service,specification,unit,quantity,unit_price,amount,tax_rate,tax,total_amount,invoice_from,invoice_type,status,is_positive,risk_level,invoice_by,remark) values ?"
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
    company_name,
    project_name,
    flow_direction,
    content,
    apply_department,
    type
  }  = req.body.form;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select a.*, FORMAT(b.amount,2) as amount, FORMAT(b.less_amount,2) as less_amount, FORMAT(b.more_amount,2) as more_amount, FORMAT((b.amount-b.less_amount+b.more_amount),2) as actual_amount from container as a left join container_fee as b on a.id = b.container_id left join acc_company as c on c.id = b.acc_company where b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
  if (type == "应付") {
    sql += ` and c.company_name = '${company_name}'`;
    sql += ` and b.apply_department = '${apply_department}'`;
  }
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
  const status = '已驳回';
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
  let {
    account_period,
    fee_name,
    custom_name,
    apply_department,
    project_name,
    flow_direction,
    acc_company,
    content,
    actual_amount,
    remark,
    submit_by
  }  = req.body;
  actual_amount = Number(actual_amount.replace(/,/g, ''))
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
  sql += ` and b.apply_department = '${apply_department}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.acc_company = '${acc_company}'`;
  sql += ` and b.flow_direction = '${flow_direction}'`;
  sql += ` and b.content = '${content}'`;
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      const is_admin = "业务";
      const is_pay = "付";
      const add_time = dayjs(new Date()).format("YYYY-MM-DD");
      const fee_no = "FAO" + dayjs(new Date()).format("YYYYMMDD") + Math.floor(Math.random()*10000);
      let apply_fee_sql: string = `insert into applied_fee (is_admin,fee_name,is_pay,apply_amount,acc_company_id,apply_by,apply_department,create_time,fee_no,remark) values ('${is_admin}','${content}','${is_pay}','${actual_amount}','${acc_company}','${submit_by}','${apply_department}','${add_time}','${fee_no}','${remark}');`;
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
    apply_department,
    project_name,
    acc_company,
    flow_direction,
    content
  }  = req.body;
  let payload = null;
  const status = '已驳回';
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update container_fee as b set b.status = '${status}' where b.type = "应付" and b.account_period = '${dayjs(account_period).format("YYYY-MM-DD")}'`;
  sql += ` and b.custom_name = '${custom_name}'`;
  sql += ` and b.apply_department = '${apply_department}'`;
  sql += ` and b.project_name = '${project_name}'`;
  sql += ` and b.acc_company = '${acc_company}'`;
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

// 获取费用名列表
const feeNameList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from fee_name where id is not null";
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from fee_name where id is not null"
  if (form.code != "") { sql += " and code like " + "'%" + form.code + "%'" }
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
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

// 新增费用名
const addFeeName = async (req: Request, res: Response) => {
  const {
    code,
    name
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into fee_name (code, name) values ('${code}', '${name}');`;
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

// 删除费用名
const deleteFeeName = async (req: Request, res: Response) => {
  const { select_id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from fee_name where id in ('${select_id.toString().replaceAll(",", "','")}')`;
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


// 编辑费用名
const editFeeName = async (req: Request, res: Response) => {
  const {
    id,
    code,
    name
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE fee_name SET code = ?, name = ? WHERE id = ?";
  let modifyParams: string[] = [code, name, id];
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
  keepAppliedFee,
  cancelKeepAppliedFee,
  generateContainerFee,
  generateOrderFee,
  generatePlanningFee,
  updatePlanningFee,
  generateStorageFee,
  generateDispatchFee,
  updateDispatchFee,
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
  selectPayInvoicetList,
  payInvoicetOrigList,
  addPayInvoice,
  editPayInvoice,
  deletePayInvoice,
  registerPayInvoice,
  importPayInvoice,
  collectionContainerList,
  approveCollection,
  rejectCollection,
  approvePay,
  rejectPay,
  feeNameList,
  addFeeName,
  deleteFeeName,
  editFeeName
};
