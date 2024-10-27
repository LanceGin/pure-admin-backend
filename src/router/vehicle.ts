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
const xlsx = require("node-xlsx");

// 获取车辆信息列表
const vehicleInfoList = async (req: Request, res: Response) => {
  const { pagination, form } = req.body;
  const page = pagination.currentPage;
  const size = pagination.pageSize;
  let payload = null;
  let total = 0;
  let pageSize = 0;
  let currentPage = 0;
  const addtime = dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = "select *, '否' as is_load from vehicle_info where id is not null ";
  if (form.territory != "") { sql += " and territory like " + "'%" + form.territory + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.driver != "") { sql += " and driver like " + "'%" + form.driver + "%'" }
  if (form.mobile != "") { sql += " and mobile like " + "'%" + form.mobile + "%'" }
  if (form.status != "" && form.status != undefined) { sql += " and status like " + "'%" + form.status + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_info where id is not null ";
  if (form.territory != "") { sql += " and territory like " + "'%" + form.territory + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.driver != "") { sql += " and driver like " + "'%" + form.driver + "%'" }
  if (form.mobile != "") { sql += " and mobile like " + "'%" + form.mobile + "%'" }
  if (form.status != "" && form.status != undefined) { sql += " and status like " + "'%" + form.status + "%'" }
  sql +=`;insert into operation_log (name, operation, addtime) values ('${form.add_by}','查看车辆信息','${addtime}');`
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

// 批量导入车辆信息列表
const importVehicleInfo = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "insert into vehicle_info (territory,brand,car_no,emission,life,axles,owner,attachment,oil_card_owner,hang_board_no,driver,mobile,attribute,remark) values ?"
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
    remark,
    status
  } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE vehicle_info SET territory = ?,brand = ?,car_no = ?,emission = ?,life = ?,axles = ?,owner = ?,attachment = ?,oil_card_owner = ?,hang_board_no = ?,driver = ?,mobile = ?,attribute = ?,remark = ?,status = ? WHERE id = ?";
  let modifyParams: string[] = [territory,brand,car_no,emission,life,axles,owner,attachment,oil_card_owner,hang_board_no,driver,mobile,attribute,remark,status,id];
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
  const addtime = dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss");
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
  sql +=`;insert into operation_log (name, operation, addtime) values ('${form.add_by}','查看驾驶员信息','${addtime}');`
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

// 批量导入司机信息列表
const importDriverInfo = async (req: Request, res: Response) => {
  const file_path = req.files[0].path;
  const sheets = xlsx.parse(file_path, {
    // cellDates: true,
    defval: ""
  });
  const values = sheets[0].data;
  values.shift();
  let sql: string = "insert into driver_info (name,id_no,mobile,attribute,settlement_company,remark) values ?"
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
  if (form.month != "") { sql += " and month = " + "'" + form.month + "'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_oil_consumption where id is not null ";
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.month != "") { sql += " and month = " + "'" + form.month + "'" }
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
    month,
    mileage,
    oil_standard,
    mileage_fix,
    actual_volume,
    total_amount,
    remark
  } = req.body;
  let payload = null;
  const volume = Math.round(Number(mileage) / 100 * Number(oil_standard) * ( 1 + Number(mileage_fix.replace("%","")) / 100));
  const delta_volume = (Number(actual_volume) - Number(volume)).toFixed(2);
  const reward_amount = Math.round(Number(delta_volume) * (-3));
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into vehicle_oil_consumption (car_no,month,mileage,oil_standard,mileage_fix,volume,actual_volume,total_amount,delta_volume,reward_amount,remark) values ('${car_no}','${month}','${mileage}','${oil_standard}','${mileage_fix}','${volume}','${actual_volume}','${total_amount}','${delta_volume}','${reward_amount}','${remark}')`;
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
    month,
    mileage,
    oil_standard,
    mileage_fix,
    actual_volume,
    total_amount,
    remark
  } = req.body;
  let payload = null;
  const volume = Math.round(Number(mileage) / 100 * Number(oil_standard) * ( 1 + Number(mileage_fix.replace("%","")) / 100));
  const delta_volume = (Number(actual_volume) - Number(volume)).toFixed(2);
  const reward_amount = Math.round(Number(delta_volume) * (-3));
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE vehicle_oil_consumption SET car_no = ?,month = ?,mileage = ?,oil_standard = ?,mileage_fix = ?,volume = ?,actual_volume = ?,total_amount = ?,delta_volume = ?,reward_amount = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [car_no,month,mileage,oil_standard,mileage_fix,volume,actual_volume,total_amount,delta_volume,reward_amount,remark,id];
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
  if (form.city != "") { sql += " and city like " + "'%" + form.city + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_refuel where id is not null ";
  if (form.addtime != "") { sql += " and addtime = " + "'" + form.addtime + "'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.type != "") { sql += " and type like " + "'%" + form.type + "%'" }
  if (form.city != "") { sql += " and city like " + "'%" + form.city + "%'" }
  sql += ";select sum(volume) as total,type from vehicle_refuel " 
  if (form.city != "") { sql += " where city like " + "'%" + form.city + "%'" }
  sql +=" group by type"
  connection.query(sql, async function (err, data) {
    if (err) {
      Logger.error(err);
    } else {
      total = data[1][0]['COUNT(*)'];
      const a = data[2];
      let remain_oil = 0;
      a.forEach((v) => {
        if(v.type == "买入" || v.type == "注销") {
          remain_oil += v.total;
        } else {
          remain_oil -= v.total;
        }
      })
      await res.json({
        success: true,
        data: { 
          list: data[0],
          total: total,
          remain_oil: remain_oil,
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
    addtime,
    volume,
    unit_price,
    type,
    remark,
    city
  } = req.body;
  let payload = null;
  const amount = volume * unit_price;
  const car = car_no.split('-')[0];
  const driver = car_no.split('-')[1];
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into vehicle_refuel (car_no,driver,addtime,volume,unit_price,type,amount,remark,city) values ('${car}','${driver}','${addtime}','${volume}','${unit_price}','${type}','${amount}','${remark}','${city}')`;
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
    addtime,
    volume,
    unit_price,
    type,
    amount,
    remark,
    city
  } = req.body;
  let payload = null;
  const car = car_no.split('-')[0];
  const driver = car_no.split('-')[1];
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let modifySql: string = "UPDATE vehicle_refuel SET car_no = ?,driver = ?,addtime = ?,volume = ?,unit_price = ?,type = ?,amount = ?,remark = ?,city = ? WHERE id = ?";
  let modifyParams: string[] = [car,driver,addtime,volume,unit_price,type,amount,remark,city,id];
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


// 获取车辆费用列表
const vehicleFeeList = async (req: Request, res: Response) => {
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
  let sql: string = "select * from vehicle_fee where id is not null ";
  if (form.add_time != "") { sql += " and add_time = " + "'" + form.add_time + "'" }
  if (form.car_fees != "") { sql += " and car_fees = " + "'" + form.car_fees + "'" }
  if (form.company != "") { sql += " and company like " + "'%" + form.company + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.hang_board_no != "") { sql += " and hang_board_no like " + "'%" + form.hang_board_no + "%'" }
  if (form.content != "") { sql += " and content like " + "'%" + form.content + "%'" }
  sql +=" order by id desc limit " + size + " offset " + size * (page - 1);
  sql +=";select COUNT(*) from vehicle_fee where id is not null ";
  if (form.add_time != "") { sql += " and add_time = " + "'" + form.add_time + "'" }
  if (form.car_fees != "") { sql += " and car_fees = " + "'" + form.car_fees + "'" }
  if (form.company != "") { sql += " and company like " + "'%" + form.company + "%'" }
  if (form.car_no != "") { sql += " and car_no like " + "'%" + form.car_no + "%'" }
  if (form.hang_board_no != "") { sql += " and hang_board_no like " + "'%" + form.hang_board_no + "%'" }
  if (form.content != "") { sql += " and content like " + "'%" + form.content + "%'" }
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

// 新增车辆费用
const addVehicleFee = async (req: Request, res: Response) => {
  const {
    is_submit,
    is_applied,
    driver,
    company,
    car_no,
    hang_board_no,
    type,
    car_fees,
    content,
    quantity,
    amount,
    allocation_month,
    allocation_start,
    actual_amount,
    tax_amount,
    settlement_confirm,
    remark,
    add_by
  } = req.body;
  let payload = null;
  const add_time = dayjs(new Date()).format("YYYY-MM-DD");
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `insert into vehicle_fee (is_submit,is_applied,add_time,driver,company,car_no,hang_board_no,type,car_fees,content,quantity,amount,allocation_month,allocation_start,actual_amount,tax_amount,settlement_confirm,remark,add_by) values ('未提交','${is_applied}','${add_time}','${driver}','${company}','${car_no}','${hang_board_no}','${type}','${car_fees}','${content}','${quantity}','${amount}','${allocation_month}','${allocation_start}','${actual_amount}','${tax_amount}','${settlement_confirm}','${remark}','${add_by}')`;
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

// 提交车辆费用
const submitVehicleFee = async (req: Request, res: Response) => {
  const {
    id,
    amount,
    actual_amount,
    tax_amount,
    add_by,
    apply_department,
    fee_name,
    company,
    type
  } = req.body;
  let payload = null;
  const add_time = dayjs(new Date()).format("YYYY-MM-DD");
  const fee_no = "FAO" + dayjs(new Date()).format("YYYYMMDD") + Math.floor(Math.random()*10000);
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `update vehicle_fee set is_submit = '已提交', is_applied = '已申请' where id in ('${id.toString().replaceAll(",", "','")}');`;
  sql += ` insert into applied_fee (is_admin,fee_name,is_pay,pay_type,apply_amount,reimburse_amount,tax_amount,acc_company_id,apply_by,apply_department,create_time,fee_no) values ('业务','${fee_name}','付','${type}','${amount}','${actual_amount}','${tax_amount}','${company}','${add_by}','${apply_department}','${add_time}','${fee_no}');`;
  sql += `select * from vehicle_fee where id in ('${id.toString().replaceAll(",", "','")}');`;
  connection.query(sql, async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let fees = [];
      let insert_sql: string = '';
      fees = JSON.parse(JSON.stringify(data[2]));
      fees.forEach(fee => {
        if (fee.allocation_month === '') {
          insert_sql += `insert into vehicle_fee_stat (vehicle_fee_id, allocation_amount, account_period) values ('${fee.id}', '${fee.amount}', DATE_FORMAT(CONVERT_TZ('${fee.add_time}','+00:00','+08:00'), '%Y-%m'));`;
        } else {
          const allocation_amount = Number(fee.amount) / Number(fee.allocation_month);
          for (let i = 0; i < fee.allocation_month; i++) {
            insert_sql += `insert into vehicle_fee_stat (vehicle_fee_id, allocation_amount, account_period) values ('${fee.id}', '${allocation_amount.toFixed(2)}', DATE_FORMAT(DATE_ADD(DATE_FORMAT(STR_TO_DATE('${fee.allocation_start}', '%Y-%m'), '%Y-%m-01'),INTERVAL ${i} MONTH), '%Y-%m'));`;
          }
        }
      })
      connection.query(insert_sql, async function (err, data) {
        if (err) {
          console.log(err);
        } else {
          await res.json({
            success: true,
            data: { message: Message[6] },
          });
        };
      })
    };
  });
};

// 修改车辆费用
const editVehicleFee = async (req: Request, res: Response) => {
  const {
    id,
    is_submit,
    driver,
    company,
    car_no,
    hang_board_no,
    type,
    car_fees,
    content,
    quantity,
    amount,
    allocation_month,
    allocation_start,
    actual_amount,
    tax_amount,
    settlement_confirm,
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
  let modifySql: string = "UPDATE vehicle_fee SET is_submit = ?,driver = ?,company = ?,car_no = ?,hang_board_no = ?,type = ?,car_fees = ?,content = ?,quantity = ?,amount = ?,allocation_month = ?,allocation_start = ?,actual_amount = ?,tax_amount = ?,settlement_confirm = ?,remark = ? WHERE id = ?";
  let modifyParams: string[] = [is_submit,driver,company,car_no,hang_board_no,type,car_fees,content,quantity,amount,allocation_month,allocation_start,actual_amount,tax_amount,settlement_confirm,remark,id];
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

// 删除车辆费用
const deleteVehicleFee = async (req: Request, res: Response) => {
  const { select_id } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `DELETE from vehicle_fee where id in ('${select_id.toString().replaceAll(",", "','")}');`;
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
  importVehicleInfo,
  editVehicleInfo,
  deleteVehicleInfo,
  driverInfoList,
  addDriverInfo,
  importDriverInfo,
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
  deleteVehicleRefuel,
  vehicleFeeList,
  addVehicleFee,
  submitVehicleFee,
  editVehicleFee,
  deleteVehicleFee
};




