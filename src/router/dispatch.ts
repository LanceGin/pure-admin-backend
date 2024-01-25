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
  let sql: string = "select * from container where container_status = '运输中' and order_type = '进口' ";
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status = '运输中' and order_type = '进口' ";
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
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

// 修改进口派车箱信息
const editContainerInfo = async (req: Request, res: Response) => {
  const {
    id,
    car_no,
    door,
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
  let modifySql: string = "UPDATE container SET car_no = ?,door = ?,make_time = ? WHERE id = ?";
  let modifyParams: string[] = [car_no,door,make_time,id];
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
  if (form.make_time != "") { sql += " and date_format(make_time,'%Y-%m-%d') = " + "'" + form.make_time + "'" }
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.container_status == "已完成") { sql += " and container_status = '已完成'" }
  if (form.container_status == "未完成") { sql += " and container_status != '已完成'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status = '已完成' and order_type = '出口' ";
  if (form.make_time != "") { sql += " and date_format(make_time,'%Y-%m-%d') = " + "'" + form.make_time + "'" }
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
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into tmp_dispatch (door,car_no,status) values ('${door}','${car_no}','${status}')`;
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
  let sql: string = "select * from container where container_status = '运输中' and temp_status = '已暂落' ";
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
  if (form.containner_no != "") { sql += " and containner_no like " + "'%" + form.containner_no + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from container where container_status = '运输中' and temp_status = '已暂落' ";
  if (form.track_no != "") { sql += " and track_no like " + "'%" + form.track_no + "%'" }
  if (form.door != "") { sql += " and door like " + "'%" + form.door + "%'" }
  if (form.container_type != "") { sql += " and container_type = " + "'" + form.container_type + "'" }
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

export {
  unpackingList,
  dispatchCar,
  importDispatchList,
  editContainerInfo,
  exportDispatchList,
  exportTmpDispatchList,
  tmpDispatchCar,
  tempDropDispatchList,
};
