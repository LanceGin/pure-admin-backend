import * as dayjs from "dayjs";

// 修改文件名
export function renameFileWithoutExtension(originalName, newName) {
  // 分离文件名和扩展名
  const dotIndex = originalName.lastIndexOf('.');
  const extension = originalName.substring(dotIndex);
  const nameWithoutExtension = originalName.substring(0, dotIndex);
 
  // 拼接新的文件名和原始扩展名
  return newName + extension;
}

// 生成随机字符串
export function getRandomString(len){
    let _charStr = 'abacdefghjklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ0123456789',
        min = 0, 
        max = _charStr.length-1, 
        _str = '';                    //定义随机字符串 变量
    //判断是否指定长度，否则默认长度为15
    len = len || 15;
    //循环生成字符串
    for(var i = 0, index; i < len; i++){
        index = (function(randomIndexFunc, i){         
                    return randomIndexFunc(min, max, i, randomIndexFunc);
                })(function(min, max, i, _self){
                    let indexTemp = Math.floor(Math.random()*(max-min+1)+min),
                        numStart = _charStr.length - 10;
                    if(i==0&&indexTemp >=numStart){
                        indexTemp = _self(min, max, i, _self);
                    }
                    return indexTemp ;
                }, i);
        _str += _charStr[index];
    }
    return _str;
}

// 格式化时间
export function formatDate(numb, format) {
    let getDay = numb - 1
    let t = Math.round((getDay - Math.floor(getDay)) * 24 * 60 * 60)
    //当导入的excel日期中包含了时分秒，t则表示小数点后面的时间
    let time = new Date(1900, 0, getDay, 0, 0, t);
    //getDay是从1900开始计算的，因此new Date()的第一个参数是1900
    let year = time.getFullYear();
    let month = time.getMonth() + 1;
    let date = time.getDate();
    return year + format + (month < 10 ? "0" + month : month) + format + (date < 10 ? "0" + date : date);
}

// 计算计划费
export function calPlanningFee(data, container) {
    let a_time;
    let make_time;
    if (container.temp_port !== null) {
        a_time = dayjs(container.temp_time).format("YYYY-MM-DD");
        make_time = dayjs(container.make_time).format("YYYY-MM-DD");
    } else {
        a_time = dayjs(container.arrive_time).format("YYYY-MM-DD");
        if (container.plan_time === null) {
            make_time = dayjs(container.make_time).format("YYYY-MM-DD");
        } else {
            make_time = dayjs(container.plan_time).format("YYYY-MM-DD");
        }
    }

    const delta_days = (dayjs(make_time).diff(a_time, "day") + 1).toString();

    const c_type = container.container_type.substring(0,2);
    console.log(222222,"导入错误排查", data);
    if (c_type == "40") {
        let amount = Number(data[0].base_price_40);
        if (data[0].price_rule == "单价异步") {
            for (let i = 0; i < data.length; ++i) {
                if (Number(delta_days) <= Number(data[i].day_max)) {
                    amount += (Number(delta_days) - Number(data[i].day_min) + 1) * Number(data[i].price_40);
                    console.log(3333, amount);
                    return amount
                } else {
                    amount += (Number(data[i].day_max) - Number(data[i].day_min) + 1) * Number(data[i].price_40)
                }
            }
        } else {
            for (let i = 0; i < data.length; ++i) {
                if (Number(delta_days) <= Number(data[i].day_max)) {
                    amount += (Number(delta_days) - 3) * Number(data[i].price_40);
                    console.log(4444, amount);
                    return amount
                }
            }
        }
    } else if (c_type == "20") {
        let amount = Number(data[0].base_price_20);
        if (data[0].price_rule == "单价异步") {
            for (let i = 0; i < data.length; ++i) {
                if (Number(delta_days) <= Number(data[i].day_max)) {
                    amount += (Number(delta_days) - Number(data[i].day_min) + 1) * Number(data[i].price_20);
                    console.log(5555, amount);
                    return amount
                } else {
                    amount += (Number(data[i].day_max) - Number(data[i].day_min) + 1) * Number(data[i].price_20)
                }
            }
        } else {
            for (let i = 0; i < data.length; ++i) {
                if (Number(delta_days) <= Number(data[i].day_max)) {
                    amount += (Number(delta_days) - 3) * Number(data[i].price_20);
                    console.log(6666, amount);
                    return amount
                }
            }
        }
    }
}