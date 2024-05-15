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
import axios from "axios";
const https = require('https');

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

// 设置发票号
const setInvoiceNo = async (req: Request, res: Response) => {
  const { select_id, invoice_no } = req.body;
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let sql: string = `UPDATE container_fee SET invoice_no = '${invoice_no.value}' WHERE id in ('${select_id  .toString().replaceAll(",", "','")}')`;
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

// 获取中交url
const getSino = async (req: Request, res: Response) => {
  const { type } = req.body;
  console.log(111111, type);
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  let data = "";
  if (type == "pathTrack") {
    data = "cid=67f14880-43c9-4e56-9d43-1611ec224b1a&sign=8541ABF071839AEC68B0572CEAD948BD5FECECAE&type=pathTrack";
  } else if (type == "transportManage") {
    data = "cid=67f14880-43c9-4e56-9d43-1611ec224b1a&sign=03A5F45236BCB93EFD7956A8553030B589539EA1&type=transportManage";
  }
  
  // At request level
  const agent = new https.Agent({
      rejectUnauthorized: false
  });
  const config = {
    httpsAgent: agent,
    method: "post",
    url: "https://zhiyunopenapi.95155.com/save/apis/pluginUrl",
    data: data
  };

  axios(config)
    .then(response => {
      res.json({
        success: true,
        data: response.data,
      });
    });
};

export {
  setInvoiceNo,
  getSino
}
