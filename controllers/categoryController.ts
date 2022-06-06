import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";

export const CategoryCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name: string = req.body.name;
        const image_base64: string = req.body.name;
        const specsModel: any = req.body.name;   // [{name: "Ram", values: [{value: "2gb"}, {value: "4gb"}]}]
        if (!name || !image_base64 || !specsModel)
            return res.status(400).send({ msg: config.err400 })

        // Try to save category
        const category = new Category({
            name: name,
            specsModel: specsModel
        })
        const category_doc = await category.save()
        if (!category_doc)
            return res.status(400).send({ msg: config.err400 })

        // Save image 
        var img_info = await image.upload(image.base64(image_base64), "category")
        if (!img_info) return res.send({ msg: config.success + " without image." })
        category_doc.image_id = img_info.public_id
        category_doc.image_url = img_info.url

        //and save category again
        if (!(await category_doc.save()))
            return res.status(400).send({ msg: config.err400 })
        return res.send({ msg: config.success })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const CategoryUpdate = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id;
    const name: string = req.body.name;
    const image_base64: string = req.body.name;
    const specsModel: any = req.body.name;   // [{_id, name: "Ram", values: [{_id, value: "2gb"}, {value: "4gb"}]}]
    if (!_id || (!name && !image_base64 && !specsModel))
        return res.status(400).send({ msg: config.err400 })

    // Gte category with id
    var category = await Category.findById(_id);
    // Check name exists
    if (!category || (name && !!(await Category.findOne({ _id: { $ne: _id }, name }))))
        return res.status(400).send({ msg: config.err400 })
    else
        category.name = name

    // Apply new specs model
    // @ts-ignore
    if (!!specsModel && category.checkNewSpecsModel(specsModel))
        category.specsModel = specsModel
    else
        return res.status(400).send({ msg: config.err400 })

    if (!!image_base64) {
        if (!!category.image_id)
            image.destroy(category.image_id)

        const category_doc = await category.save()
        if (!category_doc)
            return res.status(400).send({ msg: config.err400 })

        // Save image 
        var img_info = await image.upload(image.base64(image_base64), "category")
        if (!img_info) return res.send({ msg: config.success + " without image." })
        category_doc.image_id = img_info.public_id
        category_doc.image_url = img_info.url

        //and save category again
        if (!(await category_doc.save()))
            return res.status(400).send({ msg: config.err400 })
        return res.send({ msg: config.success })
    } else {
        category.save((save_err) => {
            if (save_err) return res.status(500).send({ msg: config.err500 })
            res.send({ msg: config.success })
        })
    }
}

export const CategoryRead = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name;
    if (!name)
        return res.status(400).send({ msg: config.err400 })

    Category.findOne({ name: name }, (err: any, doc: any) => {
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.errExists })
        return res.send({ msg: config.success, data: doc.info })
    })
}

export const CategoryList = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const data = await Category.surfaces();
    if (data)
        return res.send({ msg: config.success, data })
    return res.status(400).send({ msg: config.err400 })
}

export const CategoryDelete = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name;
    if (!name)
        return res.status(400).send({ msg: config.err400 })

    const category = await Category.findOne({ name })
    if (!category)
        return res.status(400).send({ msg: config.errExists })
    if (category.products.length > 0) {
        return res.send({ msg: config.failure, reason: `Category relate ${category.products.length} products` })
    }
    category.deleteOne((err) => {
        if (err)
            return res.status(500).send({ msg: config.err500 })
        return res.send({ msg: config.success })
    })
}

export const CategoryQuery = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name;
    const specs: any = req.body.specs; // {name: value}
    if (!name)
        return res.status(400).send({ msg: config.err400 })
    const category = await Category.findOne({ name });
    if (!category)
        return res.status(400).send({ msg: config.err400 })

    var products = category.products;

    if (!!specs)
        //query result 
        for (let i = 0; i < category.specsModel.length && products.length > 0; i++) {
            const e = category.specsModel[i];

            if (specs.hasOwnProperty(e.name)) {
                var value = specs[e.name]
                for (let j = 0; j < e.values.length; j++) {
                    if (e.values[j].value == value) {
                        const value_products = e.values[j].products;
                        products = products.filter(e => value_products.includes(e));
                        break;
                    }
                }
            }
        }


    if (products.length == 0)
        return res.send({ msg: config.success, data: [] })

    const result = await Product.find({ '_id': { $in: products } }).select('-colors -comments -desc').exec();
    if (!result)
        return res.status(500).send({ msg: config.err500 })
    return res.send({ msg: config.success, data: result })
}


