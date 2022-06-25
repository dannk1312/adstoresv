import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Discount from '../controllers/discountController';

const route = express.Router();

// header: accessToken - role: ["Admin", "Sale"] - field: ....
// type:
//      code**: string,
//      enable: boolean, // default: false
//      dateStart: Date,
//      dateEnd: Date, // undefined mean dont have quantity limit
//      quantity: number, // undefined mean dont have quantity limit
//      minPrice: number, // undefined mean dont have minPrice
//      maxPrice: number, // undefined mean dont have maxPrice
//      is_percent: boolean, // in percent of price or in price
//      is_ship: boolean, // default: false
//      is_oid: boolean, // is one in day
//      is_oic: boolean, // is one in customer
//      value**: number 

route.post("/discount/create", Default.Role(["Admin", "Sale"]), Discount.Create)

// header: accessToken - role: Ad["Admin", "Sale"]min - field: ....
// type:
//      _id: string
//      code: string,
//      enable: boolean
//      quantity: number,
//      categories_del: string[] - categories id
//      products_del: string[] - products id
//      accounts_del: string[] - accounts id
//      categories_add: string[]  - categories id
//      products_add: string[] - products id
//      accounts_add: string[] - accounts id - add sẽ thông báo tới người dùng

route.post("/discount/update", Default.Role(["Admin", "Sale"]), Discount.Update)


// header: accessToken - role: ["Admin", "Sale"] - field: skip, limit
// type:
//      search: string
//      skip: number - undefine - 0
//      limit: number - undefine - 10000
//      sortName: string
//      sortType: number - 1 là tăng dần, -1 giảm dần
//      is_percent: boolean 
//      is_ship: boolean 
//      is_oid: boolean 
//      is_oic: boolean
//      sortValue: number
//      fromDate: Date
//      toDate: Date

route.post("/discount/list", Default.Role(["Admin", "Sale"]), Discount.List)

// field: _id, code
// type:
//      _id: string
//      code: string

route.post("/discount/read", Discount.Read)

// header: accessToken - role: ["Admin", "Sale"] - field: _id, code
// type:
//      _id: string
//      code: string
//      field**: string
// rule: (_id | doc)**

route.post("/discount/read", Default.Role(["Admin", "Sale"]), Discount.Links)

export const discountRoute = route
