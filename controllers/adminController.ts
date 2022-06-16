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
        if (!step || !["bill", "day", "month", "year"].includes(step)) step = "month"

        var threshold: number = dateEnd.getTime() - (step == "year" ? config.yearlong : step == "month" ? config.monthlong : config.daylong);
        if (!dateStart || dateStart.getTime() > threshold) dateStart = new Date(threshold)

        Import.find({
            createAt: {
                $gte: dateStart,
                $lte: dateEnd,
            }
        }).exec((err, docs) => {
            if(err) return res.status(500).send({msg: config.err500})
            // Gom nhom du lieu
            var products: any = {}
            docs.forEach(b => {
                var total = 0
                b.data.forEach(d => {
                    if(products.hasOwnProperty(d.product))
                        products[d.product.toString()] += 1
                    else 
                        products[d.product.toString()] = 0
                    total += d.quantity * d.price
                })
                
            })

        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({msg: config.err500})
    }

}