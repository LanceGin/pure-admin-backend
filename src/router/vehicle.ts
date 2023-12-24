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

// 获取司机信息列表
const driverInfoList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from driver_info where id is not null ";
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
  if (form.mobile != "") { sql += " and mobile like " + "'%" + form.mobile + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from driver_info where id is not null ";
  if (form.name != "") { sql += " and name like " + "'%" + form.name + "%'" }
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

// 新增司机信息
const addDriverInfo = async (req: Request, res: Response) => {
  const {
    name,
    id_no,
    mobile,
    attribute,
    settlement_company,
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
  let sql: string = `insert into driver_info (name,id_no,mobile,attribute,settlement_company,remark) values ('${name}','${id_no}','${mobile}','${attribute}','${settlement_company}','${remark}')`;
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

// 修改司机信息
const editDriverInfo = async (req: Request, res: Response) => {
  const {
    id,
    name,
    id_no,
    mobile,
    attribute,
    settlement_company,
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
  let modifySql: string = "UPDATE driver_info SET name = ?,id_no = ?,mobile = ?,attribute = ?,settlement_company = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [name,id_no,mobile,attribute,settlement_company,remark,id];
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

// 删除司机信息
const deleteDriverInfo = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from driver_info where id = '${id}'`;
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

// 获取车辆额外信息列表
const vehicleExtraInfoList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from vehicle_extra_info where id is not null ";
  if (form.company != "") { sql += " and company like " + "'%" + form.company + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_extra_info where id is not null ";
  if (form.company != "") { sql += " and company like " + "'%" + form.company + "%'" }
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

// 新增车辆额外信息
const addVehicleExtraInfo = async (req: Request, res: Response) => {
  const {
    car_no,
    company,
    inspect,
    rate,
    compulsory_insurance,
    commercial_insurance,
    trans_insurance,
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
  let sql: string = `insert into vehicle_extra_info (car_no,company,inspect,rate,compulsory_insurance,commercial_insurance,trans_insurance,remark) values ('${car_no}','${company}','${inspect}','${rate}','${compulsory_insurance}','${commercial_insurance}','${trans_insurance}','${remark}')`;
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

// 修改车辆额外信息
const editVehicleExtraInfo = async (req: Request, res: Response) => {
  const {
    id,
    car_no,
    company,
    inspect,
    rate,
    compulsory_insurance,
    commercial_insurance,
    trans_insurance,
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
  let modifySql: string = "UPDATE vehicle_extra_info SET car_no = ?,company = ?,inspect = ?,rate = ?,compulsory_insurance = ?,commercial_insurance = ?,trans_insurance = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [car_no,company,inspect,rate,compulsory_insurance,commercial_insurance,trans_insurance,remark,id];
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

// 删除车辆额外信息
const deleteVehicleExtraInfo = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from vehicle_extra_info where id = '${id}'`;
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

// 获取油耗核算列表
const oilConsumptionList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from vehicle_oil_consumption where id is not null ";
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_oil_consumption where id is not null ";
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

// 新增油耗核算
const addOilConsumption = async (req: Request, res: Response) => {
  const {
    car_no,
    mileage_6m,
    oil_standard,
    mileage_fix,
    volume,
    unit_price,
    amount,
    actual_volume,
    total_amount,
    delta_volume,
    reward_amount
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into vehicle_oil_consumption (car_no,mileage_6m,oil_standard,mileage_fix,volume,unit_price,amount,actual_volume,total_amount,delta_volume,reward_amount) values ('${car_no}','${mileage_6m}','${oil_standard}','${mileage_fix}','${volume}','${unit_price}','${amount}','${actual_volume}','${total_amount}','${delta_volume}','${reward_amount}')`;
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

// 修改油耗核算
const editOilConsumption = async (req: Request, res: Response) => {
  const {
    id,
    car_no,
    mileage_6m,
    oil_standard,
    mileage_fix,
    volume,
    unit_price,
    amount,
    actual_volume,
    total_amount,
    delta_volume,
    reward_amount
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE vehicle_oil_consumption SET car_no = ?,mileage_6m = ?,oil_standard = ?,mileage_fix = ?,volume = ?,unit_price = ?,amount = ?,actual_volume = ?,total_amount = ?,delta_volume = ?,reward_amount = ? WHERE id = ?";
  let modifyParams: string[] = [car_no,mileage_6m,oil_standard,mileage_fix,volume,unit_price,amount,actual_volume,total_amount,delta_volume,reward_amount,id];
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

// 删除油耗核算
const deleteOilConsumption = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from vehicle_oil_consumption where id = '${id}'`;
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

// 获取撬装加油列表
const vehicleRefuelList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from vehicle_refuel where id is not null ";
  if (form.addtime != "") { sql += " and addtime = " + "'" + form.addtime + "'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_refuel where id is not null ";
  if (form.addtime != "") { sql += " and addtime = " + "'" + form.addtime + "'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
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

// 新增撬装加油
const addVehicleRefuel = async (req: Request, res: Response) => {
  const {
    car_no,
    driver,
    addtime,
    volume,
    unit_price,
    type,
    amount,
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
  let sql: string = `insert into vehicle_refuel (car_no,driver,addtime,volume,unit_price,type,amount,remark) values ('${car_no}','${driver}','${addtime}','${volume}','${unit_price}','${type}','${amount}','${remark}')`;
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

// 修改撬装加油
const editVehicleRefuel = async (req: Request, res: Response) => {
  const {
    id,
    car_no,
    driver,
    addtime,
    volume,
    unit_price,
    type,
    amount,
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
  let modifySql: string = "UPDATE vehicle_refuel SET car_no = ?,driver = ?,addtime = ?,volume = ?,unit_price = ?,type = ?,amount = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [car_no,driver,addtime,volume,unit_price,type,amount,remark,id];
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

// 删除撬装加油
const deleteVehicleRefuel = async (req: Request, res: Response) => {
  const id = req.body.id;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from vehicle_refuel where id = '${id}'`;
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
  deleteVehicleInfo,
  driverInfoList,
  addDriverInfo,
  editDriverInfo,
  deleteDriverInfo,
  vehicleExtraInfoList,
  addVehicleExtraInfo,
  editVehicleExtraInfo,
  deleteVehicleExtraInfo,
  oilConsumptionList,
  addOilConsumption,
  editOilConsumption,
  deleteOilConsumption,
  vehicleRefuelList,
  addVehicleRefuel,
  editVehicleRefuel,
  deleteVehicleRefuel
};




