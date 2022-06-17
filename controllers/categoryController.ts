import mongoose, { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";

export const Create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name: string = req.body.name;
        const image_base64: string = req.body.image_base64;
        const specsModel: any = req.body.specsModel;   // [{name: "Ram", values: [{value: "2gb"}, {value: "4gb"}]}]
        // @ts-ignore
        if (!name || !image_base64 || !specsModel || !Category.checkSpecsModel(specsModel))
            return res.status(400).send({ msg: config.err400 })

        var img_info = await image.upload(image.base64(image_base64), "category")
        if (!img_info) return res.status(500).send({ msg: config.errSaveImage })

        // Try to save category
        const category = new Category({
            name: name,
            specsModel: specsModel,
            image_id: img_info.public_id,
            image_url: img_info.url,
        })
        category.save((err, doc) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if (!doc) return res.status(400).send({ msg: config.err400 })
            return res.send({ msg: config.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id;
        const name: string = req.body.name;
        const image_base64: string = req.body.image_base64;
        const specsModel: any = req.body.specsModel;


        if (!_id || (!name && !image_base64 && !specsModel))
            return res.status(400).send({ msg: config.err400 })

        var category = await Category.findById(_id);
        if (!category)
            return res.status(400).send({ msg: config.err400 })

        var msg = ""
        var old_image_id = category.image_id
        var img_info: any;
        if (!!image_base64) {
            img_info = await image.upload(image.base64(image_base64), "category")
            if (img_info) {
                category.image_id = img_info.public_id
                category.image_url = img_info.url
                var categoryDoc = await category.save()
                if (!categoryDoc) {
                    image.destroy(img_info.public_id)
                    msg += "Lưu ảnh thất bại. "
                } else {
                    image.destroy(old_image_id)
                    msg += "Lưu ảnh thành công. "
                }
            }
        }

        if (!!specsModel || !!name) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const opts = { session };

                if((!!name && !(await Category.findOne({ _id: { $ne: _id }, name }))))
                {
                    category.name = name
                    console.log(name)
                    for(let  i = 0; i < category.products.length; i++) {
                        if(!(await Product.findByIdAndUpdate(category.products[i], {"category": name}, opts).exec()))
                            throw Error()
                    }
                }

                if(!!specsModel) {
                    // @ts-ignore
                    await category.saveSpecsModel(specsModel, opts)
                } else {
                    if(!(await category.save(opts)))
                        throw Error()
                }
                await session.commitTransaction();
                session.endSession();
                res.send({msg: config.success})
            } catch (error) {
                console.log(error)
                await session.abortTransaction();
                session.endSession();
                return res.status(500).send({ msg: "Lỗi không lưu đồng bộ với category" })
            }
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Read = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name: string = req.body.name;
        const _id: string = req.body._id;
        if (!name && !_id)
            return res.status(400).send({ msg: config.err400 })

        Category.findOne({ $or: [{ '_id': _id }, { 'name': name }] }, (err: any, doc: any) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if (!doc) return res.status(400).send({ msg: config.errNotExists })
            return res.send({ msg: config.success, data: doc.info })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const data = await Category.surfaces();
        if (data)
            return res.send({ msg: config.success, data })
        return res.status(400).send({ msg: config.err400 })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name: string = req.body.name;
        const _id: string = req.body._id;
        if (!name && !_id)
            return res.status(400).send({ msg: config.err400 })

        const category = await Category.findOne({ $or: [{ '_id': _id }, { 'name': name }] })
        if (!category)
            return res.status(400).send({ msg: config.errNotExists })
        if (category.products.length > 0) {
            return res.send({ msg: config.failure, reason: `Category relate ${category.products.length} products` })
        }
        category.deleteOne((err) => {
            if (err)
                return res.status(500).send({ msg: config.err500 })
            image.destroy(category.image_id)
            return res.send({ msg: config.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

