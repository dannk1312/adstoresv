import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as image from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";
import { Import } from "../models/import";

export const ProductCreate = async (req: Request, res: Response, next: NextFunction) => {
    const name: string = req.body.name
    const code: string = req.body.code
    const desc: string = req.body.desc
    const colors: any = req.body.colors        //  [{color: "Red", image_base64: "?"}]
    const category_id: string = req.body.category_id      // id
    const specs_link: any = req.body.specs_link  // {spec_id: value_id}
    const price: number = req.body.price
    const sale: number = req.body.sale
    const catalogue: any[] = req.body.catalogue;

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

    // Handle Catalogue
    var saved_cata: any = []
    for (let i = 0; i < catalogue.length; i++) {
        if (!!catalogue[i].image_base64) {
            var img_info = await image.upload(image.base64(catalogue[i].image_base64), "product_catalogue")
            if (!!img_info) {
                saved_cata.push({
                    image_id: img_info.public_id,
                    image_url: img_info.url
                })
            }
        }
    }

    if (saved_cata.length == 0)
        return res.status(400).send({ msg: config.err400 })

    var product = new Product({ name, code, desc, colors: saved_colors, category: category_id, specs_link, price, sale, catalogue: saved_cata })
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
        if (err) return res.status(500).send({ msg: config.err500 })
        if (!doc) return res.status(400).send({ msg: config.err400 })

        return res.send({ msg: config.success, data: await doc.info() })
    });
}

export const ProductReadComment = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id;
    const skip: number = req.body.skip ?? 0;
    const limit: number = req.body.skip ?? 20;
    Product.findById(_id).select("comments").slice("comments", [skip, limit]).populate("comments.account").exec((err, doc) => {
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

export const ProductUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id;
        const desc: string = req.body.desc
        const colors: any = req.body.colors
        const price: number = req.body.price
        const enable: boolean = req.body.enable
        const specs_link: number = req.body.specs_link
        const sale: number = req.body.sale
        const catalogue: any[] = req.body.catalogue;

        // Get product
        if (!_id)
            return res.status(400).send({ msg: config.err400 })

        const product = await Product.findById(_id).select("-comments");

        if (!product)
            return res.status(400).send({ msg: config.err400 })

        if (enable !== undefined) {
            product.markModified('enable')
            product.enable = enable
        }

        if (!!specs_link) {
            product.markModified('specs_link')
            product.specs_link = specs_link
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

        if (!!catalogue) {
            product.markModified('catalogue')
            // Remove deleted image
            for (let i = 0; i < product.catalogue.length; i++) {
                var flag = false
                for (let j = 0; j < catalogue.length; j++) {
                    if (catalogue[j].image_id == product.catalogue[i].image_id) {
                        flag = true
                        break
                    }
                }
                if (!flag) {
                    image.destroy(product.catalogue[i].image_id)
                }
            }
            // Add new image
            for (let i = 0; i < catalogue.length; i++) {
                if (!!catalogue[i].image_base64) {
                    var img_info = await image.upload(image.base64(catalogue[i].image_base64), "product_catalogue")
                    if (!!img_info) {
                        product.catalogue.push({
                            image_id: img_info.public_id,
                            image_url: img_info.url
                        })
                    }
                }
            }
        }

        if (!!colors) {
            product.markModified('colors')
            // Remove deleted color and update color exists
            for (let i = 0; i < product.colors.length; i++) {
                var flag = false
                for (let j = 0; j < colors.length; j++) {
                    if (colors[j].color == product.colors[i].color) {
                        if (!!colors[j].image_base64) {
                            image.destroy(product.colors[i].image_id)
                            var img_info = await image.upload(image.base64(colors[j].image_base64), "product_catalogue")
                            if (!!img_info) {
                                product.colors[i].image_id = img_info.public_id,
                                    product.colors[i].image_url = img_info.url
                            }
                            colors[j].image_base64 = undefined
                        }
                        flag = true
                        break
                    }
                }
                if (!flag) {
                    image.destroy(product.catalogue[i].image_id)
                }
            }
            // Add new image
            for (let i = 0; i < colors.length; i++) {
                if (!!colors[i].image_base64) {
                    var img_info = await image.upload(image.base64(catalogue[i].image_base64), "product_catalogue")
                    if (!!img_info)
                        product.colors.push({
                            color: colors[i].color,
                            image_id: img_info.public_id,
                            image_url: img_info.url
                        })
                }
            }
        }
        // Save
        product.save((err: any) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            return res.send({ msg: config.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }

}

export const ProductImport = async (req: Request, res: Response, next: NextFunction) => {
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
    const bag_details : any[] = []
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
                bag_details.push({product: doc, quantity: e.quanity})
            }
            else {
                e.quanity = doc.quantity
                new_bag.push(e)
                bag_details.push({product: doc, quantity: e.quanity})
                msg += `Vật phẩm ${doc.name} - ${doc.code} không đủ số lượng, chỉ có ${doc.quantity}. `
            }
        } else {
            msg + `Vật phẩm ${e.product} không tồn tại. `
        }
    }
    if(new_bag.length == 0) 
        return res.send({ msg: "Giỏ hàng rỗng" })
    req.body.bag = new_bag
    req.body.bag_details = bag_details
    req.body.valid_bag_msg = msg
    next()
}
