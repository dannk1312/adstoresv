import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";

export const ProductCreate = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name
    const code: string = req.body.code
    const desc: string = req.body.desc
    const colors: any = req.body.colors        //  [{color: "Red", image_base64: "?"}]
    const category_id: string = req.body.category_id      // id
    const specs_link: any = req.body.specs_link  // {spec_id: value_id}
    const price: number = req.body.price
    const sale: number = req.body.sale

    // Handle Required Data
    if (!name || !code || !colors || colors.length == 0 || !category_id || !specs_link || !price) {
        return res.status(400).send({ msg: config.err400 })
    }

    // Handle Category & Specs Link
    var category = await Category.findById(category_id);

    // @ts-ignore
    if (!category || category.checkProductSpecsLink(specs_link))
        return res.status(400).send({ msg: config.err400 })

    // Handle Colors
    var saved_colors: any = []
    for (let i = 0; i < colors.length; i++) {
        const e = colors[i];
        const img_info = await image.upload(image.base64(e.image_base64), "product");
        if (!!img_info)
            saved_colors.push({
                color: e.color,
                image_id: img_info.public_id,
                image_url: img_info.url
            })
    }

    if (saved_colors.length == 0)
        return res.status(400).send({ msg: config.err400 })

    var product = new Product({ name, code, desc, colors: saved_colors, category: category_id, specs_link, price, sale })
    product.save((err, doc) => {
        if (!err && !!doc) {
            // @ts-ignore
            category?.addProduct(doc)
            console.log(category?.specsModel)
            category?.save() // need to use transaction on this, but idc
            return res.send({ msg: config.success })
        }

        saved_colors.forEach((e: { image_id: string; }) => image.destroy(e.image_id))

        console.log(err)
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.err400 })
    })
}


export const ProductRead = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id;
    Product.findById(_id, async (err: any, doc: any) => {
        if(err) return res.status(500).send({msg: config.err500 })
        if(!doc) return res.status(400).send({msg: config.err400})
        
        return res.send({msg: config.success, data: await doc.info()})
    });
}
