import mongoose, { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";
import { Import } from "../models/import";

export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 20

        const count = (req.body.skip == undefined) ? await Product.countDocuments() : undefined
        const result = await Product.find().skip(skip).limit(limit).select("-colors -comments -desc -specs_link -category").exec()
        if (!result)
            return res.status(500).send({ msg: config.err500 })

        return res.send({ msg: config.success, data: result, count: count })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Create = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name
    const code: string = req.body.code
    const desc: string = req.body.desc
    const category: string = req.body.category
    const specs: any = req.body.specs
    const price: number = req.body.price
    const sale: number = req.body.sale
    const image_base64: string = req.body.image_base64

    // Handle Required Data
    if (!name || !code || !category || !specs || !price || !image_base64) {
        return res.status(400).send({ msg: config.err400 })
    }

    const img_info = await image.upload(image.base64(image_base64), "product_image");
    if (!img_info) return res.status(500).send({ msg: config.errSaveImage })

    // Handle Category & Specs
    var categoryDoc = await Category.findOne({name: category});

    if (!categoryDoc)
        return res.status(400).send({ msg: config.err400 })

    // @ts-ignore
    const specs_link = categoryDoc.getSpecsLink(specs)

    var product = new Product({ name, code, desc, category: categoryDoc._id, specs_link: specs_link, price, sale, image_id: img_info.public_id, image_url: img_info.url })

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const opts = { session };
        const productDoc = await product.save(opts)
        // @ts-ignore
        categoryDoc.addProduct(productDoc)
        categoryDoc = await categoryDoc.save()
        if (!productDoc || !categoryDoc)
            throw Error("Fail")

        await session.commitTransaction();
        session.endSession();
        return res.send({ msg: config.success })
    } catch (error) {
        console.log(error)
        image.destroy(img_info.public_id)
        await session.abortTransaction();
        session.endSession();
        return res.status(500).send({ msg: "Lỗi không lưu đồng bộ với category" })
    }
}

export const Read = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code

    if (!_id && !code)
        return res.status(400).send({ msg: config.err400 })

    Product.findOne({ $or: [{ _id: _id }, { code: code }] }, async (err: any, doc: any) => {
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.err400 })

        return res.send({ msg: config.success, data: await doc.info() })
    });
}

export const ReadComment = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const skip: number = req.body.skip ?? 0
    const limit: number = req.body.skip ?? 20

    Product.findOne({ $or: [{ _id: _id }, { code: code }] }).select("comments").slice("comments", [skip, limit]).populate("comments.account").exec((err, doc) => {
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.errNotExists })
        const edit_result: any[] = []
        for (let i = 0; i < doc.comments.length; i++) {
            const e = doc.comments[i]
            // @ts-ignore
            edit_result.push({ account: e.account.name ?? e.account.email ?? e.account.phone, message: e.message, rate: e.rate, at: e.at })
        }
        return res.send({ msg: config.success, data: edit_result })
    });
}

export const AddColor = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const image_base64: any = req.body.image_base64
    const color: any = req.body.color

    if ((!_id && !code) || !image_base64 || !color)
        return res.status(400).send({ msg: config.err400 })

    const img_info = await image.upload(image.base64(image_base64), "product_color");
    if (!img_info) return res.status(500).send({ msg: config.errSaveImage })
    const color_save = { color: color, image_id: img_info.public_id, image_url: img_info.url }

    Product.findOneAndUpdate({ $or: [{ _id: _id }, { code: code }] }, { $push: { colors: color_save } }).exec((err, doc) => {
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.errNotExists })

        return res.send({ msg: config.success, data: color_save })
    });
}

export const DeleteColor = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const color: string = req.body.color

    if ((!_id && !code) || !color)
        return res.status(400).send({ msg: config.err400 })

    var doc = await Product.findOne({ $or: [{ _id: _id }, { code: code }] }).select("colors").exec()
    if (!doc)
        return res.status(400).send({ msg: config.err400 })

    for (let i = 0; i < doc.colors.length; i++) {
        if (doc.colors[i].color == color) {
            doc.colors.slice(i, 1)
            if (!!(await doc.save())) {
                image.destroy(doc.colors[i].image_id)
            } else
                return res.status(500).send({ msg: config.err500 })
        }
    }
    return res.send({ msg: config.success })
}

export const AddCatalogue = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const image_base64: string = req.body.image_base64

    if ((!_id && !code) || !image_base64)
        return res.status(400).send({ msg: config.err400 })

    const img_info = await image.upload(image.base64(image_base64), "product");
    if (!img_info)
        return res.status(500).send({ msg: config.errSaveImage })
    const catelogue = { image_id: img_info.public_id, image_url: img_info.url }

    Product.findOneAndUpdate({ $or: [{ _id: _id }, { code: code }] }, { $push: { catalogue: catelogue } }).exec((err, doc) => {
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.errNotExists })

        return res.send({ msg: config.success, data: catelogue })
    });
}

export const DeleteCatalogue = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const catalogue_id: string = req.body.catalogue_id

    if ((!_id && !code) || !catalogue_id)
        return res.status(400).send({ msg: config.err400 })

    var doc = await Product.findOne({ $or: [{ _id: _id }, { code: code }] }).select("catalogue").exec()
    if (!doc)
        return res.status(400).send({ msg: config.err400 })

    for (let i = 0; i < doc.colors.length; i++) {
        // @ts-ignore
        if (doc.catalogue[i]._id == catalogue_id) {
            doc.catalogue.slice(i, 1)
            if (!!(await doc.save())) {
                image.destroy(doc.catalogue[i].image_id)
            } else
                return res.status(500).send({ msg: config.err500 })
        }
    }
    return res.send({ msg: config.success })
}

export const Update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id
        const code: string = req.body.code
        const name: string = req.body.name
        const desc: string = req.body.desc
        const price: number = req.body.price
        const enable: boolean = req.body.enable
        const specs: number = req.body.specs
        const sale: number = req.body.sale
        const image_base64: string = req.body.image_base64

        // Get product
        if (!_id && !code)
            return res.status(400).send({ msg: config.err400 })

        const product = await Product.findOne({ $or: [{ _id: _id }, { code: code }] }).select("-comments");

        if (!product)
            return res.status(400).send({ msg: config.err400 })

        if (enable !== undefined) {
            product.markModified('enable')
            product.enable = enable
        }

        if (!!name) {
            product.markModified('name')
            product.name = name
        }

        if (!!specs) {
            product.markModified('specs_link')
            const category = await Category.findById(product.category)
            if (!category)
                return res.status(500).send({ msg: config.err500 })
            // @ts-ignore
            product.specs_link = category.getSpecsLink(specs)
        }

        if (!!desc) {
            product.markModified('desc')
            product.desc = desc
        }

        if (!!price) {
            product.markModified('price')
            product.price = price
        }

        if (!!sale) {
            product.markModified('sale')
            product.sale = sale
        }

        var img_info: any;
        if (!!image_base64) {
            img_info = await image.upload(image.base64(image_base64), "product_color");
            if (!img_info) return res.status(500).send({ msg: config.errSaveImage })
            image.destroy(product.image_id)
            product.image_id = img_info.public_id
            product.image_url = img_info.url
        }

        // Save
        product.save((err: any) => {
            if (err) {
                if(!!img_info)
                    image.destroy(img_info.public_id)
                return res.status(500).send({ msg: config.err500 })
            } 
            return res.send({ msg: config.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }

}

export const Imports = async (req: Request, res: Response, next: NextFunction) => {
    const data = req.body.data // [{code, quanity, price}]
    if (!data)
        return res.status(400).send({ msg: config.err400 })

    const success: any[] = []
    const failure: any[] = []
    for (let i = 0; i < data.length; i++) {
        const { code, quantity, price } = data[i]
        const doc = await Product.findOneAndUpdate({ code }, { $inc: { "quantity": quantity } }).select("_id").exec();
        if (!doc)
            failure.push({ code, quantity, price })
        else
            success.push({ product: doc._id, quantity, price })
    }

    // save add bill
    console.log("Import by Admin: " + req.body.account._id)
    const importBill = new Import({ data: success, admin: req.body.account._id })
    importBill.save((err, doc) => {
        if (err || !doc)
            return res.status(400).send({ msg: config.success + ". Nhưng không thể save import bill, hãy lưu bill xuống file txt và gọi IT để fix lỗi", success, failure })
        return res.send({ msg: config.success, import_bill: doc, failure })
    })
}

export const ValidBag = async (req: Request, res: Response, next: NextFunction) => {
    const bag: any[] = req.body.bag
    if (!bag)
        return res.status(400).send({ msg: config.err400 })

    const new_bag: any[] = []
    const bag_details: any[] = []
    var msg: string = ""
    for (let i = 0; i < bag.length; i++) {
        const e = bag[i];
        const doc = await Product.findById(e.product).select("_id quantity code name price sale").exec()
        if (!!doc) {
            if (doc.enable == false) {
                msg += `Vật phẩm ${doc.name} - ${doc.code} không thể mua vào lúc này. `
            }
            if (doc.quantity > e.quanity) {
                new_bag.push(e)
                bag_details.push({ product: doc, quantity: e.quanity })
            }
            else {
                e.quanity = doc.quantity
                new_bag.push(e)
                bag_details.push({ product: doc, quantity: e.quanity })
                msg += `Vật phẩm ${doc.name} - ${doc.code} không đủ số lượng, chỉ có ${doc.quantity}. `
            }
        } else {
            msg + `Vật phẩm ${e.product} không tồn tại. `
        }
    }
    if (new_bag.length == 0)
        return res.send({ msg: "Giỏ hàng rỗng" })
    req.body.bag = new_bag
    req.body.bag_details = bag_details
    req.body.valid_bag_msg = msg
    next()
}
