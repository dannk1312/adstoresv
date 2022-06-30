import mongoose, { Document, Types } from "mongoose";
import { config } from '../services/config';
import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { Product } from "../models/product";
import { Import } from "../models/import";
import { Bill, IBill } from "../models/bill";
import { fromObject } from "../services/support";
import { shipCalculate } from "./billController";

export const Statistical = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var dateStartStr: string = req.body.dateStart;
        var dateEndStr: string = req.body.dateEnd;
        var step: string = req.body.step;
        var type: string = req.body.type

        var dateStart = new Date(1970, 1, 1);
        var dateEnd = new Date(Date.now());

        if (!!dateEndStr) 
            dateEnd = new Date(dateEndStr)
        if (!!dateStartStr) 
            dateStart = new Date(dateStartStr)
        if (!step || !["second", "day", "month", "year"].includes(step)) 
            step = "month"
        if (!type || !["bill", "import"].includes(type)) 
            type = "bill"

        var step_time = (step == "year" ? config.yearlong : step == "month" ? config.monthlong : step == "day" ? config.daylong : 1)
        var smallest: number = dateEnd.getTime() - step_time;
        if (!dateStart || dateStart.getTime() > smallest) dateStart = new Date(smallest);

        console.log(dateStart, dateEnd)
        const tempModel = (type == "bill" ? Bill : Import)
   
        //@ts-ignore
        tempModel.find({
            createdAt: {
                $gt: dateStart,
                $lt: dateEnd
            }
        }).exec((err: any, bills: (mongoose.Document<unknown, any, IBill> & IBill & {
            _id: Types.ObjectId;
        })[]) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if(bills.length == 0) return res.send({msg: config.success, data: { graph: [], products: [] }})
            // Gom nhom du lieu
            var counter: any = {}
            var graph: any = []

            var time = bills[0].createdAt
            var threshold = time.getTime() + step_time
            var point: any = { "bills": [], "total": 0, time }
            bills.forEach(b => {
                if (b.createdAt.getTime() > threshold) {
                    graph.push(point)
                    time = b.createdAt
                    threshold = time.getTime() + step_time
                    point = { "bills": [], "total": 0, time }
                }
                var total = 0
                b.products.forEach(d => {
                    var key = d.product.toString()
                    var price = d.quantity * d.price
                    if (counter.hasOwnProperty(d.product)) {
                        counter[key].count += d.quantity
                        counter[key].total += price
                    }
                    else {
                        counter[key] = { "count": d.quantity, "total": price }
                    }
                    total += price
                })
                point.bills.push({ "_id": b._id, "price": total })
                point.total += total
            })

            if (point.total > 0)
                graph.push(point)

            var ids = Array.from(Object.keys(counter))
            Product.find({ "_id": { $in: ids } }).select("name code colors image_url").exec((err, docs) => {
                if (err) return res.send({ msg: config.success, data: { graph } })
                // @ts-ignore
                var products: any = []
                docs.forEach(d => {
                    var key = d._id.toString()
                    products.push({
                        "_id": d._id,
                        "name": d.name,
                        "code": d.code,
                        "image_url": d.image_url,
                        "quantity": d.colors.reduce((a: number, b) => a + b.quantity, 0),
                        "sold": counter[key].count,
                        "total": counter[key].total,
                    })
                })
                return res.send({ msg: config.success, data: { graph, products } })
            })

        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }

}

export const CheckShip = async (req: Request, res: Response, next: NextFunction) => {
    const address = req.body.address
    if (!!address) {
        const data = {
            "pick_province": process.env.PICK_PROVINCE,
            "pick_district": process.env.PICK_DISTRICT,
            "pick_address": process.env.PICK_ADDRESS,
            "province": address.province,
            "district": address.district,
            "address": address.address,
            "weight": 3000,
            "value": 10000,
            "transport": "road",
            "deliver_option": "xteam",
            "tags": ["1"] // 1 là dễ vỡ
        }
        const result = await axios.get(config.ghtk_url + fromObject(data), {headers: { "Token": `${process.env.GHTK_API_TOKEN}` }})
        if(result.status == 200) {
            console.log(await shipCalculate(address, 3000, 10000))
        } else {
            console.log("Anw lz")
        }
    } else {
        res.send({ msg: "Address Req" })
    }
}