import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Bill from '../controllers/billController';
import * as Product from '../controllers/productController';
import * as Account from '../controllers/accountController';
import { sortObject } from '../services/support';

const route = express.Router();

// header: accessToken - role: Customer - field: bag, discountCode, address
// type:
//      bag: object[] - [{product: string, color: string, quantity: number}] - product = product._id
//      address: object - {province: string, district: string, address: string}
//      discountCode: string
route.post("/bill/billCalc", Default.GetAccount, Product.ValidBag, Account.TryUpdateBag, Bill.Calculate)

// header: accessToken - role: Customer - field: bag, discountCode, address, cod
// type:
//      bag**: object[] - [{product: string, color: string, quantity: number}] - product = product._id
//      address**: object - {province: string, district: string, address: string}
//      discountCode: string
//      cod**: boolean 
//      phone**: string
//      name: string
route.post("/bill/create", Default.PhoneFormatter, Default.GetAccount, Product.ValidBag, Bill.Create, Bill.RequestVNPay)

route.get('/vnpay_ipn', Bill.CheckVNPay);

// header: accessToken - role: ["Customer", "Admin"] - field: _id, status, desc
// type:
//      _id**: string - bill_id
//      status**: string  - ['Preparing', 'Delivering', 'Done', 'Cancel']
//      desc: string
route.post("/bill/update", Default.Role(["Customer", "Sale",  "Admin"]), Bill.Update)

// header: accessToken - role: "Admin" - field: skip, limit, status, search, sortName, sortType
// type:
//       skip: number = req.body.skip ?? 0
//       limit: number = req.body.limit ?? 10000
//       status: string - in ['Preparing', 'Delivering', 'Done', 'Cancel'] 
//       search: string - phone, address
//       sortName: string - ["ship", "total", "discount"] - phí ship, phí tổng, - phí giảm giá
//       sortType: number - 1 tăng dần, -1 giảm dần
route.post("/bill/list", Default.Role("Admin"), Bill.List)

// header: accessToken - role: ["Customer", "Sale", "Admin"] - field: _id
// type:
//       _id: string
// Customer chỉ có thể đọc bill của bản thân
route.post("/bill/read", Default.Role(["Customer", "Sale", "Admin"]), Bill.Read)


export const billRoute = route
