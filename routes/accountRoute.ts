import express, { NextFunction, Request, Response } from 'express';
import * as Account from '../controllers/accountController';
import * as Default from '../controllers/defaultController';
import * as Product from '../controllers/productController';

const route = express.Router();



// header: accessToken - role: Admin - field: skip, limit, search, role, enable, sortName, sortType
// type: 
//       skip: number - undefine = 0
//       limit: number - undefine = 10000
//       search: string - name, email, phone, address - undefine = all
//       role: string - ["Admin", "Sale", "Customer"] - undefine = all
//       enable: boolean - undefine = all
//       sortName: string - ["self_cancel", "createAt", "bills"] - số lần hủy đơn, ngày tạo, số lượng bill
//       sortType: number - 1 là tăng dần, -1 giảm dần
// nếu skip = 0 thì có trả số lượng
route.post("/account/list", Default.Role("Admin"), Account.List)

// header: accessToken - role: Admin - field: _id, enable
// type: 
//      _id**: string
//      enable**: boolean
route.post("/account/enable", Default.Role("Admin"), Account.Enable)

// field: code, email_or_phone, password, name, birth, gender, address
// type: 
//      code**: string
//      email_or_phone**: string
//      password**: string
//      name: string 
//      birth: Date
//      gender: boolean
//      address: object - {province: string, district: string, address: string}
route.post("/account/signUp", Default.OTPCheck, Account.SignUp)

// field: email_or_phone, email, phone
// type: 
//      email_or_phone: string
//      email: string
//      phone: string
// rule: email_or_phone | email | phone
route.post("/account/otp", Default.OTPRequest)

// field: email_or_phone, password, code, googleToken
// type: 
//      email_or_phone: string
//      password: string
//      code: string
//      googleToken: string
// rule: (email_or_phone & password) | (email_or_phone & code) | googleToken
route.post("/account/login", Account.SignIn)

// header: accessToken - role: All
route.get("/account/info", Default.Role("All"), Account.Info)

// header: accessToken - role: All
route.get("/account/surface", Default.Role("All"), Account.Surface)

// header: accessToken - role: All - field: name, birth, gender, address
// type: 
//      name**: string
//      birth**: Date
//      gender**: boolean
//      address**: string
route.post("/account/updateInfo", Default.Role("All"), Account.UpdateInfo)

// header: accessToken - role: All - field: phone, code
// type: 
//      phone**: string - (Cần mã quốc gia: 84/+84)
//      code**: string
route.post("/account/updatePhone", Default.Role("All"), Default.OTPCheck, Account.UpdatePhone)

// header: accessToken - role: All - field: old_password, password
// type: 
//      old_password**: string
//      password**: string
route.post("/account/updatePassword", Default.Role("All"), Account.UpdatePassword)


// header: accessToken - role: Customer
route.get("/account/readNotifications", Default.Role("Customer"), Account.ReadNotifications)

// header: accessToken - role: Customer - field: _id
// type: 
//      _id: string - id notification
route.post("/account/deleteNotification", Default.Role("Customer"), Account.DeleteNotification)

// header: accessToken - role: Admin - field: dest_id, message
// type: 
//      dest_id: string - id accounts
//      message: string
// rule: dest_id**, message**
route.post("/account/sendNotification", Default.Role("Admin"), Account.SendNotification)


// header: accessToken - role: Customer - field: _id
// type: 
//      _id**: string
route.post("/account/pushBag", Default.Role("Customer"), Account.PushBag, Product.ValidBag, Account.TryUpdateBag)


// header: accessToken - role: Customer
route.post("/account/readBills", Default.Role("Customer"), Account.ReadBills)



export const accountRoute = route