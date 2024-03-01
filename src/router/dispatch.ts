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
  let sql: string = "select * from container where container_status in ('已挑箱','已暂落') and order_type = '进口' ";
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status in ('已挑箱','已暂落') and order_type = '进口' ";
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
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
  const { select_container_no, car_no } = req.body;
  let payload = null;
  const container_status = "运输中";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', car_no = '${car_no.value}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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

// 批量导入派车
const importDispatch = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "";
  let select_sql: string = "select * from container where containner_no in ( ";
  values.forEach((v) => {
    v[0] = formatDate(v[0], "/");
    sql += ` update container set car_no = '${v[2]}', container_status = '运输中', transport_status = '0' where containner_no = '${v[1]}' and container_status = '已挑箱';`
    select_sql += `'${v[1]}',`;
  })
  select_sql = select_sql.replace(/,$/, '') + ");";
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
  let sql: string = "select * from container where container_status in ('运输中','已完成') and order_type = '进口' and temp_status = '未暂落' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status in ('运输中','已完成') and order_type = '进口' and temp_status = '未暂落' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
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
  let modifySql: string = "UPDATE container SET car_no = ?,door = ?,temp_port = ?,make_time = ? WHERE id = ?";
  let modifyParams: string[] = [car_no,door,temp_port,make_time,id];
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
  let sql: string = "select * from container where container_status = '已完成' and order_type = '出口' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status == "已完成") { sql += " and container_status = '已完成'" }
  if (form.container_status == "未完成") { sql += " and container_status != '已完成'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status = '已完成' and order_type = '出口' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status == "已完成") { sql += " and container_status = '已完成'" }
  if (form.container_status == "未完成") { sql += " and container_status != '已完成'" }
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
  let sql: string = `insert into tmp_dispatch (door,car_no,status,transport_status) values ('${door}','${car_no}','${status}','${transport_status})'`;
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
  let sql: string = "select * from container where container_status in ('运输中','已完成') and temp_status = '已暂落' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and make_time between " + "'" + form.make_time_range[0] + "' and '" + form.make_time_range[1] + "'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status in ('运输中','已完成') and temp_status = '已暂落' ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and make_time between " + "'" + form.make_time_range[0] + "' and '" + form.make_time_range[1] + "'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status != "") { sql += " and container_status like " + "'%" + form.container_status + "%'" }
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
  let sql: string = "select * from container where container_status in ('运输中','已挑箱') and load_port in ('武汉阳逻','武汉金口') ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.load_port != "") { sql += " and load_port = " + "'" + form.load_port + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status in ('运输中','已挑箱') and load_port in ('武汉阳逻','武汉金口') ";
  if (form.make_time_range && form.make_time_range.length > 0) { sql += " and DATE_FORMAT(make_time,'%Y%m%d') between " + "DATE_FORMAT('" + form.make_time_range[0] + "','%Y%m%d') and DATE_FORMAT('" + form.make_time_range[1] + "','%Y%m%d')" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.load_port != "") { sql += " and load_port = " + "'" + form.load_port + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
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

// 暂落一键完成
const tempDropFinish = async (req: Request, res: Response) => {
  const select_container_no = req.body;
  let payload = null;
  const container_status = "待挑箱";
  const transport_status = "5";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', transport_status = '${transport_status}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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
  const select_container_no = req.body;
  let payload = null;
  const container_status = "已完成";
  const transport_status = "5";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', transport_status = '${transport_status}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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
  const select_container_no = req.body;
  let payload = null;
  const container_status = "已挑箱";
  const car_no = "";
  const transport_status = "0";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}', car_no = '${car_no}', transport_status = '${transport_status}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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
  const select_container_no = req.body;
  let payload = null;
  const container_status = "待挑箱";
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container SET container_status = '${container_status}' WHERE containner_no in ('${select_container_no.toString().replaceAll(",", "','")}')`;
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
  dispatchCar,
  importDispatch,
  importDispatchList,
  editContainerInfo,
  exportDispatchList,
  exportTmpDispatchList,
  tmpDispatchCar,
  tempDropDispatchList,
  whDispatchList,
  tempDropFinish,
  oneStepFinish,
  oneStepRevoke,
  dispatchRevoke,
};
