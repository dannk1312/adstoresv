import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Bill from '../controllers/billController';
import * as Product from '../controllers/productController';

const route = express.Router();

// header: accessToken - role: Customer - field: bag, discountCode, address
// type:
//      bag: object[] - [{product: string, quantity: number}] - product = product._id
//      address: string,
//      discountCode: string

route.post("/bill/billCalc", Default.Role("Customer"), Product.ValidBag, Bill.Calculate)

// header: accessToken - role: Customer - field: bag, discountCode, address
// type:
//      bag: object[] - [{product: string, quantity: number}] - product = product._id
//      address: string,
//      discountCode: string

route.post("/bill/create", Default.Role("Customer"), Product.ValidBag, Bill.Create)

// header: accessToken - role: ["Customer", "Admin"] - field: _id, status, desc
// type:
//      _id**: string - bill_id
//      status**: string  - ['Preparing', 'Delivering', 'Done', 'Cancel']
//      desc: string
route.post("/bill/update", Default.Role(["Customer", "Admin"]), Bill.Update)

export const billRoute = route
