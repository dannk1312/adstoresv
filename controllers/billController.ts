import e, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Product } from '../models/product';
import { config, mess, regex } from '../services/config';
import { Discount, IDiscount } from '../models/discount';
import { Bill } from '../models/bill';
import { Account, IAccount, IBagItem } from '../models/account';
import mongoose from 'mongoose';
import { formatDate, fromObject, sortObject } from '../services/support';
import querystring from 'qs';
import crypto from "crypto";
import { SendMail, SendSMS } from '../services/sender';
import { SendNotification, SendNotificationsFunc } from './accountController';

const shipCalculate = async (address: { province: string, district: string, address: string } | undefined, weight: number, value: number) => {
    var result: { error: string, value: number } = { error: "", value: 0 }
    if (!address || !address.province || !address.district || !address.address) { result.error += "Địa chỉ thiếu. "; return result }
    const data = {
        "pick_province": process.env.PICK_PROVINCE,
        "pick_district": process.env.PICK_DISTRICT,
        "pick_address": process.env.PICK_ADDRESS,
        "province": address.province,
        "district": address.district,
        "address": address.address,
        "weight": weight,
        "value": value,
        "transport": "road",
        "deliver_option": "xteam",
        "tags": ["1"] // 1 là dễ vỡ
    }
    const ghtk = await axios.get(config.ghtk_url + fromObject(data), { headers: { "Token": `${process.env.GHTK_API_TOKEN}` } })
    if (ghtk.status != 200 || ghtk.data.success == false) { result.error += `Xảy ra lỗi khi tính toán giá ship. `; return result }
    const fee = ghtk.data.fee.fee
    result.value = fee
    return result
}

const discountCalculate = async (code: string, bagItems: IBagItem[], total: number, ship: number, account_id: string = "") => {
    var result: { 
        error: string, 
        value: number, 
        doc: mongoose.Document<unknown, any, IDiscount> & IDiscount | undefined 
    } = { error: "", value: 0, doc: undefined }

    // validate
    if (!code) return result
    const discount = await Discount.findOne({ code })
    if (!discount) { result.error += "Mã discount không tồn tại. "; return result }
    if (discount.quantity <= 0) { result.error += "Mã discount hết số lượng. "; return result }
    if (discount.is_oic && discount.used.hasOwnProperty(account_id)) { result.error += "Mã discount không thể sử dụng nhiều lần. "; return result }
    if (discount.is_oid && discount.used.hasOwnProperty(account_id) && (Date.now() - discount.used[account_id]) < config.daylong) { result.error += "Mã discount không thể sử dụng nhiều lần trong 24h. "; return result }
    if (total < discount.minPrice) { result.error += `Mã discount chỉ áp dụng cho đơn hàng > ${discount.minPrice}. `; return result }

    // @ts-ignore
    if (discount.accounts.length > 0 && !discount.accounts.includes(account_id)) { result.error += `Mã discount chỉ áp dụng cho một vài tài khoản. `; return result }
    if (discount.products.length > 0) {
        const item = bagItems.find(e => !discount.products.includes(e.product))
        if (!!item) { result.error += `Mã discount không thể áp dụng cho ${item.name}. `; return result }
    }
    if (discount.categories.length > 0) {
        const item = bagItems.find(e => !discount.categories.includes(e.category))
        if (!!item) { result.error += `Mã discount không thể áp dụng cho ${item.category}. `; return result }
    }

    // calc
    var temp = discount.value
    if (discount.is_ship) result.value = Math.min(discount.is_percent ? temp * ship : temp, discount.maxPrice, ship)
    else result.value = Math.min(discount.is_percent ? temp * total / 100 : temp, discount.maxPrice, total)

    result.doc = discount
    return result
}

export const Calculate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const discountCode: string = req.body.discountCode
        const bagItems: IBagItem[] = req.body.bagItems
        var address: { province: string, district: string, address: string } | undefined = req.body.address
        var account: mongoose.Document<unknown, any, IAccount> & IAccount | null = req.body.account
        const phone: string = req.body.phone
        var warning: string = req.body.warning

        if (!account && !!phone) {
            account = await Account.findOne({ phone })
            if(!regex.phone.test(phone)) warning += mess.errFormatField + "[Phone]. "
        }

        var total: number = 0
        var weight: number = 0
        bagItems.forEach(e => {
            total += e.price * e.quantity
            reduce += e.price * e.quantity * e.sale
            weight += e.quantity * 500 // 500gr for each obj
        })

        console.log(address?.address)
        if(!address) address = account?.address
        var result_ship = await shipCalculate(address, weight, total)
        var ship: number = result_ship.value
        warning += result_ship.error

        var result_discount = await discountCalculate(discountCode, bagItems, total, ship, account!._id.toString() ?? "")
        var reduce: number = result_discount.value
        warning += result_discount.error

        res.send({ msg: config.success, warning, data: { bag_details: bagItems, ship, total, discount: reduce, discountCode, address } })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ config: config.err500 })
    }
}

export const Create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const discountCode: string = req.body.discountCode
        const bagItems: IBagItem[] = req.body.bagItems
        const address: { province: string, district: string, address: string } = req.body.address
        var account: mongoose.Document<unknown, any, IAccount> & IAccount | null = req.body.account
        const phone: string = req.body.phone
        const name: string = req.body.name
        const cod: boolean = req.body.cod
        var warning: string = req.body.warning
        var verify: boolean = false

        if (!bagItems || bagItems.length == 0)
            return res.status(400).send({ msg: "Giỏ hàng rỗng. " + warning })
        if (cod == undefined)
            return res.status(400).send({ msg: "Mời chọn phương thức thanh toán" })
        if (!phone || !config.phoneRegEx.test(phone))
            return res.status(400).send({ msg: "Thiếu số điện thoại. " })
        if (!!account) {
            if (phone != account.phone) {
                if (!!(await Account.findOne({ phone, _id: { $ne: account._id } })))
                    return res.status(400).send({ msg: "Số điện thoại này đã liên kết với Tài khoản khác" })
            } else verify = true
        } else {
            account = await Account.findOne({ phone })
            if (!account) {
                account = await (new Account({ phone, name })).save()
                if (!account)
                    return res.status(500).send({ msg: config.err500 })
            }
        }

        if (!account.enable)
            return res.status(400).send({ msg: "Người dùng bị đóng băng khỏi việc mua bán. " })

        if (!bagItems || bagItems.length == 0)
            return res.status(400).send({ msg: "Giỏ hàng rỗng. " + warning })

        var total: number = 0
        var weight: number = 0
        bagItems.forEach(e => {
            total += e.price * e.quantity
            reduce += e.price * e.quantity * e.sale
            weight += e.quantity * 500 // 500gr for each obj
        })

        var result_ship = await shipCalculate(address, weight, total)
        var ship: number = result_ship.value
        warning += result_ship.error

        var result_discount = await discountCalculate(discountCode, bagItems, total, ship, account!._id.toString() ?? "")
        var reduce: number = result_discount.value
        warning += result_discount.error
        const discount = result_discount.doc

        const products: any[] = []
        bagItems.forEach(i => products.push({ product: i.product, color: i.color, quantity: i.quantity, price: i.price, sale: i.sale }))
        console.log(products)

        const bill = new Bill({ account: account._id, phone: account.phone, address, products, discountCode, ship, total, discount: reduce, verify })
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const opts = { session };
            const billDoc = await bill.save(opts)
            const accountDoc = await account.updateOne({ $push: { bills: billDoc._id }, bag: [] }, opts).exec()

            if (!billDoc || !accountDoc)
                throw Error("Liên kết bill và account lỗi")

            // update discount
            if(!!discount) {
                if(!!discount.quantity) {
                    discount.quantity -= 1
                } 
                discount.used[account._id.toString()] = Date.now()

            }

            for (let i = 0; i < products.length; i++) {
                const e = products[i]
                const product = await Product.findById(e.product)
                product!.colors[bagItems[i].colorIndex].quantity -= e.quantity
                product!.sold += e.quantity
                if (!(await product!.save(opts)))
                    throw Error("Không thể lưu sản phẩm")
            }

            await session.commitTransaction();
            session.endSession();
            if(!!account.email) SendMail(account.email, "Tạo Đơn Hàng Thành Công", "Mã đơn: " + billDoc._id)
            SendSMS("Tạo Đơn Hàng Thành Công, Mã đơn: " + billDoc._id, phone)
            SendNotificationsFunc(account._id.toString(), "Tạo Đơn Hàng Thành Công, Mã đơn: " + billDoc._id)
            if (cod == true)
                return res.send({ msg: config.success })
            else {
                req.body.createDate = formatDate(billDoc.createdAt)
                req.body.amount = total - reduce + ship
                req.body.bill_id = bill._id
                next()
            }
        } catch (error) {
            console.log(error)
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ msg: "Lỗi không lưu bill" })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
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

        const bill = await Bill.findById(_id).populate("account", "phone email").exec()
        if (!bill)
            return res.status(400).send({ msg: config.errNotExists })

        if (bill.status == status)
            return res.send({ msg: config.success })
        else if (account.role == "Customer" && status == "Cancel") {
            // @ts-ignore
            const bills = (await Account.findById(account._id).select("bills")).bills
            // @ts-ignore
            if (bills.includes(_id)) {
                const doc = await Account.findByIdAndUpdate(account._id, { $inc: { warning: 1 } })
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

            if (status == "Cancel" && bill.paid == false) {
                bill.refund = true
                bill.markModified("refund")
            }

            const billDoc = await bill.save(opts)
            if (!billDoc)
                throw Error("Fail")

            if (status == "Cancel")
                // Refill product
                for (let i = 0; i < bill.products.length; i++) {
                    const e = bill.products[i]
                    const product = await Product.findById(e.product)
                    if (!product) throw Error("Product không tồn tại")
                    var colorIndex = -1
                    for (let i = 0; i < product.colors.length; i++) {
                        if (product.colors[i].color == e.color) {
                            colorIndex = i
                            break
                        }
                    }
                    if (colorIndex == -1) throw Error("Màu Product không tồn tại")
                    product.colors[colorIndex].quantity += e.quantity
                    product.sold -= e.quantity
                    if (!(await product.save(opts)))
                        throw Error("Không thể lưu sản phẩm")
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
            const message = "Đơn hàng "+ billDoc._id+ " chuyển sang trạng thái " + billDoc.status
            // @ts-ignore
            if(!!bill.account.email) SendMail(bill.account.email, "Trạng Thái Đơn Hàng " + billDoc._id, message)
            SendSMS(message, bill.phone)
            SendNotificationsFunc(bill.account._id.toString(), message)
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

export const RequestVNPay = async (req: Request, res: Response, next: NextFunction) => {
    const amount = req.body.amount
    const createDate = req.body.createDate
    const bill_id = req.body.bill_id
    
    var ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    var tmnCode = process.env.VNP_TMN_CODE;
    var secretKey = process.env.VNP_SECRET_KEY;
    var vnpUrl = process.env.VNP_URL

    //var createDate = formatDate(billDoc.createdAt);
    //var amount = total - reduce + ship;

    var vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    // vnp_Params['vnp_Merchant'] = ''
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = bill_id;
    vnp_Params['vnp_OrderInfo'] = "Thanh toan bill " + bill_id;
    vnp_Params['vnp_OrderType'] = 110000;
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = `${req.protocol}://${req.hostname}/vnpay_ipn`;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    vnp_Params = sortObject(vnp_Params);

    var signData = querystring.stringify(vnp_Params, { encode: false });
    var hmac = crypto.createHmac("sha512", secretKey!);
    var signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

    res.redirect(vnpUrl!)
}

export const CheckVNPay = async (req: Request, res: Response, next: NextFunction) => {
    var vnp_Params = req.query;
    var secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    var secretKey = process.env.VNP_SECRET_KEY;
    var signData = querystring.stringify(vnp_Params, { encode: false });
    var hmac = crypto.createHmac("sha512", secretKey!);
    var signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        var orderId = vnp_Params['vnp_TxnRef'];
        var rspCode = vnp_Params['vnp_ResponseCode'];

        //Kiem tra du lieu co hop le khong, cap nhat trang thai don hang va gui ket qua cho VNPAY theo dinh dang duoi
        const bill = await Bill.findById(orderId).populate("account", "phone email").exec()
        if (!!bill) {
            var message = ""
            if (rspCode == '00') {
                bill.verify = true
                bill.paid = true
                bill.desc = "Thanh toán online thành công. "
                if(!(await bill.save())) {
                    message = "Bill " + bill._id + " thanh toán hoàn tất nhưng cập nhật thất bại. "
                    console.log(message)
                    message += "Bạn nhanh chóng liên hệ chuyên viên tư vấn của chúng tôi để được giải quyết nhanh nhất. "
                } else 
                    message = "Bill " + bill._id + " thanh toán hoàn tất"
                res.status(200).json({ RspCode: '00', Message: 'success' })
            }
            else {
                bill.desc = "Thanh toán online thất bại. Việc thanh toán sẽ chuyển sang trực tiếp. "
                if(!(await bill.save())) {
                    message = "Bill " + bill._id + " không thanh toán hoàn tất nhưng hủy bill thất bại. "
                    console.log(message)
                    message += "Bạn nhanh chóng liên hệ chuyên viên tư vấn của chúng tôi để được giải quyết nhanh nhất. "
                } else 
                    message = "Bill " + bill._id + " thanh toán thất bại, đơn hàng chuyển sang trả tiền mặt. "
                res.status(200).json({ RspCode: rspCode, Message: 'Thanh toán không hoàn tất. ' })
            }
            // @ts-ignore
            if(!!bill.account.email) SendMail(bill.account.email, "Thanh Toán Đơn Hàng " + billDoc._id, message)
            SendSMS(message, bill.phone)
            SendNotificationsFunc(bill.account._id.toString(), message)
        } else
            res.status(200).json({ RspCode: rspCode, Message: 'Bill không tồn tại. ' })
    }
    else {
        res.status(200).json({ RspCode: '97', Message: 'Fail checksum' })
    }
}