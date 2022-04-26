import express, { NextFunction, Request, Response } from 'express';
import * as AccountController from '../controllers/accountController';
import * as DefaultController from '../controllers/defaultController';

export const route = express.Router();
route.get("/", (req: Request, res: Response) => {
    res.send(`ADStore Server`);
})

// Field: email**, password**, code**, name, birth, gender
route.post("/customer/createByMail",
    DefaultController.emailCheck,
    DefaultController.emailOTPCheck,
    AccountController.AccountCreateByEmail
)
// Field: email**
route.post("/customer/emailOTP", DefaultController.emailOTPRequest)
// Field: phone**, code**
route.post("/customer/createByPhone",
    DefaultController.phoneCheck,
    DefaultController.phoneOTPCheck,
    AccountController.AccountCreateByPhone
)
// Field: phone**
route.post("/customer/phoneOTP", DefaultController.phoneOTPRequest)

// Field: (email_or_phone**, password**) | (email_or_phone**, code**) | googleToken**
route.post("/customer/login", AccountController.AccountSignin)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: name, birth, gender, address
route.post("/customer/updateInfo",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountUpdateInfo
)
// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: newPhone**, code**
route.post("/customer/updatePhone",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    DefaultController.phoneOTPCheck,
    AccountController.AccountUpdatePhone
)
// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: password**, newPassword**
route.post("/customer/updatePassword",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountUpdatePassword
)
