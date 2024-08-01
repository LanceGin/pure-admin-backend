import app from "./app";
// import * as open from "open";
import config from "./config";
const jsSHA = require('jssha');
import * as dayjs from "dayjs";
import * as multer from "multer";
import { user } from "./models/mysql";
import Logger from "./loaders/logger";
import { queryTable } from "./utils/mysql";
const expressSwagger = require("express-swagger-generator")(app);
expressSwagger(config.options);

// queryTable(user);

import {
  uploadReciept,
  showReciept,
  deleteReciept,
  getSino,
  syncEir,
  submitEir,
  transferEir
} from "./router/third";

import {
  login,
  userList,
  addUser,
  deleteUser,
  editUser,
  authUser,
  clockPointList,
  addClockPoint,
  deleteClockPoint,
  editClockPoint,
  wxClockList,
  motorcadeList,
  addMotorcade,
  deleteMotorcade,
  editMotorcade,
  shipCompanyList,
  addShipCompany,
  deleteShipCompany,
  editShipCompany,
  yardList,
  addYard,
  deleteYard,
  editYard,
  feeCollectionList,
  addFeeCollection,
  deleteFeeCollection,
  editFeeCollection,
  bulkCargoList,
  addBulkCargo,
  importShipping,
  generateShippingFee,
  deleteShippingFee,
  generateLandingFee,
  deleteLandingFee,
  generateBulkFee,
  deleteBulkFee,
  deleteBulkCargo,
  editBulkCargo,
  lighteringList,
  doorPriceList,
  addDoorPrice,
  deleteDoorPrice,
  editDoorPrice,
  projectFeeList,
  addProjectFee,
  deleteProjectFee,
  editProjectFee,
  updateList,
  deleteList,
  searchPage,
  searchVague,
  upload,
  captcha,
} from "./router/http";

import {
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
  addExportContainer,
  addContainerFee,
  deleteContainerFee,
  importDocumentCheck,
  deleteDocumentCheck,
  importExportContainer,
  generateExportDispatch,
  submitDocumentCheck,
  pickBoxList,
  deleteContainer,
  pickBox,
  tempDrop,
  loadPort,
  planTime,
  arriveTime,
  settingContainer,
  yardPriceList,
  addYardPrice,
  editYardPrice,
  deleteYardPrice
} from "./router/operation";

import {
  unpackingList,
  dispatchCar,
  importDispatch,
  generateDispatchWithContainer,
  importDispatchList,
  editContainerInfo,
  exportDispatchList,
  exportTmpDispatchList,
  tmpDispatchCar,
  tempDropDispatchList,
  tempDropFinish,
  whDispatchList,
  editWhExport,
  oneStepFinish,
  oneStepEmpty,
  oneStepRevoke,
  dispatchRevoke,
} from "./router/dispatch";

import {
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
  deleteVehicleFee,
} from "./router/vehicle";

import {
  operationLogList,
  accCompanyList,
  addAccCompany,
  editAccCompany,
  deleteAccCompany,
  reportList,
  addReport,
  editReport,
  submitReport,
  deleteReport,
  contractList,
  addContract,
  editContract,
  deleteContract,
  appliedFeeList,
  addAppliedFee,
  editAppliedFee,
  deleteAppliedFee,
  submitAppliedFee,
  revokeAppliedFee,
} from "./router/daily";

import {
  keepAppliedFee,
  cancelKeepAppliedFee,
  generateContainerFee,
  generateOrderFee,
  generatePlanningFee,
  updatePlanningFee,
  generateStorageFee,
  generateDispatchFee,
  updateDispatchFee,
  generateAbnormalFee,
  financeCheckList,
  financeStatList,
  invoicetList,
  addInvoice,
  editInvoice,
  deleteInvoice,
  setReceiptTime,
  importInvoice,
  payInvoicetList,
  selectPayInvoicetList,
  payInvoicetOrigList,
  addPayInvoice,
  editPayInvoice,
  deletePayInvoice,
  registerPayInvoice,
  importPayInvoice,
  collectionContainerList,
  approveCollection,
  rejectCollection,
  approvePay,
  rejectPay,
  feeNameList,
  addFeeName,
  deleteFeeName,
  editFeeName
} from "./router/finance";

import {
  containerFeeList,
  confirmContainerFee,
  revokeContainerFee,
  submitContainerFee,
  setInvoiceNo,
  setAmount,
  setRemark,
  importDoorPrice,
  dataCheckCollection,
  dataCheckPay,
  vehicleFeeStatList,
  dispatchStatList,
  lighteringPriceList,
  addLighteringPrice,
  deleteLighteringPrice,
  editLighteringPrice,
  landPriceList,
  addLandPrice,
  deleteLandPrice,
  editLandPrice,
  bulkPriceList,
  addBulkPrice,
  deleteBulkPrice,
  editBulkPrice
} from "./router/statics";

// 新建存放临时文件的文件夹
const upload_tmp = multer({
  dest: "upload_tmp/",
  fileFilter(req, file, callback) {
    // 解决中文名乱码的问题
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    callback(null, true);
  },
});

const wx_config ={ 
   
    token:'token', //token需要自己定义 例如：HTML0907
    appID:'wxa3bd242efa9ea799', //填写开发公众号的AppID
    appsecret:'354323eef870f3a9a732dfdc0be9c914', //填写开发公众号的appsecret
    EncodingAESKey:'EncodingAESKey' //填写开发公众号的EncodingAESKey
}

// 微信配置
app.get('/wechat',function(req,res,next){ 
   
    const { token } = wx_config;
      //1.处理微信请求所带参数 signature（微信加密签名）、timestamp（时间戳）、 nonce（随机数）、echostr （随机字符串）；
    var signature = req.query.signature,//微信加密签名
      timestamp = req.query.timestamp,//时间戳
      nonce = req.query.nonce,//随机数
      echostr = req.query.echostr;//随机字符串
      //2.将token、timestamp、nonce三个参数进行字典序排序
      var array = [token,timestamp,nonce];
      array.sort();
      //3.将三个参数字符串拼接成一个字符串进行sha1加密
      var tempStr = array.join('');
      var shaObj = new jsSHA('SHA-1', 'TEXT');
      shaObj.update(tempStr);
      var scyptoString=shaObj.getHash('HEX');
       //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
      console.log(11111, signature, scyptoString);
      if(signature === scyptoString){ 
   
          res.send(echostr);
      }else{ 
   
          res.send('error');
      }
})
// 三方接口
// 上传水单
app.post("/uploadReciept", upload_tmp.any(), (req, res) => {
  uploadReciept(req, res);
});
// 查看水单
app.post("/showReciept", (req, res) => {
  showReciept(req, res);
});
// 删除水单
app.post("/deleteReciept", (req, res) => {
  deleteReciept(req, res);
});
// 获取中交地址
app.post("/getSino", (req, res) => {
  getSino(req, res);
});
// 同步eir
app.post("/syncEir", (req, res) => {
  syncEir(req, res);
});
// 提交eir
app.post("/submitEir", (req, res) => {
  submitEir(req, res);
});
// eir转单
app.post("/transferEir", (req, res) => {
  transferEir(req, res);
});
// 登录管理
// 登录管理 - 登录接口
app.post("/login", (req, res) => {
  login(req, res);
});
// 人事行政管理
// 人事行政管理 - 员工列表接口
app.post("/userList", (req, res) => {
  userList(req, res);
})
// 人事行政管理 - 添加员工接口
app.post("/addUser", (req, res) => {
  addUser(req, res);
})
// 人事行政管理 - 删除员工接口
app.post("/deleteUser", (req, res) => {
  deleteUser(req, res);
})
// 人事行政管理 - 编辑员工信息接口
app.post("/editUser", (req, res) => {
  editUser(req, res);
})
// 人事行政管理 - 设置权限接口
app.post("/authUser", (req, res) => {
  authUser(req, res);
})
// 人事行政管理 - 打卡点列表接口
app.post("/clockPointList", (req, res) => {
  clockPointList(req, res);
})
// 人事行政管理 - 添加打卡点接口
app.post("/addClockPoint", (req, res) => {
  addClockPoint(req, res);
})
// 人事行政管理 - 删除打卡点接口
app.post("/deleteClockPoint", (req, res) => {
  deleteClockPoint(req, res);
})
// 人事行政管理 - 编辑打卡点信息接口
app.post("/editClockPoint", (req, res) => {
  editClockPoint(req, res);
})
// 人事行政管理 - 微信打卡记录接口
app.post("/wxClockList", (req, res) => {
  wxClockList(req, res);
})
// 运作管理
// 运作管理 - 客户列表接口
app.post("/motorcadeList", (req, res) => {
  motorcadeList(req, res);
})
// 运作管理 - 添加客户接口
app.post("/addMotorcade", (req, res) => {
  addMotorcade(req, res);
})
// 运作管理 - 删除客户接口
app.post("/deleteMotorcade", (req, res) => {
  deleteMotorcade(req, res);
})
// 运作管理 - 编辑客户接口
app.post("/editMotorcade", (req, res) => {
  editMotorcade(req, res);
})
// 运作管理 - 船公司列表接口
app.post("/shipCompanyList", (req, res) => {
  shipCompanyList(req, res);
})
// 运作管理 - 添加船公司接口
app.post("/addShipCompany", (req, res) => {
  addShipCompany(req, res);
})
// 运作管理 - 删除船公司接口
app.post("/deleteShipCompany", (req, res) => {
  deleteShipCompany(req, res);
})
// 运作管理 - 编辑船公司接口
app.post("/editShipCompany", (req, res) => {
  editShipCompany(req, res);
})
// 运作管理 - 堆场列表接口
app.post("/yardList", (req, res) => {
  yardList(req, res);
})
// 运作管理 - 添加堆场接口
app.post("/addYard", (req, res) => {
  addYard(req, res);
})
// 运作管理 - 删除堆场接口
app.post("/deleteYard", (req, res) => {
  deleteYard(req, res);
})
// 运作管理 - 编辑堆场接口
app.post("/editYard", (req, res) => {
  editYard(req, res);
})
// 运作管理 - 代收费用列表接口
app.post("/feeCollectionList", (req, res) => {
  feeCollectionList(req, res);
})
// 运作管理 - 添加代收费用接口
app.post("/addFeeCollection", (req, res) => {
  addFeeCollection(req, res);
})
// 运作管理 - 删除代收费用接口
app.post("/deleteFeeCollection", (req, res) => {
  deleteFeeCollection(req, res);
})
// 运作管理 - 编辑代收费用接口
app.post("/editFeeCollection", (req, res) => {
  editFeeCollection(req, res);
})
// 运作管理 - 散货记录列表接口
app.post("/bulkCargoList", (req, res) => {
  bulkCargoList(req, res);
})
// 运作管理 - 添加散货记录接口
app.post("/addBulkCargo", (req, res) => {
  addBulkCargo(req, res);
})
// 运作管理 - 批量导入船运记录接口
app.post("/importShipping", upload_tmp.any(), (req, res) => {
  importShipping(req, res);
})
// 运作管理 - 生成太仓水运费接口
app.post("/generateShippingFee", (req, res) => {
  generateShippingFee(req, res);
})
// 运作管理 - 删除太仓水运费接口
app.post("/deleteShippingFee", (req, res) => {
  deleteShippingFee(req, res);
})
// 运作管理 - 生成陆运运费接口
app.post("/generateLandingFee", (req, res) => {
  generateLandingFee(req, res);
})
// 运作管理 - 删除陆运运费接口
app.post("/deleteLandingFee", (req, res) => {
  deleteLandingFee(req, res);
})
// 运作管理 - 生成散货运费接口
app.post("/generateBulkFee", (req, res) => {
  generateBulkFee(req, res);
})
// 运作管理 - 删除散货运费接口
app.post("/deleteBulkFee", (req, res) => {
  deleteBulkFee(req, res);
})
// 运作管理 - 删除散货记录接口
app.post("/deleteBulkCargo", (req, res) => {
  deleteBulkCargo(req, res);
})
// 运作管理 - 编辑散货记录接口
app.post("/editBulkCargo", (req, res) => {
  editBulkCargo(req, res);
})
// 运作管理 - 单证列表接口
app.post("/documentCheckList", (req, res) => {
  documentCheckList(req, res);
})
// 运作管理 - 单证查看接口
app.post("/containerWithFeeList", (req, res) => {
  containerWithFeeList(req, res);
})
// 运作管理 - 删除单证列表接口
app.post("/deleteDocumentCheck", (req, res) => {
  deleteDocumentCheck(req, res);
})
// 运作管理 - 箱子列表接口
app.post("/containerList", (req, res) => {
  containerList(req, res);
})
// 运作管理 - 箱子费用列表接口
app.post("/getContainerFeeList", (req, res) => {
  getContainerFeeList(req, res);
})
// 运作管理 - 派车单费用列表接口
app.post("/getDispatchFeeList", (req, res) => {
  getDispatchFeeList(req, res);
})
// 运作管理 - 修正箱信息接口
app.post("/fixContainerInfo", (req, res) => {
  fixContainerInfo(req, res);
})
// 运作管理 - 新增进口箱子接口
app.post("/addContainer", (req, res) => {
  addContainer(req, res);
})
// 运作管理 - 新增出口箱子接口
app.post("/addExportContainer", (req, res) => {
  addExportContainer(req, res);
})
// 运作管理 - 新增箱子费用接口
app.post("/addContainerFee", (req, res) => {
  addContainerFee(req, res);
})
// 运作管理 - 删除箱子费用接口
app.post("/deleteContainerFee", (req, res) => {
  deleteContainerFee(req, res);
})
// 运作管理 - 批量导入单证列表接口
app.post("/importDocumentCheck", upload_tmp.any(), (req, res) => {
  importDocumentCheck(req, res);
})
// 运作管理 - 提交单证接口
app.post("/submitDocumentCheck", (req, res) => {
  submitDocumentCheck(req, res);
})
// 运作管理 - 挑箱列表接口
app.post("/pickBoxList", (req, res) => {
  pickBoxList(req, res);
})
// 运作管理 - 删除箱子接口
app.post("/deleteContainer", (req, res) => {
  deleteContainer(req, res);
})
// 运作管理 - 挑箱接口
app.post("/pickBox", (req, res) => {
  pickBox(req, res);
})
// 运作管理 - 暂落接口
app.post("/tempDrop", (req, res) => {
  tempDrop(req, res);
})
// 运作管理 - 批量修改提箱点接口
app.post("/loadPort", (req, res) => {
  loadPort(req, res);
})
// 运作管理 - 批量设置计划时间接口
app.post("/planTime", (req, res) => {
  planTime(req, res);
})
// 运作管理 - 批量设置到港接口
app.post("/arriveTime", (req, res) => {
  arriveTime(req, res);
})
// 运作管理 - 批量设置箱信息接口
app.post("/settingContainer", (req, res) => {
  settingContainer(req, res);
})
// 运作管理 - 堆场价格列表
app.post("/yardPriceList", (req, res) => {
  yardPriceList(req, res);
})
// 运作管理 - 新增堆场价格
app.post("/addYardPrice", (req, res) => {
  addYardPrice(req, res);
})
// 运作管理 - 编辑堆场价格
app.post("/editYardPrice", (req, res) => {
  editYardPrice(req, res);
})
// 运作管理 - 删除堆场价格
app.post("/deleteYardPrice", (req, res) => {
  deleteYardPrice(req, res);
})

// 运作管理 - 驳运记录列表接口
app.post("/lighteringList", (req, res) => {
  lighteringList(req, res);
})
// 运作管理 - 驳运记录列表接口
app.post("/lighteringStatList", (req, res) => {
  lighteringStatList(req, res);
})
// 运作管理 - 批量导入驳运记录ytoj
app.post("/importYtoj", upload_tmp.any(), (req, res) => {
  importYtoj(req, res);
})
// 运作管理 - 生成水运费接口
app.post("/generateShipFee", (req, res) => {
  generateShipFee(req, res);
})
// 运作管理 - 批量导入驳运记录jtoy
app.post("/importJtoy", upload_tmp.any(), (req, res) => {
  importJtoy(req, res);
})

// 统计管理
// 统计管理 - 门点价格列表接口
app.post("/doorPriceList", (req, res) => {
  doorPriceList(req, res);
})
// 统计管理 - 添加门点价格接口
app.post("/addDoorPrice", (req, res) => {
  addDoorPrice(req, res);
})
// 统计管理 - 删除门点价格接口
app.post("/deleteDoorPrice", (req, res) => {
  deleteDoorPrice(req, res);
})
// 统计管理 - 编辑门点价格接口
app.post("/editDoorPrice", (req, res) => {
  editDoorPrice(req, res);
})
// 统计管理 - 费用列表接口
app.post("/projectFeeList", (req, res) => {
  projectFeeList(req, res);
})
// 统计管理 - 添加费用接口
app.post("/addProjectFee", (req, res) => {
  addProjectFee(req, res);
})
// 统计管理 - 删除费用接口
app.post("/deleteProjectFee", (req, res) => {
  deleteProjectFee(req, res);
})
// 统计管理 - 编辑费用接口
app.post("/editProjectFee", (req, res) => {
  editProjectFee(req, res);
})
// 统计管理 - 统计费用列表接口
app.post("/containerFeeList", (req, res) => {
  containerFeeList(req, res);
})
// 统计管理 - 确认统计费用接口
app.post("/confirmContainerFee", (req, res) => {
  confirmContainerFee(req, res);
})
// 统计管理 - 撤销确认统计费用接口
app.post("/revokeContainerFee", (req, res) => {
  revokeContainerFee(req, res);
})
// 统计管理 - 提交统计费用接口
app.post("/submitContainerFee", (req, res) => {
  submitContainerFee(req, res);
})
// 统计管理 - 提交统计费用接口
app.post("/setInvoiceNo", (req, res) => {
  setInvoiceNo(req, res);
})
// 统计管理 - 提交统计费用接口
app.post("/setAmount", (req, res) => {
  setAmount(req, res);
})
// 统计管理 - 提交统计费用接口
app.post("/setRemark", (req, res) => {
  setRemark(req, res);
})
// 统计管理 - 批量导入门点价格接口
app.post("/importDoorPrice", upload_tmp.any(), (req, res) => {
  importDoorPrice(req, res);
})
// 统计管理 - 应收数据比对接口
app.post("/dataCheckCollection", upload_tmp.any(), (req, res) => {
  dataCheckCollection(req, res);
})
// 统计管理 - 应付数据比对接口
app.post("/dataCheckPay", upload_tmp.any(), (req, res) => {
  dataCheckPay(req, res);
})
// 统计管理 - 车辆费用统计接口
app.post("/vehicleFeeStatList", (req, res) => {
  vehicleFeeStatList(req, res);
})
// 统计管理 - 业务量统计接口
app.post("/dispatchStatList", (req, res) => {
  dispatchStatList(req, res);
})
// 统计管理 - 驳运价格列表接口
app.post("/lighteringPriceList", (req, res) => {
  lighteringPriceList(req, res);
})
// 统计管理 - 增加驳运价格接口
app.post("/addLighteringPrice", (req, res) => {
  addLighteringPrice(req, res);
})
// 统计管理 - 删除驳运价格接口
app.post("/deleteLighteringPrice", (req, res) => {
  deleteLighteringPrice(req, res);
})
// 统计管理 - 编辑驳运价格接口
app.post("/editLighteringPrice", (req, res) => {
  editLighteringPrice(req, res);
})
// 统计管理 - 陆运价格列表接口
app.post("/landPriceList", (req, res) => {
  landPriceList(req, res);
})
// 统计管理 - 增加陆运价格接口
app.post("/addLandPrice", (req, res) => {
  addLandPrice(req, res);
})
// 统计管理 - 删除陆运价格接口
app.post("/deleteLandPrice", (req, res) => {
  deleteLandPrice(req, res);
})
// 统计管理 - 编辑陆运价格接口
app.post("/editLandPrice", (req, res) => {
  editLandPrice(req, res);
})
// 统计管理 - 散货价格列表接口
app.post("/bulkPriceList", (req, res) => {
  bulkPriceList(req, res);
})
// 统计管理 - 增加散货价格接口
app.post("/addBulkPrice", (req, res) => {
  addBulkPrice(req, res);
})
// 统计管理 - 删除散货价格接口
app.post("/deleteBulkPrice", (req, res) => {
  deleteBulkPrice(req, res);
})
// 统计管理 - 编辑散货价格接口
app.post("/editBulkPrice", (req, res) => {
  editBulkPrice(req, res);
})

// 调度管理
// 调度管理 - 拆箱列表
app.post("/unpackingList", (req, res) => {
  unpackingList(req, res);
})
// 调度管理 - 派车
app.post("/dispatchCar", (req, res) => {
  dispatchCar(req, res);
})
// 调度管理 - 导入派车
app.post("/importDispatch", upload_tmp.any(), (req, res) => {
  importDispatch(req, res);
})
// 调度管理 - 根据导入的箱子更新派车单
app.post("/generateDispatchWithContainer", upload_tmp.any(), (req, res) => {
  generateDispatchWithContainer(req, res);
})
// 调度管理 - 临时出口派车
app.post("/tmpDispatchCar", (req, res) => {
  tmpDispatchCar(req, res);
})
// 调度管理 - 获取进口派车列表
app.post("/importDispatchList", (req, res) => {
  importDispatchList(req, res);
})
// 调度管理 - 编辑进口派车箱信息
app.post("/editContainerInfo", (req, res) => {
  editContainerInfo(req, res);
})
// 调度管理 - 获取出口派车列表
app.post("/exportDispatchList", (req, res) => {
  exportDispatchList(req, res);
})
// 运作管理 - 批量导入出口派车列表接口
app.post("/importExportContainer", upload_tmp.any(), (req, res) => {
  importExportContainer(req, res);
})
// 运作管理 - 生成装箱派车单
app.post("/generateExportDispatch", (req, res) => {
  generateExportDispatch(req, res);
})
// 调度管理 - 获取临时出口派车列表
app.post("/exportTmpDispatchList", (req, res) => {
  exportTmpDispatchList(req, res);
})
// 调度管理 - 获取暂落派车列表
app.post("/tempDropDispatchList", (req, res) => {
  tempDropDispatchList(req, res);
})
// 调度管理 - 获取武汉派车列表
app.post("/whDispatchList", (req, res) => {
  whDispatchList(req, res);
})
// 调度管理 - 编辑武汉装箱信息
app.post("/editWhExport", (req, res) => {
  editWhExport(req, res);
})
// 调度管理 - 暂落一键完成
app.post("/tempDropFinish", (req, res) => {
  tempDropFinish(req, res);
})
// 调度管理 - 一键完成
app.post("/oneStepFinish", (req, res) => {
  oneStepFinish(req, res);
})
// 调度管理 - 一键放空
app.post("/oneStepEmpty", (req, res) => {
  oneStepEmpty(req, res);
})
// 调度管理 - 一键撤回
app.post("/oneStepRevoke", (req, res) => {
  oneStepRevoke(req, res);
})
// 调度管理 - 派车撤回
app.post("/dispatchRevoke", (req, res) => {
  dispatchRevoke(req, res);
})

// 车辆管理
// 车辆管理 - 车辆信息列表接口
app.post("/vehicleInfoList", (req, res) => {
  vehicleInfoList(req, res);
})
// 车辆管理 - 添加车辆信息接口
app.post("/addVehicleInfo", (req, res) => {
  addVehicleInfo(req, res);
})
// 车辆管理 - 批量导入车辆信息
app.post("/importVehicleInfo", upload_tmp.any(), (req, res) => {
  importVehicleInfo(req, res);
})
// 车辆管理 - 删除车辆信息接口
app.post("/deleteVehicleInfo", (req, res) => {
  deleteVehicleInfo(req, res);
})
// 车辆管理 - 编辑车辆信息接口
app.post("/editVehicleInfo", (req, res) => {
  editVehicleInfo(req, res);
})
// 车辆管理 - 司机信息列表接口
app.post("/driverInfoList", (req, res) => {
  driverInfoList(req, res);
})
// 车辆管理 - 添加司机信息接口
app.post("/addDriverInfo", (req, res) => {
  addDriverInfo(req, res);
})
// 车辆管理 - 批量导入司机信息
app.post("/importDriverInfo", upload_tmp.any(), (req, res) => {
  importDriverInfo(req, res);
})
// 车辆管理 - 删除司机信息接口
app.post("/deleteDriverInfo", (req, res) => {
  deleteDriverInfo(req, res);
})
// 车辆管理 - 编辑司机信息接口
app.post("/editDriverInfo", (req, res) => {
  editDriverInfo(req, res);
})
// 车辆管理 - 车辆额外信息列表接口
app.post("/vehicleExtraInfoList", (req, res) => {
  vehicleExtraInfoList(req, res);
})
// 车辆管理 - 添加车辆额外信息接口
app.post("/addVehicleExtraInfo", (req, res) => {
  addVehicleExtraInfo(req, res);
})
// 车辆管理 - 删除车辆额外信息接口
app.post("/deleteVehicleExtraInfo", (req, res) => {
  deleteVehicleExtraInfo(req, res);
})
// 车辆管理 - 编辑车辆额外信息接口
app.post("/editVehicleExtraInfo", (req, res) => {
  editVehicleExtraInfo(req, res);
})
// 车辆管理 - 油耗核算列表接口
app.post("/oilConsumptionList", (req, res) => {
  oilConsumptionList(req, res);
})
// 车辆管理 - 添加油耗核算接口
app.post("/addOilConsumption", (req, res) => {
  addOilConsumption(req, res);
})
// 车辆管理 - 删除油耗核算接口
app.post("/deleteOilConsumption", (req, res) => {
  deleteOilConsumption(req, res);
})
// 车辆管理 - 编辑油耗核算接口
app.post("/editOilConsumption", (req, res) => {
  editOilConsumption(req, res);
})
// 车辆管理 - 撬装加油列表接口
app.post("/vehicleRefuelList", (req, res) => {
  vehicleRefuelList(req, res);
})
// 车辆管理 - 添加撬装加油接口
app.post("/addVehicleRefuel", (req, res) => {
  addVehicleRefuel(req, res);
})
// 车辆管理 - 删除撬装加油接口
app.post("/deleteVehicleRefuel", (req, res) => {
  deleteVehicleRefuel(req, res);
})
// 车辆管理 - 编辑撬装加油接口
app.post("/editVehicleRefuel", (req, res) => {
  editVehicleRefuel(req, res);
})
// 车辆管理 - 车辆费用列表接口
app.post("/vehicleFeeList", (req, res) => {
  vehicleFeeList(req, res);
})
// 车辆管理 - 添加车辆费用接口
app.post("/addVehicleFee", (req, res) => {
  addVehicleFee(req, res);
})
// 车辆管理 - 提交车辆费用接口
app.post("/submitVehicleFee", (req, res) => {
  submitVehicleFee(req, res);
})
// 车辆管理 - 删除车辆费用接口
app.post("/deleteVehicleFee", (req, res) => {
  deleteVehicleFee(req, res);
})
// 车辆管理 - 编辑车辆费用接口
app.post("/editVehicleFee", (req, res) => {
  editVehicleFee(req, res);
})

// 通用
// 通用 - 操作记录接口
app.post("/operationLogList", (req, res) => {
  operationLogList(req, res);
})
// 通用 - 往来单位列表接口
app.post("/accCompanyList", (req, res) => {
  accCompanyList(req, res);
})
// 通用 - 添加往来单位接口
app.post("/addAccCompany", (req, res) => {
  addAccCompany(req, res);
})
// 通用 - 删除往来单位接口
app.post("/deleteAccCompany", (req, res) => {
  deleteAccCompany(req, res);
})
// 通用 - 编辑往来单位接口
app.post("/editAccCompany", (req, res) => {
  editAccCompany(req, res);
})
// 通用 - 工作报告列表接口
app.post("/reportList", (req, res) => {
  reportList(req, res);
})
// 通用 - 添加工作报告接口
app.post("/addReport", (req, res) => {
  addReport(req, res);
})
// 通用 - 删除工作报告接口
app.post("/deleteReport", (req, res) => {
  deleteReport(req, res);
})
// 通用 - 编辑工作报告接口
app.post("/editReport", (req, res) => {
  editReport(req, res);
})
// 通用 - 提交工作报告接口
app.post("/submitReport", (req, res) => {
  submitReport(req, res);
})
// 通用 - 合同列表接口
app.post("/contractList", (req, res) => {
  contractList(req, res);
})
// 通用 - 添加合同接口
app.post("/addContract", (req, res) => {
  addContract(req, res);
})
// 通用 - 删除合同接口
app.post("/deleteContract", (req, res) => {
  deleteContract(req, res);
})
// 通用 - 编辑合同接口
app.post("/editContract", (req, res) => {
  editContract(req, res);
})
// 通用 - 费用申请列表接口
app.post("/appliedFeeList", (req, res) => {
  appliedFeeList(req, res);
})
// 通用 - 添加费用申请接口
app.post("/addAppliedFee", (req, res) => {
  addAppliedFee(req, res);
})
// 通用 - 删除费用申请接口
app.post("/deleteAppliedFee", (req, res) => {
  deleteAppliedFee(req, res);
})
// 通用 - 编辑费用申请接口
app.post("/editAppliedFee", (req, res) => {
  editAppliedFee(req, res);
})
// 通用 - 提交费用申请接口
app.post("/submitAppliedFee", (req, res) => {
  submitAppliedFee(req, res);
})
// 通用 - 撤销费用申请接口
app.post("/revokeAppliedFee", (req, res) => {
  revokeAppliedFee(req, res);
})

// 财务
// 财务 - 费用审核
app.post("/keepAppliedFee", (req, res) => {
  keepAppliedFee(req, res);
})
// 财务 - 费用审核撤销
app.post("/cancelKeepAppliedFee", (req, res) => {
  cancelKeepAppliedFee(req, res);
})
// 财务 - 生成应收费
app.post("/generateContainerFee", (req, res) => {
  generateContainerFee(req, res);
})
// 财务 - 生成打单费
app.post("/generateOrderFee", (req, res) => {
  generateOrderFee(req, res);
})
// 财务 - 生成码头计划费
app.post("/generatePlanningFee", (req, res) => {
  generatePlanningFee(req, res);
})
// 财务 - 更新码头计划费&堆存费
app.post("/updatePlanningFee", (req, res) => {
  updatePlanningFee(req, res);
})
// 财务 - 生成堆存费
app.post("/generateStorageFee", (req, res) => {
  generateStorageFee(req, res);
})
// 财务 - 生成拖车费
app.post("/generateDispatchFee", (req, res) => {
  generateDispatchFee(req, res);
})
// 财务 - 更新拖车费
app.post("/updateDispatchFee", (req, res) => {
  updateDispatchFee(req, res);
})
// 财务 - 生成异常费
app.post("/generateAbnormalFee", (req, res) => {
  generateAbnormalFee(req, res);
})
// 财务 - 费用审核列表
app.post("/financeCheckList", (req, res) => {
  financeCheckList(req, res);
})
// 财务 - 费用报表列表
app.post("/financeStatList", (req, res) => {
  financeStatList(req, res);
})
// 财务 - 发票列表
app.post("/invoicetList", (req, res) => {
  invoicetList(req, res);
})
// 财务 - 新增发票
app.post("/addInvoice", (req, res) => {
  addInvoice(req, res);
})
// 财务 - 编辑发票
app.post("/editInvoice", (req, res) => {
  editInvoice(req, res);
})
// 财务 - 删除发票
app.post("/deleteInvoice", (req, res) => {
  deleteInvoice(req, res);
})
// 财务 - 批量设置收款日期
app.post("/setReceiptTime", (req, res) => {
  setReceiptTime(req, res);
})
// 财务 - 批量导入发票接口
app.post("/importInvoice", upload_tmp.any(), (req, res) => {
  importInvoice(req, res);
})
// 财务 - 应付发票列表
app.post("/payInvoicetList", (req, res) => {
  payInvoicetList(req, res);
})
// 财务 - 应付发票列表 仅供选项使用
app.post("/selectPayInvoicetList", (req, res) => {
  selectPayInvoicetList(req, res);
})
// 财务 - 原始应付发票列表
app.post("/payInvoicetOrigList", (req, res) => {
  payInvoicetOrigList(req, res);
})
// 财务 - 新增应付发票
app.post("/addPayInvoice", (req, res) => {
  addPayInvoice(req, res);
})
// 财务 - 编辑应付发票
app.post("/editPayInvoice", (req, res) => {
  editPayInvoice(req, res);
})
// 财务 - 删除应付发票
app.post("/deletePayInvoice", (req, res) => {
  deletePayInvoice(req, res);
})
// 财务 - 批量登记应付发票
app.post("/registerPayInvoice", (req, res) => {
  registerPayInvoice(req, res);
})
// 财务 - 批量导入应付发票接口
app.post("/importPayInvoice", upload_tmp.any(), (req, res) => {
  importPayInvoice(req, res);
})
// 财务 - 应收箱子接口
app.post("/collectionContainerList", upload_tmp.any(), (req, res) => {
  collectionContainerList(req, res);
})
// 财务 - 通过应收费用审核
app.post("/approveCollection", upload_tmp.any(), (req, res) => {
  approveCollection(req, res);
})
// 财务 - 驳回应收费用审核
app.post("/rejectCollection", upload_tmp.any(), (req, res) => {
  rejectCollection(req, res);
})
// 财务 - 通过应付费用审核
app.post("/approvePay", upload_tmp.any(), (req, res) => {
  approvePay(req, res);
})
// 财务 - 驳回应付费用审核
app.post("/rejectPay", upload_tmp.any(), (req, res) => {
  rejectPay(req, res);
})
// 财务 - 费用名列表
app.post("/feeNameList", (req, res) => {
  feeNameList(req, res);
})
// 财务 - 新增费用名
app.post("/addFeeName", (req, res) => {
  addFeeName(req, res);
})
// 财务 - 编辑费用名
app.post("/editFeeName", (req, res) => {
  editFeeName(req, res);
})
// 财务 - 删除费用名
app.post("/deleteFeeName", (req, res) => {
  deleteFeeName(req, res);
})

app.put("/updateList/:id", (req, res) => {
  updateList(req, res);
});

app.delete("/deleteList/:id", (req, res) => {
  deleteList(req, res);
});

app.post("/searchPage", (req, res) => {
  searchPage(req, res);
});

app.post("/searchVague", (req, res) => {
  searchVague(req, res);
});

app.post("/upload", upload_tmp.any(), (req, res) => {
  upload(req, res);
});

app.get("/captcha", (req, res) => {
  captcha(req, res);
});

app.ws("/socket", function (ws, req) {
  ws.send(
    `${dayjs(new Date()).format("YYYY年MM月DD日HH时mm分ss秒")}成功连接socket`
  );

  // 监听客户端是否关闭socket
  ws.on("close", function (msg) {
    console.log("客户端已关闭socket", msg);
    ws.close();
  });

  // 监听客户端发送的消息
  ws.on("message", function (msg) {
    // 如果客户端发送close，服务端主动关闭该socket
    if (msg === "close") ws.close();

    ws.send(
      `${dayjs(new Date()).format(
        "YYYY年MM月DD日HH时mm分ss秒"
      )}接收到客户端发送的信息，服务端返回信息：${msg}`
    );
  });
});

app
  .listen(config.port, () => {
    Logger.info(`
    ################################################
    🛡️  Swagger文档地址: http://localhost:${config.port} 🛡️
    ################################################
  `);
  })
  .on("error", (err) => {
    Logger.error(err);
    process.exit(1);
  });

// open(`http://localhost:${config.port}`); // 自动打开默认浏览器
