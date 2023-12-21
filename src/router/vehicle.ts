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

// 获取车辆信息列表
const vehicleInfoList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from vehicle_info where id is not null ";
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.driver != "") { sql += " and driver like " + "'%" + form.driver + "%'" }
  if (form.mobile != "") { sql += " and mobile like " + "'%" + form.mobile + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_info where id is not null ";
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.driver != "") { sql += " and driver like " + "'%" + form.driver + "%'" }
  if (form.mobile != "") { sql += " and mobile like " + "'%" + form.mobile + "%'" }
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

// 新增车辆信息
const addVehicleInfo = async (req: Request, res: Response) => {
  const {
    territory,
    brand,
    car_no,
    emission,
    life,
    axles,
    owner,
    attachment,
    oil_card_owner,
    hang_board_no,
    driver,
    mobile,
    attribute,
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
  let sql: string = `insert into vehicle_info (territory,brand,car_no,emission,life,axles,owner,attachment,oil_card_owner,hang_board_no,driver,mobile,attribute,remark) values ('${territory}','${brand}','${car_no}','${emission}','${life}','${axles}','${owner}','${attachment}','${oil_card_owner}','${hang_board_no}','${driver}','${mobile}','${attribute}','${remark}')`;
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

// 修改车辆信息
const editVehicleInfo = async (req: Request, res: Response) => {
  const {
    id,
    territory,
    brand,
    car_no,
    emission,
    life,
    axles,
    owner,
    attachment,
    oil_card_owner,
    hang_board_no,
    driver,
    mobile,
    attribute,
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
  let modifySql: string = "UPDATE vehicle_info SET territory = ?,brand = ?,car_no = ?,emission = ?,life = ?,axles = ?,owner = ?,attachment = ?,oil_card_owner = ?,hang_board_no = ?,driver = ?,mobile = ?,attribute = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [territory,brand,car_no,emission,life,axles,owner,attachment,oil_card_owner,hang_board_no,driver,mobile,attribute,remark,id];
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

// 删除车辆信息
const deleteVehicleInfo = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from vehicle_info where id = '${id}'`;
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
  vehicleInfoList,
  addVehicleInfo,
  editVehicleInfo,
  deleteVehicleInfo
};




