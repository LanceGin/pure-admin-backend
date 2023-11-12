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
  updateList,
  deleteList,
  searchPage,
  searchVague,
  upload,
  captcha,
} from "./router/http";

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

app.post("/yardList", (req, res) => {
  yardList(req, res);
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

// 新建存放临时文件的文件夹
const upload_tmp = multer({ dest: "upload_tmp/" });
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
