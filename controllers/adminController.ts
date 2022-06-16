import mongoose, { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";
import { Import } from "../models/import";
import { Account } from "../models/account";
import { Bill } from "../models/bill";
import { create } from "domain";

export const ImportStatistical = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var dateStart: Date = req.body.dateStart;
        var dateEnd: Date = req.body.dateEnd;
        var step: string = req.body.step;

        if (!dateEnd) dateEnd = new Date(Date.now())
        if (!step || !["second", "day", "month", "year"].includes(step)) step = "month"

        var step_time = (step == "year" ? config.yearlong : step == "month" ? config.monthlong : step == "day" ? config.daylong : 1)
        var smallest: number = dateEnd.getTime() - step_time;
        if (!dateStart || dateStart.getTime() > smallest) dateStart = new Date(smallest)

        Import.find({
            createAt: {
                $gte: dateStart,
                $lte: dateEnd,
            }
        }).exec((err, bills) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            // Gom nhom du lieu
            var counter: any = {}
            var graph: any = []

            var time = dateStart
            var threshold = time.getTime() + step_time
            var point: any = { "bills": [], "total": 0, time }
            bills.forEach(b => {
                if (b.createdAt.getTime() > threshold) {
                    graph.push(point)
                    time = new Date(threshold)
                    threshold = time.getTime() + step_time
                    point = { "bills": [], "total": 0, time }
                }
                var total = 0
                b.data.forEach(d => {
                    var key = d.product.toString()
                    var price = d.quantity * d.price
                    if (counter.hasOwnProperty(d.product)) {
                        counter[key].count += 1
                        counter[key].total += price
                    }
                    else {
                        counter[key] = {"count": 1, "total": price}
                    }
                    total += price
                })
                point.bills.push({ "_id": b._id, "price": total })
                point.total += total
            })

            var ids = Array.from(Object.keys(counter))
            Product.find({"_id": {$in: ids}}).select("name code colors").exec((err, docs) => {
                if(err) return res.send({msg: config.success, data: { graph }})
                // @ts-ignore
                var products = docs.filter(d => { 
                    var key = d._id.toString()
                    return {
                        "name": d.name, 
                        "code": d.code, 
                        "colors": d.colors, 
                        "count": counter[key].count,
                        "total": counter[key].total,
                };})
                return res.send({msg: config.success, data: { graph, products }})
            })

        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }

}