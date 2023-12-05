import app from "./app";
// import * as open from "open";
import config from "./config";
import * as dayjs from "dayjs";
import * as multer from "multer";
import { user } from "./models/mysql";
import Logger from "./loaders/logger";
import { queryTable } from "./utils/mysql";
const expressSwagger = require("express-swagger-generator")(app);
expressSwagger(config.options);

// queryTable(user);

import {
  login,
  userList,
  addUser,
  deleteUser,
  editUser,
  wxClockList,
  motorcadeList,
  addMotorcade,
  deleteMotorcade,
  editMotorcade,
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
  documentCheckList,
  containerList,
  addContainer,
  importDocumentCheck,
  submitDocumentCheck,
  pickBoxList,
  pickBox,
  tempDrop,
  loadPort,
  makeTime,
} from "./router/operation";

import {
  unpackingList,
  dispatchCar,
} from "./router/dispatch";

// 新建存放临时文件的文件夹
const upload_tmp = multer({ dest: "upload_tmp/" });
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
// 运作管理 - 箱子列表接口
app.post("/containerList", (req, res) => {
  containerList(req, res);
})
// 运作管理 - 新增箱子接口
app.post("/addContainer", (req, res) => {
  addContainer(req, res);
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
// 运作管理 - 批量设置提箱时间接口
app.post("/makeTime", (req, res) => {
  makeTime(req, res);
})

// 运作管理 - 驳运记录列表接口
app.post("/lighteringList", (req, res) => {
  lighteringList(req, res);
})

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

// 调度管理
// 调度管理 - 拆箱列表
app.post("/unpackingList", (req, res) => {
  unpackingList(req, res);
})
// 调度管理 - 派车
app.post("/dispatchCar", (req, res) => {
  dispatchCar(req, res);
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
