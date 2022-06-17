import e, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Product } from '../models/product';
import { config } from '../services/config';
import { Discount } from '../models/discount';
import { Bill } from '../models/bill';
import { Account, IAccount } from '../models/account';
import mongoose from 'mongoose';
import { fromObject } from '../services/support';


export const Calculate = async (req: Request, res: Response, next: NextFunction) => {
    const discountCode: string = req.body.discountCode
    const bag_details: any[] = req.body.bag_details
    const address: any = req.body.address
    const account = req.body.account

    if (!bag_details || bag_details.length == 0)
        return res.status(400).send({ msg: "Giỏ hàng rỗng. " + req.body.valid_bag_msg })

    var ship: number = -1
    var total: number = 0
    var weight: number = 0
    var reduce: number = 0
    var msg: string = ""

    bag_details.forEach(e => {
        total += e.product.price * e.quantity
        reduce += e.product.price * e.quantity * e.product.sale
        weight += e.quantity * 500 // 500gr for each obj
    })


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
        const result = await axios.get(config.ghtk_url + fromObject(data), { headers: { "Token": `${process.env.GHTK_API_TOKEN}` } })
        if (result.status == 200) {
            const fee = result.data.fee
            if (fee.delivery == true)
                ship = fee.fee + fee.insurance_fee + fee.include_vat
            else msg += "Đơn hàng không thể vận chuyển tới địa chỉ này. "
        } else msg += `Xảy ra lỗi khi tính toán giá ship. `
    } else msg += "Chưa có địa chỉ. "

    if (!!discountCode) {
        const discount = await Discount.findOne({ code: discountCode })
        if (!!discount && discount.quantity > 0) {
            if (discount.is_oic && discount.used.hasOwnProperty(account._id)) {
                msg += "Mã discount không thể sử dụng nhiều lần. "
            } else if (discount.is_oid && discount.used.hasOwnProperty(account._id) && (Date.now() - discount.used[account._id]) < 86400000) {
                msg += "Mã discount không thể sử dụng nhiều lần trong 24h. "
            } else if (total < discount.minPrice) {
                msg += `Mã discount chỉ áp dụng cho đơn hàng > ${discount.minPrice}. `
            } else if (discount.is_ship) {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= ship
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                if (temp > ship)
                    temp = ship
                // @ts-ignore
                reduce += temp
            } else {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= total / 100
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                // @ts-ignore
                reduce += temp
            }
        } else {
            msg += "Mã discount không tồn tại. "
        }
    }

    res.send({ msg: config.success, warning: req.body.valid_bag_msg + msg, data: { bag_details, ship, total, discount: reduce } })
}

export const Create = async (req: Request, res: Response, next: NextFunction) => {
    const discountCode: string = req.body.discountCode
    const bag_details: any[] = req.body.bag_details
    const address: any = req.body.address
    const account = req.body.account
    if (!account.phone)
        return res.status(400).send({ msg: "Thiếu số điện thoại. " })

    if (!account.enable)
        return res.status(400).send({ msg: "Người dùng bị đóng băng khỏi việc mua bán. " })

    if (!bag_details || bag_details.length == 0)
        return res.status(400).send({ msg: "Giỏ hàng rỗng. " + req.body.valid_bag_msg })

    var ship: number = -1
    var total: number = 0
    var weight: number = 0
    var reduce: number = 0
    var msg: string = ""

    if (!!req.body.valid_bag_msg)
        return res.status(400).send({ msg: req.body.valid_bag_msg })

    bag_details.forEach(e => {
        total += e.product.price * e.quantity
        reduce += e.product.price * e.quantity * e.product.sale
        weight += e.quantity * 500 // 500gr for each obj
    })


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
        const result = await axios.get(config.ghtk_url + fromObject(data), { headers: { "Token": `${process.env.GHTK_API_TOKEN}` } })
        if (result.status == 200) {
            const fee = result.data.fee
            if (fee.delivery == true)
                ship = fee.fee + fee.insurance_fee + fee.include_vat
            else msg += "Đơn hàng không thể vận chuyển tới địa chỉ này. "
        } else msg += `Xảy ra lỗi khi tính toán giá ship. `
    }
    if (ship == -1)
        return res.status(400).send({ msg: config.err400 })

    var discount;
    if (!!discountCode) {
        discount = await Discount.findOne({ code: discountCode })
        if (!!discount && discount.quantity > 0) {
            if (discount.is_oic && discount.used.hasOwnProperty(account._id)) {
                msg += "Mã discount không thể sử dụng nhiều lần. "
            } else if (discount.is_oid && discount.used.hasOwnProperty(account._id) && (Date.now() - discount.used[account._id]) < 86400000) {
                msg += "Mã discount không thể sử dụng nhiều lần trong 24h. "
            } else if (total < discount.minPrice) {
                msg += `Mã discount chỉ áp dụng cho đơn hàng > ${discount.minPrice}`
            } else if (discount.is_ship) {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= ship
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                if (temp > ship)
                    temp = ship
                // @ts-ignore
                reduce += temp
            } else {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= total / 100
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                // @ts-ignore
                reduce += temp
            }
        } else {
            msg += "Mã discount không tồn tại. "
        }
    }

    const products: any[] = []
    bag_details.forEach(i => products.push({ product: i.product._id, quantity: i.quanity, price: i.product.price, sale: i.product.sale }))

    const bill = new Bill({ account: account._id, phone: account.phone, address, products, discountCode, ship, total, discount: reduce })
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const opts = { session };
        const billDoc = await bill.save(opts)
        const accountDoc = await account.updateOne({ $push: { bills: billDoc._id } }, opts).exec()

        if (!billDoc || !accountDoc ||
            (!!discount && !!(await Discount.findOneAndUpdate({ code: discountCode, quantity: { $gt: 1 } }, { $inc: { quantity: -1 } }).exec())))
            throw Error("Mã discount đã hết số lượng.")

        for (let i = 0; i < products.length; i++) {
            const e = products[i]
            if (!!(await Product.findOneAndUpdate({ _id: e.product, quantity: { $gt: e.quantity } }, { $inc: { quantity: -e.quantity, sold: 1 } }, opts).exec()))
                throw Error(`Sản phẩm số lượng không đủ. ${e.product}`)
        }

        await session.commitTransaction();
        session.endSession();
        return res.send({ msg: config.success })
    } catch (error) {
        console.log(error)
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send({ msg: "Lỗi không lưu bill" })
    }
}

export const Update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id
        const status: string = req.body.status
        const account: any = req.body.account
        const desc: string = req.body.desc

        if (!_id || !status)
            return res.status(400).send({ msg: config.err400 })

        const bill = await Bill.findById(_id)
        if (!bill)
            return res.status(400).send({ msg: config.errNotExists })

        if (bill.status == status)
            return res.send({ msg: config.success })
        else if (account.role == "Customer" && status == "Cancel") {
            // @ts-ignore
            const bills = (await Account.findById(account._id).select("bills")).bills
            // @ts-ignore
            if (bills.includes(_id)) {
                const doc = await Account.findByIdAndUpdate(account._id, { $inc: { self_cancel: 1 } })
                if (!doc) throw Error("Account cannot save")
            } else
                return res.status(400).send({ msg: config.errPermission })
        } else if (account.role != "Admin")
            return res.status(400).send({ msg: config.errPermission })

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const opts = { session };
            bill.status = status
            bill.desc = desc
            bill.markModified("status")
            bill.markModified("desc")
            const billDoc = await bill.save()
            if (!billDoc)
                throw Error("Fail")

            if (status == "Cancel")
                // Refill product
                for (let i = 0; i < bill.products.length; i++) {
                    const e = bill.products[i]
                    if (!!(await Product.findByIdAndUpdate(e.product, { $inc: { quantity: e.quantity, sold: -1 } }, opts).exec()))
                        throw Error("Fail")
                }
            else if (status == "Done") {
                // Add product to rates of account
                const products: any = {}
                for (let i = 0; i < bill.products.length; i++) {
                    products.push({ product: bill.products[i].product })
                }
                if (!!(await Account.findByIdAndUpdate(account._id, { $push: { rate_waits: { $each: products } } }, opts).exec()))
                    throw Error("Fail")
            }

            await session.commitTransaction();
            session.endSession();
            return res.send({ msg: config.success })
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ msg: "Lỗi không lưu bill" })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send({ msg: config.err500 })
    }
}

export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const search: string = req.body.search
        const status: string = req.body.status
        const sortName: string = req.body.sortName
        const sortType: number = req.body.sortType

        var sortOptions: any = {}
        var queryOptions: any = { status }

        if (!!sortName && ["ship", "total", "discount"].includes(sortName) && (sortType == 1 || sortType == -1)) {
            sortOptions[sortName] = sortType
        }
        if (!!search) {
            const pattern = { $regex: '.*' + search + '.*', $options: "i" }
            queryOptions['$or'] = [
                { phone: pattern },
                { 'address.provine': pattern },
                { 'address.district': pattern },
                { 'address.address': pattern },
            ]
        }

        const count = (req.body.skip == undefined) ? await Bill.countDocuments(queryOptions) : undefined
        const result = await Bill.find(queryOptions).sort(sortOptions).skip(skip).limit(limit).select("-products").exec()
        if (!result)
            return res.status(500).send({ msg: config.err500 })

        return res.send({ msg: config.success, data: result, count: count })
    } catch (err) {
        console.log(err)
        res.status(500).send({ msg: config.err500 })
    }
}

export const Read = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id = req.body._id
        const account: IAccount = req.body.account

        if (account.role == "Customer" && !account.bills.includes(_id)) {
            return res.status(400).send({ msg: config.errPermission })
        }

        Bill.findById(_id).populate({
            path: 'products',
            populate: {
                path: 'product',
                model: 'Product',
                select: 'name code image_url colors'
            }
        }).exec((err, doc) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if (!doc) return res.status(400).send({ msg: config.err400 })
            return res.send({ msg: config.success, data: doc })
        })
    } catch (err) {
        console.log(err)
        res.status(500).send({ msg: config.err500 })
    }
}