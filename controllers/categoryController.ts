import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";

export const Create = async (req: Request, res: Response, next: NextFunction) => {
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
        console.log(img_info)
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

export const Update = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id;
    const name: string = req.body.name;
    const image_base64: string = req.body.image_base64;
    const specsModel: any = req.body.specsModel;   // [{_id, name: "Ram", values: [{_id, value: "2gb"}, {value: "4gb"}]}]
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

export const Read = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name;
    const _id: string = req.body._id;
    if (!name && !_id)
        return res.status(400).send({ msg: config.err400 })

    Category.findOne({ $or:[ {'_id': _id}, {'name': name}] }, (err: any, doc: any) => {
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.errNotExists })
        return res.send({ msg: config.success, data: doc.info })
    })
}

export const List = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const data = await Category.surfaces();
    if (data)
        return res.send({ msg: config.success, data })
    return res.status(400).send({ msg: config.err400 })
}

export const Delete = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name;
    const _id: string = req.body._id;
    if (!name && !_id)
        return res.status(400).send({ msg: config.err400 })

    const category = await Category.findOne({ $or:[ {'_id': _id}, {'name': name}] })
    if (!category)
        return res.status(400).send({ msg: config.errNotExists })
    if (category.products.length > 0) {
        return res.send({ msg: config.failure, reason: `Category relate ${category.products.length} products` })
    }
    category.deleteOne((err) => {
        if (err)
            return res.status(500).send({ msg: config.err500 })
        return res.send({ msg: config.success })
    })
}

export const Query = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name
    const specs: any = req.body.specs??{} // {name: value}
    const min_price: number = req.body.min_price??0
    const max_price: number = req.body.max_price??1000000000
    const colors: string[] = req.body.colors
    const skip: number = req.body.skip??0
    const limit: number = req.body.limit??20

    if (!name)
        return res.status(400).send({ msg: config.err400 })
    const category = await Category.findOne({ name });
    if (!category)
        return res.status(400).send({ msg: config.err400 })

    var products = category.products;

    if (!!specs) {
        //query result 
        for (let i = 0; i < category.specsModel.length && products.length > 0; i++) {
            const e = category.specsModel[i];
            var specsProduct: string[] = []

            if (specs.hasOwnProperty(e.name)) {
                var values: string[] = specs[e.name]
                for (let j = 0; j < e.values.length; j++) {
                    if (values.includes(e.values[j].value)) {
                        e.values[j].products.forEach(id => specsProduct.push(id.toString()))
                    }
                }
            }
            // Types.ObjectId cannot use with includes
            products = products.filter(id => specsProduct.includes(id.toString()));
        }
    }

    if (products.length == 0)
        if(req.body.skip == undefined)
            return res.send({ msg: config.success, data: [], count: 0 })
        else 
            return res.send({ msg: config.success, data: []})
            
    var options: any = { '_id': { $in: products }, price: { $lte: max_price, $gte: min_price }}
    if(!!colors)
        options["colors.color"] = { $in: colors}

    var count = (req.body.skip == undefined) ? await Product.countDocuments(options): undefined
    var result = await Product
    .find(options)
    .skip(skip)
    .limit(limit)
    .select('-colors -comments -desc -specs_link -category')
    .exec();
    if (!result)
        return res.status(500).send({ msg: config.err500 })

    const edit_result: any[] = []
    for (let i = 0; i < result.length; i++) {
        edit_result.push(result[i].toJSON())
        edit_result[i].category = category.name;
    }
    return res.send({ msg: config.success, data: edit_result, count: count })
}


