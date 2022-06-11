
import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Product from '../controllers/productController';

const route = express.Router();

// field: _id, code
// type: 
//      _id: string - để query product
//      code: string - để query product
// rule: _id | code
route.post("/product/read", Product.Read)

// header: accessToken - role: Admin - field: name, code, desc, category, specs, price, sale, image_base64
// type: 
//      name**: string
//      code**: string
//      desc: string,
//      category**: string - category name
//      specs: object - {specs: value}
//      price**: number
//      sale: number,
//      image_base64: string
route.post("/product/create", Default.Role("Admin"), Product.Create)

// field: _id, code
// type:
//      _id: string - để query product
//      code: string - để query product
//      skip: number - undefined <=> 0
//      limit: number - undefined <=> 20
// rule: _id | code
route.post("/product/readComments", Product.ReadComment)

// header: accessToken - role: Admin - field: _id, code, name, desc, price, enable, specs, sale
// type: 
//      _id: string - để query product
//      code: string - để queryy product
//      name: string,
//      desc: string
//      specs: object - {specs: value}
//      price: number
//      sale: number
//      enable: boolean
// rule: (_id | code)** & (name | desc | specs | price | sale | enable)
route.post("/product/update", Default.Role("Admin"), Product.Update)

// header: accessToken - role: Admin - field: _id, code, color, image_base64
// type: 
//      _id: string - để query product
//      code: string - để queryy product
//      color**: string
//      image_base64**: string
// rule: (_id | code)**
route.post("/product/addColor", Default.Role("Admin"), Product.AddColor)

// header: accessToken - role: Admin - field: _id, code, color
// type: 
//      _id: string - để query product
//      code: string - để queryy product
//      color**: string
// rule: (_id | code)**
route.post("/product/deleteColor", Default.Role("Admin"), Product.DeleteColor)

// header: accessToken - role: Admin - field: _id, code, image_base64
// type: 
//      _id: string - để query product
//      code: string - để queryy product
//      image_base64**: string
// rule: (_id | code)**
route.post("/product/addCatalogue", Default.Role("Admin"), Product.AddCatalogue)

// header: accessToken - role: Admin - field: _id, catalogue_id
// type: 
//      _id: string - để query product
//      code: string - để queryy product
//      catalogue_id**: string 
// rule: (_id | code)**
route.post("/product/deleteCatalogue", Default.Role("Admin"), Product.DeleteCatalogue)

// header: accessToken - role: Admin - field: data
// type: 
//      data: object[] - [{code: string, quantity: number, price: number}]
route.post("/product/imports", Default.Role("Admin"), Product.Imports)

export const productRoute = route
