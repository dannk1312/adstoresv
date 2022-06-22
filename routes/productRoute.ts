
import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Product from '../controllers/productController';

const route = express.Router();


// field: category, skip, limit
// type:
//      category: string
//      skip: number - undefine = 0
//      limit: number - undefine = 10000
route.post("/product/commingSoon", Product.CommingSoon)

// field: category, specs, colors, min_price, max_price, skip, limit, sortName, sortType
// type:
//      category: string
//      specs: object - {name: string, value: any[]} - undefine = all | or | [{name: string, values: string}]
//      colors: string - undefine = all - colors: "white;blue"
//      min_price: number - undefine = 0
//      max_price: number - undefine = 1000000000
//      skip: number - undefine = 0
//      limit: number - undefine = 20
//      sortName: string - in ["price", "sale", "sold", "total_rate"]
//      sortType: number - 1 tăng dần, -1 giảm dần
// rule:
//      specs hiệu quả khi đi với category,
//      sortType và sortName hiệu quả khi đi với nhau
// example
//      "name": "Laptop",
//      "specs": {name: "Ram", values:"8gb;16gb"},
//      "colors": ["Red"],
//      "max_price": 65000000
// if skip == undefine => trả về count để phân trang
route.post("/product/list", Default.SpecsSplitter, Product.List)

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
//      specs**: object - {specs: value}
//      price**: number
//      sale: number,
//      image_base64**: string
route.post("/product/create", Default.Role("Admin"), Product.Create)

// field: _id, code
// type:
//      _id: string - để query product
//      code: string - để query product
//      skip: number - undefined = 0
//      limit: number - undefined = 10000
// rule: _id | code
route.post("/product/readComments", Product.ReadComments)

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

// header: accessToken - role: Customer - field: _id, rate, message
// type: 
//      _id**: string
//      rate**: number
//      message: string
route.post("/product/rate", Default.Role("Customer"), Product.Rate)

// field: products, category, quantity
// type: 
//       products: string[]  // list _id product, dùng để gợi ý các món hàng liên quan
//       quantity: number // undefine => 10
route.post("/product/hint", Product.Hint)

// field: category, quantity
// type: 
//       category: string  
//       quantity: number // undefine => 10
route.post("/product/top", Product.Top)



export const productRoute = route
