import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Category from '../controllers/categoryController';

const route = express.Router();

route.get("/category/list", Category.List)

// header: accessToken - role: Admin - field: name, image_base64, specsModel
// type:
//      name**: string
//      image_base64**: string 
//      specsModel**: object[]  - [{name: string, values: [{value: string}]}]
// example: 
//      "name": "Laptop",
//      "specsModel": [{
//          "name": "Ram",
//          "values": [
//              {"value": "4gb"},
//              {"value": "8gb"}
//          ]
//      }, {
//          "name": "Độ phân giải màn hình",
//          "values": [
//              {"value": "1920x1080"},
//              {"value": "1366x768"}
//          ]
//      }],
//      "image_base64": .....
route.post("/category/create", Default.Role("Admin"), Category.Create)

// header: accessToken - role: Admin - field: _id, name, image_base64, specsModel
// type:
//      _id**: string - Category Id
//      name: string
//      image_base64: string
//      specsModel: object[] - 
//          [{
//              _id: string, - Spec Id
//              name: string, 
//              values: [{
//                  _id: string, - Value Id
//                  value: string
//              }]
//          }]
// example: 
//      "_id": "categoryid"
//      "name": "Laptop",
//      "specsModel": [{
//          "_id": "ramid",
//          "name": "RamNewName",
//          "values": [
//              {"_id": "4gbid", "value": "4gbNewName"},
//              {"_id": "8gbid", "value": "8gbNewName"},
//          ]
//      }, {
//          "_id": "displayid",
//          "name": "Độ phân giải Display",
//          "values": [
//              {"_id": "1920x1080id", "value": "FullHD"},
//              {"_id": "1366x768id", "value": "HD"}
//          ]
//      }],
//      "image_base64": .....
route.post("/category/update", Default.Role("Admin"), Category.Update)

// field: _id, name
// type: 
//      _id: string
//      name: string
// rule: _id | name
route.post("/category/read", Category.Read)

// header: accessToken - role: Admin - field: _id, name
// type: 
//      _id: string
//      name: string
// rule: _id | name
route.post("/category/delete", Default.Role("Admin"), Category.Delete)


export const categoryRoute = route
