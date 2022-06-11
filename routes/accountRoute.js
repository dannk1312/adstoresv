import express, { NextFunction, Request, Response } from 'express';
import * as Account from '../controllers/accountController';
import * as Default from '../controllers/defaultController';


route.post("/account/signUp", Default.OTPCheck, Account.SignUp)

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

// header: accessToken - role: All - field: name, birth, gender
// type: 
//      name**: string
//      birth**: Date
//      gender**: boolean
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

// header: accessToken - role: All - field: address, add_address
// type: 
//      address: string 
//      add_address: string
// rule: address | add_address
route.post("/account/updateAddress", Default.Role("All"), Account.UpdateAddress)
