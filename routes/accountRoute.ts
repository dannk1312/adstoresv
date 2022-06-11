import express, { NextFunction, Request, Response } from 'express';
import * as Account from '../controllers/accountController';
import * as Default from '../controllers/defaultController';
import * as Product from '../controllers/productController';

const route = express.Router();

// field: code, email_or_phone, password, name, birth, gender, address
// type: 
//      code**: string
//      email_or_phone**: string
//      password**: string
//      name: string 
//      birth: Date
//      gender: string
//      address: string
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
route.get("/account/readBag", Default.Role("Customer"), Account.ReadBag)

// header: accessToken - role: Customer
route.get("/account/readNotifications", Default.Role("Customer"), Account.ReadNotifications)

// header: accessToken - role: Customer - field: _id
// type: 
//      _id: string - id notification
route.post("/account/deleteNotification", Default.Role("Customer"), Account.DeleteNotification)

// header: accessToken - role: Customer - field: dest_id, message
// type: 
//      dest_id: string - id accounts
//      message: string
// rule: dest_id**, message**
route.post("/account/sendNotification", Default.Role("Customer"), Account.SendNotification)

// header: accessToken - role: Customer - field: bag
// type: 
//      bag: object[] - [{product: string, quantity: number}] - product = product._id
route.post("/account/updateBag", Default.Role("Customer"), Product.ValidBag, Account.UpdateBag)


export const accountRoute = route