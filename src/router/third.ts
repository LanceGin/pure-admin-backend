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

// 提交eir
const submitEir = async (req: Request, res: Response) => {
  const { track_no, containner_no } = req.body;
  console.log(42315321532, req.body);
  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }
  const login_data = "grant_type=password&username=fuan&password=8exXH%25K2%3DL";
  
  // At request level
  const agent = new https.Agent({
      rejectUnauthorized: false
  });
  const login_config = {
     method: 'post',
     url: 'https://esb.sipg.com.cn/ParaEsb/Token',
     headers: { 
        'sourceSystem': 'FUAN', 
        'targetSystem': 'AUTH', 
        'requestId': 'trusted-fuan', 
        'serviceName': 'S0140001A', 
        'Authorization': 'Basic dHJ1c3RlZC1mdWFuOj8pUkAyZDlfXnFDdQ==', 
        'Host': 'esb.sipg.com.cn', 
        'Connection': 'keep-alive', 
        'Content-Type': 'application/x-www-form-urlencoded'
     },
     data : login_data
  };

  axios(login_config)
    .then(response => {
      console.log(11111, response.data);
      const access_token = response.data.access_token;
      const get_eir_data = JSON.stringify({
         "despatcherCode": "000287",
         "despatcherTime": dayjs().format('YYYY-MM-DD HH:mm:ss'),
         "billNbr": track_no,
         "trustCode": "COSCO",
         "opStatus": "32"
      });
      const get_eir_config = {
         method: 'post',
         url: 'https://esb.sipg.com.cn/ParaEsb/Json/Http',
         headers: { 
            'Token': access_token, 
            'sourceSystem': 'FUAN', 
            'targetSystem': 'EIR', 
            'requestId': 'trusted-fuan', 
            'serviceName': 'S0010041A', 
            'Md5Code': '56BC7S38955R15267120A', 
            'Content-Type': 'application/json', 
            'Host': 'esb.sipg.com.cn'
         },
         data : get_eir_data
      };
      axios(get_eir_config)
        .then(response => {
          console.log(222222, response.data);
          const item_container = response.data.find(item => item.cntrNo === containner_no);
          console.log(33333, item_container);
          if (item_container == undefined) {
            res.json({
              success: false,
              data: {
                message: "未找到待派车箱号"
              },
            });
          } else {
            res.json({
              success: true,
              data: item_container,
            });
          }
        })
        .catch(error => {
          console.log(22222, error.response.data);
          res.json({
            success: false,
            data: error.response.data
          });
        });
    });
};


export {
  setInvoiceNo,
  getSino,
  submitEir
}
