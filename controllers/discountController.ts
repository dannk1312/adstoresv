import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import { Discount } from '../models/discount';
import { Product } from '../models/product';
import { config, mess } from '../services/config';
import { SendNotificationsFunc } from './accountController';


export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const search: string = req.body.string
        const is_percent: boolean = req.body.is_percent
        const is_ship: boolean = req.body.is_ship
        const is_oid: boolean = req.body.is_oid
        const is_oic: boolean = req.body.is_oic
        const sortValue: number = req.body.sortValue
        const fromDate: Date = req.body.fromDate
        const toDate: Date = req.body.toDate

        var sortOptions: any = {}
        var queryOptions: any = {}

        if (!!fromDate)
            queryOptions["dateStart"] = { $gte: fromDate }

        if (is_percent != undefined)
            queryOptions["is_percent"] = is_percent

        if (is_ship != undefined)
            queryOptions["is_ship"] = is_ship

        if (is_oid != undefined)
            queryOptions["is_oid"] = is_oid

        if (is_oic != undefined)
            queryOptions["is_oic"] = is_oic

        if (!!toDate)
            queryOptions["dateEnd"] = { $lte: toDate }

        if (sortValue == 1 || sortValue == -1) {
            sortOptions["value"] = sortValue
        }

        if (!!search) {
            const pattern = { $regex: '.*' + search + '.*', $options: "i" }
            queryOptions['code'] = pattern
        }

        const count = (req.body.skip == undefined) ? await Discount.countDocuments(queryOptions) : undefined
        Discount.find(queryOptions).sort(sortOptions).skip(skip).limit(limit).select("-products -categories -accounts -used").exec((err, docs) => {
            if(err) return res.status(500).send({msg: err.message})
            return res.send({ msg: config.success, data: docs, count: count })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const Create = async (req: Request, res: Response, next: NextFunction) => {
    const code: string = req.body.code
    const enable: boolean = req.body.enable

    const dateStart: Date = req.body.dateStart
    const dateEnd: Date = req.body.dateEnd
    const quantity: number = req.body.quantity

    const minPrice: number = req.body.minPrice
    const maxPrice: number = req.body.maxPrice

    const is_percent: boolean = req.body.is_percent
    const is_ship: boolean = req.body.is_ship
    const is_oid: boolean = req.body.is_oid
    const is_oic: boolean = req.body.is_oic
    const value: boolean = req.body.value

    if(!code) return res.status(400).send({msg: mess.errMissField + "[Code]. "})
    if(!value) return res.status(400).send({msg: mess.errMissField + "[Value]. "})

    const discount = new Discount({
        code, enable, dateStart, dateEnd, quantity, minPrice, maxPrice, is_percent, is_ship,
        is_oid, is_oic, value
    })

    discount.save((err, doc) => {
        if (err) return res.status(500).send({ msg: err.message })
        if (!doc) return res.status(400).send({ msg: mess.errMissField })
        return res.send({ msg: mess.success })
    })
}

export const Update = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const enable: boolean = req.body.enable
    const categories_del: any[] = req.body.categories
    const products_del: any[] = req.body.products
    const accounts_del: any[] = req.body.accounts

    const categories_add: any[] = req.body.categories_add
    const products_add: any[] = req.body.products_add
    const accounts_add: any[] = req.body.caccounts_add
    const quantity: number = req.body.quanity
    
    if (!_id && !code) return res.status(400).send({ msg: mess.errMissField + "[_id/code]. " })
    const discount = await Discount.findOne({ $or: [{ _id: _id }, { code: code }] }).select("-used")
    if (!discount) return res.status(400).send({ msg: mess.errWrongField + "[_id/code]. " })

    if (enable != undefined) {
        discount.markModified("enable")
        discount.enable = enable
    }

    if (!!categories_del) {
        discount.markModified("categories")
        discount.categories = discount.categories.filter(e => !categories_del.includes(e))
    }

    if (!!products_del) {
        discount.markModified("products")
        discount.products = discount.products.filter(e => !products_del.includes(e))
    }

    if (!!accounts_del) {
        discount.markModified("accounts")
        discount.accounts = discount.accounts.filter(e => !accounts_del.includes(e))
    }

    if (!!categories_add) {
        discount.markModified("categories")
        categories_add.forEach(e => discount.categories.push(e))
    }

    if (!!products_add) {
        discount.markModified("products")
        products_add.forEach(e => discount.products.push(e))
    }

    if (!!accounts_add) {
        discount.markModified("accounts")
        accounts_add.forEach(async e => {
            if (await SendNotificationsFunc(e, `Bạn vừa được liên kết với mã Discount ${discount.code}`))
                discount.accounts.push(e)
        })
    }

    if (!!quantity) {
        discount.markModified("quantity")
        discount.quantity = quantity
    }

    discount.save((err, doc) => {
        if (err) return res.status(500).send({ msg: err.message })
        if (!doc) return res.status(400).send({ msg: mess.errMissField })
        return res.send({ msg: mess.success })
    })
}

export const Read = async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code

    if (!_id && !code) return res.status(400).send({ msg: mess.errMissField + "[_id/code]. " })
    const discount = await Discount.findOne({ $or: [{ _id: _id }, { code: code }] }).select("-used")
    if (!discount) return res.status(400).send({ msg: mess.errWrongField + "[_id/code]. " })

    var desc = ""
    desc += `Bắt đầu từ ${discount.dateStart} và ${!discount.dateEnd?"không có hạn kết thúc": "kết thúc vào " + discount.dateEnd.toString()}. \n`
    desc += !discount.quantity?"Không có số lượng cụ thể. ": `Tổng cộng còn ${discount.quantity} lượt dùng. ` + "\n"
    desc += `Đơn hàng ${!discount.minPrice?"không có hạn mức thấp nhất": "phải đạt trên " + discount.minPrice} để sử dụng mã này. \n`
    desc += discount.is_oic?"Mỗi khách hàng chỉ dùng 1 lần. \n":"Không có giới hạn sử dụng đối với khách hàng. \n"
    desc += `Khuyến mãi ${!discount.maxPrice?"không có hạn mức cao nhất": "có hạn mức cao nhất là " + discount.maxPrice}. \n`
    desc += `Khuyến mãi ${discount.is_percent?"giảm " + discount.value + " phần trăm": "giảm " + discount.value + " VND"} `
    desc += ` của ${discount.is_ship?"phí ship":"đơn hàng"}. \n`
    desc += discount.is_oid?"Mỗi ngày chỉ dùng 1 lần. \n":"Không có giới hạn sử dụng trong ngày. \n"
    desc += discount.is_oic?"Mỗi khách hàng chỉ dùng 1 lần. \n":"Không có giới hạn sử dụng đối với khách hàng. \n"
    return res.send({msg: mess.success, data: {code, desc}})
}