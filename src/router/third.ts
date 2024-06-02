import * as fs from "fs";
import secret from "../config";
import * as mysql from "mysql2";
import * as jwt from "jsonwebtoken";
import { createHash } from "crypto";
import Logger from "../loaders/logger";
import { Message } from "../utils/enums";
import getFormatDate from "../utils/date";
import { connection } from "../utils/mysql";
import { renameFileWithoutExtension } from "../utils/utils";
import { Request, Response } from "express";
import * as dayjs from "dayjs";
import axios from "axios";
const https = require('https');
const OSS = require('ali-oss');
const path=require("path")

const utils = require("@pureadmin/utils");
const xlsx = require("node-xlsx");

// 上传水单
const uploadReciept = async (req: Request, res: Response) => {
  const { reciept_name, select_id } = req.body;
  const file = req.files[0];
  const upload_name = renameFileWithoutExtension(file.originalname, reciept_name);

  // 初始化OSS客户端。请将以下参数替换为您自己的配置信息。
  const client = new OSS({
    region: 'oss-cn-hangzhou', // 示例：'oss-cn-hangzhou'，填写Bucket所在地域。
    accessKeyId: process.env.OSS_ACCESS_KEY_ID, // 确保已设置环境变量OSS_ACCESS_KEY_ID。
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, // 确保已设置环境变量OSS_ACCESS_KEY_SECRET。
    bucket: 'howhan-e', // 示例：'my-bucket-name'，填写存储空间名称。
  });

  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }

  // 自定义请求头
  const headers = {
    // 指定Object的存储类型。
    'x-oss-storage-class': 'Standard',
    // 指定Object的访问权限。
    'x-oss-object-acl': 'private',
    // 通过文件URL访问文件时，指定以附件形式下载文件，下载后的文件名称定义为example.txt。
    'Content-Disposition': `attachment; filename="${upload_name}"`,
    // 设置Object的标签，可同时设置多个标签。
    'x-oss-tagging': 'Tag1=1&Tag2=2',
    // 指定PutObject操作时是否覆盖同名目标Object。此处设置为true，表示禁止覆盖同名Object。
    'x-oss-forbid-overwrite': 'false',
  };

  try {
    // 填写OSS文件完整路径和本地文件的完整路径。OSS文件完整路径中不能包含Bucket名称。
    // 如果本地文件的完整路径中未指定本地路径，则默认从示例程序所属项目对应本地路径中上传文件。
    const result = await client.put(upload_name, path.normalize(file.path)
    // 自定义headers
    ,{headers}
    );
    let modifySql: string = `UPDATE applied_fee SET reciept_url=? WHERE id = ?;`;
    let modifyParams: string[] = [upload_name,select_id];
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
  } catch (e) {
    res.json({
      success: false
    })
  }
};

// 查看水单
const showReciept = async (req: Request, res: Response) => {
  const { reciept_url } = req.body;

  // 初始化OSS客户端。请将以下参数替换为您自己的配置信息。
  const client = new OSS({
    region: 'oss-cn-hangzhou', // 示例：'oss-cn-hangzhou'，填写Bucket所在地域。
    accessKeyId: process.env.OSS_ACCESS_KEY_ID, // 确保已设置环境变量OSS_ACCESS_KEY_ID。
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, // 确保已设置环境变量OSS_ACCESS_KEY_SECRET。
    bucket: 'howhan-e', // 示例：'my-bucket-name'，填写存储空间名称。
  });

  let payload = null;
  try {
    const authorizationHeader = req.get("Authorization") as string;
    const accessToken = authorizationHeader.substr("Bearer ".length);
    payload = jwt.verify(accessToken, secret.jwtSecret);
  } catch (error) {
    return res.status(401).end();
  }

  res.json({
    success: true,
    data: {
      result: client.signatureUrl(reciept_url)
    }
  })
}

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
  const { track_no, containner_no, dispatch_car_no, driver, mobile, id_no } = req.body;
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
          const item_container = response.data.find(item => item.cntrNo === containner_no);
          console.log(8888, item_container);
          if (item_container == undefined) {
            res.json({
              success: false,
              data: {
                result: `未找到EIR信息`
              },
            });
          } else {
            const receipt_no = item_container.receiptNo
            console.log(999999999, receipt_no);
            const push_eir_data = JSON.stringify({
               "despatcherCode": "000287",
               "despatcherTime": dayjs().format('YYYY-MM-DD HH:mm:ss'),
               "receiptNo": receipt_no,
               "truckNo": dispatch_car_no,
               "empName": driver,
               "empPersonId": id_no,
               "empTel": mobile,
               "confDesc": "E物流",
               "confUserName": "富安",
               "delivToStr": "Shanghai",
               "regionCode": "310115",
               "opType": "1"
            });
            const push_eir_config = {
              method: 'post',
              url: 'https://esb.sipg.com.cn/ParaEsb/Json/Http',
              headers: { 
                 'Token': access_token, 
                 'sourceSystem': 'FUAN', 
                 'targetSystem': 'EIR', 
                 'requestId': 'trusted-fuan', 
                 'serviceName': 'S0010013A', 
                 'Md5Code': '56BC7S38955R15267120A', 
                 'Content-Type': 'application/json', 
                 'Host': 'esb.sipg.com.cn', 
                 'Connection': 'keep-alive', 
              },
              data : push_eir_data
            };
            axios(push_eir_config)
              .then(response => {
                res.json({
                  success: true,
                  data: response.data,
                });
              })
              .catch(error => {
                console.log(3333, error.response.data);
                res.json({
                  success: false,
                  data: error.response.data
                });
              })
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
  uploadReciept,
  showReciept,
  getSino,
  submitEir
}
