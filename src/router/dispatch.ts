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

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

// 获取拆箱列表
const unpackingList = async (req: Request, res: Response) => {
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
  let sql: string = "select a.id as dispatch_id, a.type, a.status, b.* from dispatch as a left join container as b on b.id = a.container_id where a.type in ('拆箱','暂落') and a.status = '未派车' ";
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from dispatch as a left join container as b on b.id = a.container_id where a.type in ('拆箱','暂落') and a.status = '未派车' ";
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
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

// 派车
const dispatchCar = async (req: Request, res: Response) => {
  const { select_container_id, select_dispatch_id, car_no } = req.body;
  let payload = null;
  const container_status = "运输中";
  const dispatch_status = "已派车";
  const trans_status = "已执行";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', car_no = '${car_no}' WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE dispatch SET status = '${dispatch_status}', trans_status = '${trans_status}', car_no = '${car_no}' WHERE id in ('${select_dispatch_id.toString().replaceAll(",", "','")}')`
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

// 一键生成派车表
const generateDispatch = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let total = 0;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = " select * from (select a.id as dispatch_id, a.type, a.status, b.make_time, b.containner_no, c.car_no, b.door from dispatch as a left join container as b on b.id = a.container_id  join vehicle_info as c  where a.type in ('拆箱','暂落') and a.status = '未派车' and c.status = '正常' and c.attribute in ('自营','自有','租车','个体','供应商')";
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}') and c.territory in ('${form.city.split(",").toString().replaceAll(",", "','")}') ` }
  sql +=" ORDER BY RAND()) as t GROUP BY t.containner_no;select COUNT(*) from dispatch as a left join container as b on b.id = a.container_id where a.type in ('拆箱','暂落') and a.status = '未派车' ";
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

// 批量导入派车
const importDispatch = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, {
    cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "";
  let select_sql: string = "select * from container where containner_no in ( ";
  values.forEach((v) => {
    sql += ` update container set make_time = STR_TO_DATE(DATE_FORMAT(make_time,'%Y-%m-%d ${dayjs(v[0]).hour()}:${dayjs(v[0]).minute()}:%s'),'%Y-%m-%d %H:%i:%s'), car_no = '${v[2]}', container_status = '运输中', transport_status = '0' where containner_no = '${v[1]}' and container_status = '已挑箱';`
    select_sql += `'${v[1]}',`;
  })
  select_sql = select_sql.replace(/,$/, '') + ") and order_type = '进口' and container_status = '运输中';";
  connection.query(sql, function (err, data) {
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

// 根据箱子数据更新派车单
const generateDispatchWithContainer = async (req: Request, res: Response) => {
  console.log("更新派车单");
  const { select_container } = req.body;
  let payload = null;
  const status = '已派车';
  const trans_status = '已执行';
  const add_time = dayjs(new Date()).format("YYYY-MM-DD HH:MM:SS");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = ``;
  select_container.forEach(container => {
    sql += `update dispatch set car_no = '${container.car_no}', status = '${status}', trans_status = '${trans_status}' where container_id = '${container.id}' and status = '未派车';`
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

// 获取进口派车列表
const importDispatchList = async (req: Request, res: Response) => {
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
  let sql: string = "select a.id as dispatch_id, a.type, a.status, a.car_no as dispatch_car_no, b.receipt_no, c.driver, c.mobile, d.id_no, a.trans_status, a.add_time as op_time, b.* from dispatch as a left join container as b on b.id = a.container_id left join (select * from vehicle_info group by car_no) as c on c.car_no = a.car_no left join driver_info as d on d.mobile = c.mobile where a.type = '拆箱' and a.status = '已派车' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(b.make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and b.container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  if (form.trans_status != "") { sql += " and a.trans_status like " + "'%" + form.trans_status + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from dispatch as a left join container as b on b.id = a.container_id where a.type = '拆箱' and a.status = '已派车' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(b.make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and b.container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  if (form.trans_status != "") { sql += " and a.trans_status like " + "'%" + form.trans_status + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
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

// 修改进口派车箱信息
const editContainerInfo = async (req: Request, res: Response) => {
  const {
    id,
    car_no,
    door,
    temp_port,
    make_time,
    temp_time,
    type
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = ``;
  if (type == "拆箱") {
    sql += `update dispatch as a left join container as b on b.id = a.container_id SET a.car_no = '${car_no}', a.add_time = '${make_time}', b.car_no = '${car_no}', b.door = '${door}', b.make_time = '${make_time}' WHERE b.id = '${id}' and a.type = '拆箱';`;
  } else {
    sql += `update dispatch as a left join container as b on b.id = a.container_id SET a.car_no = '${car_no}', a.add_time = '${temp_time}', b.car_no = '${car_no}', b.temp_port = '${temp_port}', b.temp_time = '${temp_time}' WHERE b.id = '${id}' and a.type = '暂落';`;
  }
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

// 获取出口派车列表
const exportDispatchList = async (req: Request, res: Response) => {
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
  let sql: string = "select a.id as dispatch_id, a.type, a.status, a.car_no as dispatch_car_no, a.trans_status, b.* from dispatch as a left join container as b on b.id = a.container_id where a.type = '装箱' and a.status = '已派车' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(b.make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status != "") { sql += " and b.container_status like " + "'%" + form.container_status + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from dispatch as a left join container as b on b.id = a.container_id where a.type = '装箱' and a.status = '已派车' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(b.make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status != "") { sql += " and b.container_status like " + "'%" + form.container_status + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
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

// 获取临时出口派车单
const exportTmpDispatchList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from tmp_dispatch where id is not null ";
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from tmp_dispatch where id is not null ";
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
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

// 临时出口派车
const tmpDispatchCar = async (req: Request, res: Response) => {
  const {
    car_no,
    door,
  } = req.body;
  let payload = null;
  let status = "已派车"
  let transport_status = "0";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into tmp_dispatch (door,car_no,status,transport_status) values ('${door}','${car_no}','${status}','${transport_status}');`;
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

// 获取暂落派车列表
const tempDropDispatchList = async (req: Request, res: Response) => {
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
  let sql: string = "select a.id as dispatch_id, a.type, a.status, a.car_no as dispatch_car_no,b.receipt_no, c.driver, c.mobile, d.id_no, a.trans_status, a.add_time as op_time, b.* from dispatch as a left join container as b on b.id = a.container_id left join (select * from vehicle_info WHERE id in  (SELECT max(id) as id FROM vehicle_info GROUP BY car_no)) as c on c.car_no = a.car_no left join driver_info as d on d.mobile = c.mobile where a.type = '暂落' and a.status = '已派车' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(a.add_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and b.container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  if (form.trans_status != "") { sql += " and a.trans_status like " + "'%" + form.trans_status + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from dispatch as a left join container as b on b.id = a.container_id where a.type = '暂落' and a.status = '已派车' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(a.add_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and b.track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and b.container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  if (form.trans_status != "") { sql += " and a.trans_status like " + "'%" + form.trans_status + "%'" }
  if (form.city != "" && form.city != "管理员") { sql += ` and b.city in ('${form.city.split(",").toString().replaceAll(",", "','")}')` }
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

// 获取武汉派车列表
const whDispatchList = async (req: Request, res: Response) => {
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
  let sql: string = "select a.id as dispatch_id,a.type,a.status,a.car_no as dispatch_car_no, a.trans_status,a.export_seal_no,a.export_port,a.remark as dispatch_remark, b.* from dispatch as a left join container as b on b.id = a.container_id where b.city = '武汉' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and b.make_time between " + "DATE_FORMAT(CONVERT_TZ('" + form.make_time_range[0] + "','+00:00','+8:00'),'%Y-%m-%d %H:%i:%s') and DATE_FORMAT(CONVERT_TZ('" + form.make_time_range[1] + "','+00:00','+8:00'),'%Y-%m-%d %H:%i:%s')" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.load_port != "") { sql += " and b.load_port like " + "'%" + form.load_port + "%'" }
  if (form.unload_port != "" && form.unload_port != "空白") { sql += " and b.unload_port like " + "'%" + form.unload_port + "%'" }
  if (form.unload_port == "空白") { sql += " and IFNULL(b.unload_port, '') = ''" }
  if (form.type == "装箱") { sql += " and b.seal_no not in  (select export_seal_no from dispatch where export_seal_no is not null and export_seal_no != '') and a.export_seal_no != '' and a.export_seal_no is not NULL and a.export_port != '' and a.export_port is not NULL" }
  if (form.type == "拆箱") { sql += " and (a.export_seal_no = '' or a.export_seal_no is NULL) and (a.export_port = '' or a.export_port is NULL)" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by b.order_type desc, b.door, b.make_time asc, FIELD(b.crossing,'GA','BS','PT','CSS4','RESS','NGC','SGE','SGE-LCM','CSS','CSS-LCM','CVG','CVG-LCM','NGADK01','NPGA','NPBS') limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from (select b.* from dispatch as a left join container as b on b.id = a.container_id where b.city = '武汉' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and b.make_time between " + "DATE_FORMAT(CONVERT_TZ('" + form.make_time_range[0] + "','+00:00','+8:00'),'%Y-%m-%d %H:%i:%s') and DATE_FORMAT(CONVERT_TZ('" + form.make_time_range[1] + "','+00:00','+8:00'),'%Y-%m-%d %H:%i:%s')" }
  if (form.door != "") { sql += " and b.door like " + "'%" + form.door + "%'" }
  if (form.load_port != "") { sql += " and b.load_port like " + "'%" + form.load_port + "%'" }
  if (form.unload_port != "" && form.unload_port != "空白") { sql += " and b.unload_port like " + "'%" + form.unload_port + "%'" }
  if (form.unload_port == "空白") { sql += " and IFNULL(b.unload_port, '') = ''" }
  if (form.type == "装箱") { sql += " and b.seal_no not in  (select export_seal_no from dispatch where export_seal_no is not null and export_seal_no != '') and a.export_seal_no != '' and a.export_seal_no is not NULL and a.export_port != '' and a.export_port is not NULL" }
  if (form.type == "拆箱") { sql += " and (a.export_seal_no = '' or a.export_seal_no is NULL) and (a.export_port = '' or a.export_port is NULL)" }
  if (form.containner_no != "") {
    const select_container_no = form.containner_no.split(/\r\n|\r|\n/);
    sql += ` and b.containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
  }
  if (form.car_no != "") { sql += " and a.car_no like " + "'%" + form.car_no + "%'" }
  sql += " ) as t;"
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

// 编辑武汉装箱信息
const editWhExport = async (req: Request, res: Response) => {
  const {
    id,
    customer,
    container_type,
    dispatch_id,
    load_port,
    unload_port,
    export_seal_no,
    export_port,
    dispatch_remark
  } = req.body;
  let payload = null;
  let ba_fee;
  if (container_type.substring(0,2) === "40") {
    ba_fee = 75;
  } else if (container_type.substring(0,2) === "20") {
    ba_fee = 50
  }
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update container as a left join dispatch as b on b.container_id = a.id set a.unload_port = '${unload_port}', b.export_seal_no = '${export_seal_no}', b.export_port = '${export_port}', b.remark = '${dispatch_remark}' where b.id = '${dispatch_id}';`
  if (customer == "海通") {
    sql += `insert into container_fee (container_id, type, fee_name, amount) select '${id}', '应收', '上下车费', '${ba_fee}' from dual WHERE NOT EXISTS (select * from container_fee where container_id = '${id}' and type = '应收' and fee_name = '上下车费');`;
  } else {
    sql += `insert into container_fee (container_id, type, fee_name, amount) select '${id}', '应收', '上下车费', '0' from dual WHERE NOT EXISTS (select * from container_fee where container_id = '${id}' and type = '应收' and fee_name = '上下车费');`;
  }
  if (export_port == "" && export_seal_no == "" && unload_port == "武汉阳逻" && load_port == "武汉阳逻") {
    sql += `insert into container_fee (container_id, type, fee_name, amount) select '${id}', '应付', '上下车费', '${ba_fee}' from dual WHERE NOT EXISTS (select * from container_fee where container_id = '${id}' and type = '应付' and fee_name = '上下车费');`;
  } else {
    sql += `insert into container_fee (container_id, type, fee_name, amount) select '${id}', '应付', '上下车费', '0' from dual WHERE NOT EXISTS (select * from container_fee where container_id = '${id}' and type = '应付' and fee_name = '上下车费');`;
  }
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


// 暂落一键完成
const tempDropFinish = async (req: Request, res: Response) => {
  const select_container_no = req.body;
  let payload = null;
  const container_status = "待挑箱";
  const trans_status = "已完成";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}' WHERE id in ('${select_container_no.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE dispatch SET trans_status = '${trans_status}' WHERE type = '暂落' and container_id in ('${select_container_no.toString().replaceAll(",", "','")}');`;
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


// 一键完成
const oneStepFinish = async (req: Request, res: Response) => {
  const select_container_id = req.body;
  let payload = null;
  const container_status = "已完成";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}' WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE dispatch SET trans_status = '${container_status}' WHERE type = '拆箱' and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
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

// 一键放空
const oneStepEmpty = async (req: Request, res: Response) => {
  const select_container_id = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee SET dispatch_type = '放空' WHERE dispatch_type = '拆箱' and (fee_name = '计划费' or fee_name = '堆存费') and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE container_fee SET dispatch_type = '放空', fee_name = '放空费', amount = '200' WHERE dispatch_type = '拆箱' and fee_name = '拖车费' and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE dispatch SET type = '放空', trans_status = '已完成' WHERE type = '拆箱' and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE container SET container_status = '待挑箱' WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
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

// 一键撤回
const oneStepRevoke = async (req: Request, res: Response) => {
  const {
    type,
    select_container_id
  } = req.body;
  let payload = null;
  const container_status = "已挑箱";
  const status = "未派车";
  const car_no = "";
  const trans_status = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}' WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `UPDATE dispatch SET status = '${status}', car_no = '${car_no}', trans_status = ${trans_status} WHERE type = '${type}' and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `delete from container_fee where fee_name = '拖车费' and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
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

// 派车撤回
const dispatchRevoke = async (req: Request, res: Response) => {
  const select_container_id = req.body;
  let payload = null;
  const container_status = "待挑箱";
  const temp = null;
  const temp_status = "未暂落";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', temp_status = '${temp_status}', temp_port = ${temp}, temp_time = ${temp} WHERE id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `delete from dispatch where (trans_status != '已完成' or trans_status is null) and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
  sql += `delete from container_fee where fee_name in ('计划费', '堆存费') and container_id in ('${select_container_id.toString().replaceAll(",", "','")}');`;
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



export {
  unpackingList,
  generateDispatch,
  dispatchCar,
  importDispatch,
  generateDispatchWithContainer,
  importDispatchList,
  editContainerInfo,
  exportDispatchList,
  exportTmpDispatchList,
  tmpDispatchCar,
  tempDropDispatchList,
  whDispatchList,
  editWhExport,
  tempDropFinish,
  oneStepFinish,
  oneStepEmpty,
  oneStepRevoke,
  dispatchRevoke,
};
