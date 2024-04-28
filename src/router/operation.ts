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
  let sql: string = "insert ignore into lightering (type,add_time,voyage,container_no,bl_no,customs_container_type,iso,container_type,container_holder,is_import,extra_operation,trade_type,seal_no,cargo_name,load_port,target_port,unload_port,load_payer,total_weight,cargo_weight,volume,amount,cargo_owner,forwarder,remarks) values ?";
  connection.query(sql, [values], function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      const select_sql: string = `select * from lightering order by id desc limit ${JSON.parse(JSON.stringify(data)).affectedRows};`
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

// 生成水运费
const generateShipFee = async (req: Request, res: Response) => {
  const { select_item } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  select_item.forEach((item) => {
    const c = "c" + item.container_type.substring(0,2).toLowerCase();
    const p = "p" + item.container_type.substring(0,2).toLowerCase();
    let select_sql:string = `select order_fee, ${c} as c_fee, ${p} as p_fee from lightering_price where settlement = '${item.load_port}' and cargo_name = '${item.cargo_name}';`
    select_sql += `select id from container where containner_no = '${item.container_no}' and seal_no = '${item.seal_no}' and city = '武汉';`;
    connection.query(select_sql, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        const order_fee = data[0][0].order_fee;
        const p_fee = data[0][0].p_fee;
        const c_fee = data[0][0].c_fee;
        let container_id = null;
        if (data[1].length > 0) {
          container_id = data[1][0].id
          let insert_sql: string = `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应收','换单费','${order_fee}');`;
          insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应付','换单费','${order_fee}');`;
          insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应收','水运费','${c_fee}');`;
          insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${container_id}','应付','水运费','${p_fee}');`;
          connection.query(insert_sql, async function (err, data) {
            if (err) {
              console.log(err);
            } else {
              console.log(data)
            }
          });
        } else {
          let insert_sql:string = `insert ignore into container (order_status,order_type,container_status,make_time,ship_name,seal_no,containner_no,track_no,container_type,start_port,target_port,door) values ('已提交','船运','已完成','${item.add_time}','${item.voyage}','${item.seal_no}','${item.container_no}','${item.bl_no}','${item.container_type}','${item.load_port}','${item.unload_port}','${item.cargo_name}');`
          connection.query(insert_sql, async function (err, data) {
            if (err) {
              console.log(err);
            } else {
              console.log(data)
              let insert_sql: string = `insert into container_fee (container_id, type, fee_name, amount) values ('${JSON.parse(JSON.stringify(data)).insertId}','应收','换单费','${order_fee}');`;
              insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${JSON.parse(JSON.stringify(data)).insertId}','应付','换单费','${order_fee}');`;
              insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${JSON.parse(JSON.stringify(data)).insertId}','应收','水运费','${c_fee}');`;
              insert_sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${JSON.parse(JSON.stringify(data)).insertId}','应付','水运费','${p_fee}');`;
              connection.query(insert_sql, async function (err, data) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(data)
                }
              });
            }
          });
        }
      }
    });
  })
  return res.json({
    success: true,
    data: { message: Message[8] },
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
  let sql: string = "insert ignore into lightering (type,add_time,voyage,bl_no,load_port,unload_port,target_port,total_weight,container_no,container_holder,extra_operation,container_type,customs_container_type,iso,is_import,empty_weight,trade_type,seal_no,cargo_name,unload_payer,transfer_type) values ?"
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
  let sql: string = "select date_format(add_time, '%Y-%m-%d') as add_time, voyage, cargo_name, COUNT(IF(left(container_type, 2) = '40',true,null)) as f, COUNT(IF(left(container_type, 2) = '20',true,null)) as t from lightering where id is not null ";
  if (form.add_time_range && form.add_time_range.length > 0) { sql += " and DATE_FORMAT(add_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.add_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.add_time_range[1] + "','%Y%m%d')" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
  if (form.voyage != "") { sql += " and voyage like " + "'%" + form.voyage + "%'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  sql +=" group by add_time, voyage, cargo_name order by add_time desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ( select date_format(add_time, '%Y-%m-%d') as add_time, voyage, cargo_name, COUNT(IF(left(container_type, 2) = '40',true,null)) as f, COUNT(IF(left(container_type, 2) = '20',true,null)) as t from lightering where id is not null ";
  if (form.add_time_range && form.add_time_range.length > 0) { sql += " and DATE_FORMAT(add_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.add_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.add_time_range[1] + "','%Y%m%d')" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  if (form.cargo_name != "") { sql += " and cargo_name like " + "'%" + form.cargo_name + "%'" }
  if (form.voyage != "") { sql += " and voyage like " + "'%" + form.voyage + "%'" }
  sql +=" group by add_time, voyage, cargo_name order by add_time asc ) as t;";
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
  if (form.city != "" && form.city != "管理员") { sql += " and city = " + "'" + form.city + "'" }
  sql +=" group by track_no order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ( select * from container where id is not null ";
  if (form.customer != "") { sql += " and customer like " + "'%" + form.customer + "%'" }
  if (form.subproject != "") { sql += " and subproject like " + "'%" + form.subproject + "%'" }
  if (form.order_type != "") { sql += " and order_type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.order_status != "") { sql += " and order_status like " + "'%" + form.order_status + "%'" }
  if (form.order_time != "") { sql += " and order_time = " + "'" + form.order_time + "'" }
  if (form.city != "" && form.city != "管理员") { sql += " and city = " + "'" + form.city + "'" }
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
  let sql: string = "select a.id as dispatch_id, a.type, a.status, a.car_no as dispatch_car_no, a.trans_status, a.abnormal_fee, a.remark as dispatch_remark, a.add_time as op_time, b.*, c.amount from dispatch as a left join container as b on b.id = a.container_id left join container_fee as c on c.container_id = b.id and c.dispatch_type = a.type where a.trans_status = '已完成' and c.fee_name = '拖车费' and c.type = '应付' ";
  if (form.container_status != "") { sql += " and b.container_status like " + "'%" + form.container_status + "%'" }
  if (form.customer != "") { sql += " and b.customer like " + "'%" + form.customer + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.order_type != "") { sql += " and a.type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.seal_no != "") { sql += " and b.seal_no like " + "'%" + form.seal_no + "%'" }
  if (form.dispatch_car_no != "") { sql += " and a.car_no like " + "'%" + form.dispatch_car_no + "%'" }
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and date_format(a.add_time, '%Y-%m-%d') between " + "'" + dayjs(form.make_time_range[0]).format('YYYY-MM-DD') + "' and '" + dayjs(form.make_time_range[1]).format('YYYY-MM-DD') + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.city != "" && form.city != "管理员") { sql += " and b.city = " + "'" + form.city + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from ( select a.id from dispatch as a left join container as b on b.id = a.container_id where a.trans_status = '已完成' ";
  if (form.container_status != "") { sql += " and b.container_status like " + "'%" + form.container_status + "%'" }
  if (form.customer != "") { sql += " and b.customer like " + "'%" + form.customer + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.order_type != "") { sql += " and a.type like " + "'%" + form.order_type + "%'" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.seal_no != "") { sql += " and b.seal_no like " + "'%" + form.seal_no + "%'" }
  if (form.dispatch_car_no != "") { sql += " and a.car_no like " + "'%" + form.dispatch_car_no + "%'" }
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and date_format(a.add_time, '%Y-%m-%d') between " + "'" + dayjs(form.make_time_range[0]).format('YYYY-MM-DD') + "' and '" + dayjs(form.make_time_range[1]).format('YYYY-MM-DD') + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.city != "" && form.city != "管理员") { sql += " and b.city = " + "'" + form.city + "'" }
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

// 获取派车单费用记录
const getDispatchFeeList = async (req: Request, res: Response) => {
  const dispatch_id  = req.body.form.dispatch_id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `select * from dispatch_fee where dispatch_id = '${dispatch_id}'`;
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

// 修正箱信息
const fixContainerInfo = async (req: Request, res: Response) => {
  const {
    id,
    dispatch_id,
    ship_name,
    track_no,
    containner_no,
    seal_no,
    container_type,
    door,
    load_port,
    unload_port,
    car_no,
    make_time
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE dispatch as a left join container as b on b.id = a.container_id SET b.ship_name = ?, b.track_no = ?, b.containner_no = ?, b.seal_no = ?, b.container_type = ?, b.door = ?, b.load_port = ?, b.unload_port = ?, b.car_no = ?, b.make_time = ?, a.car_no = ?, a.add_time = ?  WHERE a.id = ?;select * from container where id = ?;";
  let modifyParams: string[] = [ship_name,track_no,containner_no,seal_no,container_type,door,load_port,unload_port,car_no,make_time,car_no,make_time,dispatch_id,id];
  connection.query(modifySql, modifyParams, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: { list: result[1] },
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
  let sql: string = `select * from container where track_no = '${track_no}' and order_type = '进口';`;
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
  const city = req.body.city;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  values.forEach((v) => {
    v[4] = formatDate(v[4], "/");
    v.push(add_by);
    v.push(city);
    v.push(v[12]);
  })
  let sql: string = "insert ignore into container (tmp_excel_no,ship_company,customer,subproject,arrive_time,start_port,target_port,containner_no,seal_no,container_type,ship_name,track_no,load_port,unload_port,door,add_by,city,old_load_port) values ?"
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
  const city = req.body.city;
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
    v.push(city);
  })
  let sql: string = `insert ignore into container (tmp_excel_no,ship_company,customer,subproject,make_time,load_port,ship_name,track_no,containner_no,container_type,seal_no,door,unload_port,car_no,start_port,target_port,transfer_port,package_count,gross_weight,volume,container_weight,ba_fee,order_status,order_type,container_status,add_by,city) values ?`;
  connection.query(sql, [values], function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      const select_sql: string = `select * from container order by id desc limit ${JSON.parse(JSON.stringify(data)).affectedRows};`
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

// 生成出口派车单
const generateExportDispatch = async (req: Request, res: Response) => {
  const {
    select_container
  } = req.body;
  // const add_time = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  const status = "已派车";
  const trans_status = "已完成";
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = ``;
  select_container.forEach(container => {
    sql += `insert into dispatch (type,container_id,car_no,status,trans_status,add_time) values ('装箱','${container.id}','${container.car_no}','${status}','${trans_status}','${container.make_time}');`;
    sql += `update dispatch as a left join container as b on b.id = a.container_id set a.export_seal_no = '${container.seal_no}', a.export_port = '${container.door}' where b.customer = '${container.customer}' and b.containner_no = '${container.containner_no}' and date_format(b.make_time, '%Y-%m-%d') = date_format(CONVERT_TZ('${container.make_time}','+00:00','+8:00'), '%Y-%m-%d') and a.type = '拆箱';`
    if (container.ba_fee !== "") {
      sql += `insert into container_fee (container_id, type, fee_name, amount) select '${container.id}', '应付', '上下车费', '${container.ba_fee}' from dual WHERE NOT EXISTS (select * from container_fee where container_id = '${container.id}' and type = '应付' and fee_name = '上下车费');`;
      sql += `insert into container_fee (container_id, type, fee_name, amount) select '${container.id}', '应收', '上下车费', '${container.ba_fee}' from dual WHERE NOT EXISTS (select * from container_fee where container_id = '${container.id}' and type = '应收' and fee_name = '上下车费');`;
    }

  })
  console.log("导入出口运单同步更新进口运单数据：", sql);
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
    add_by,
    city
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert ignore into container (order_type, ship_company,customer,subproject,arrive_time,start_port,target_port,containner_no,seal_no,container_type,ship_name,track_no,load_port,door,add_by,city) values ('进口','${ship_company}','${customer}','${subproject}','${arrive_time}','${start_port}','${target_port}','${containner_no}','${seal_no}','${container_type}','${ship_name}','${track_no}','${load_port}','${door}','${add_by}','${city}')`;
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

// 新增异常费用
const addContainerFee = async (req: Request, res: Response) => {
  const {
    id,
    dispatch_id,
    fee_name,
    fee,
    remark,
    add_by
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into dispatch_fee (dispatch_id, fee_name, fee, remark) values ('${dispatch_id}', '${fee_name}', '${fee}', '${remark}');`;
  sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${id}', '应付', '${fee_name}', '${fee}');`;
  sql += `insert into container_fee (container_id, type, fee_name, amount) values ('${id}', '应收', '${fee_name}', '${fee}');`;
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
  const { select_track_no, city } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from container where city = '${city}' and order_type = '进口' and track_no in ('${select_track_no.toString().replaceAll(",", "','")}')`;
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
  let sql: string = `UPDATE container SET order_status = '${order_status}',order_time = '${order_time}',order_fee = '${order_fee}' WHERE order_type = "进口" and track_no in ('${select_track_no.toString().replaceAll(",", "','")}');`;
  sql += ` select * from container WHERE order_type = "进口" and track_no in ('${select_track_no.toString().replaceAll(",", "','")}');`
  connection.query(sql, async function (err, result) {
    if (err) {
      Logger.error(err);
    } else {
      await res.json({
        success: true,
        data: result[1],
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
  if (form.temp_status != "") { sql += " and temp_status like " + "'%" + form.temp_status + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += " and city = " + "'" + form.city + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where order_status = '已提交' ";
  if (form.arrive_time != "") { sql += " and arrive_time = " + "'" + form.arrive_time + "'" }
  if (form.ship_name != "") { sql += " and ship_name like " + "'%" + form.ship_name + "%'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  if (form.temp_status != "") { sql += " and temp_status like " + "'%" + form.temp_status + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += " and city = " + "'" + form.city + "'" }
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

// 删除箱子
const deleteContainer = async (req: Request, res: Response) => {
  const { select_container_id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `delete a,b from container as a left join container_fee as b on b.container_id = a.id WHERE a.id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
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

// 挑箱
const pickBox = async (req: Request, res: Response) => {
  const { select_container_id, actual_amount } = req.body;
  let payload = null;
  const container_status = "已挑箱";
  const temp_status = "未暂落";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', actual_amount_temp = '${actual_amount.value}', temp_status = '${temp_status}' WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  select_container_id.forEach(id => {
    sql += `insert ignore into dispatch (type, container_id,add_time) select '拆箱','${id}', make_time from container where id = '${id}';`;
  })
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
  const { select_container_id, temp_port } = req.body;
  let payload = null;
  const container_status = "已挑箱";
  const temp_status = "已暂落"
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', temp_status = '${temp_status}', temp_time = make_time, temp_port = '${temp_port}' WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  select_container_id.forEach(id => {
    sql += `insert ignore into dispatch (type, container_id,add_time) select '暂落','${id}', make_time from container where id = '${id}';`;
  })
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

// 修改船期
const arriveTime = async (req: Request, res: Response) => {
  const { select_track_no, arrive_time } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET arrive_time = '${arrive_time.value}' WHERE order_type = '进口' and track_no in ('${select_track_no.toString().replaceAll(",", "','")}')`;
  console.log(1111, sql);
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
    make_time,
    load_port,
    door,
    crossing,
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
  let sql: string = `UPDATE container SET tmp_excel_no = tmp_excel_no `;
  if (make_time != '') { sql += `,make_time = '${make_time}'`}
  if (load_port != '') { sql += `,load_port = '${load_port}'` }
  if (door != '') { sql += `,door = '${door}'` }
  if (crossing != '') { sql += `,crossing = '${crossing}'` }
  if (remark != '') { sql += `,remark = '${remark}'` }
  sql += ` WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}') and container_status = '待挑箱' and order_type = '进口';`;
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
  generateShipFee,
  importJtoy,
  lighteringStatList,
  documentCheckList,
  containerWithFeeList,
  containerList,
  getContainerFeeList,
  getDispatchFeeList,
  fixContainerInfo,
  addContainer,
  addContainerFee,
  importDocumentCheck,
  importExportContainer,
  generateExportDispatch,
  editDocumentCheck,
  deleteDocumentCheck,
  submitDocumentCheck,
  pickBoxList,
  deleteContainer,
  pickBox,
  tempDrop,
  loadPort,
  arriveTime,
  settingContainer,
  yardPriceList,
  addYardPrice,
  editYardPrice,
  deleteYardPrice
};
