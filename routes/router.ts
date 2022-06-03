import express, { NextFunction, Request, Response } from 'express';
import * as AccountController from '../controllers/accountController';
import * as ChatController from '../controllers/chatController';
import * as DefaultController from '../controllers/defaultController';
import * as CategoryCreate from '../controllers/categoryController';

export const route = express.Router();
route.get("/", (req: Request, res: Response) => {
    res.send(`ADStore Server`);
})

//#region DEFAULT ACCOUNT
// Field: email**, password**, code**, name, birth, gender
route.post("/default/createByMail",
    AccountController.AccountCreateByEmail
)

// Field: email**
route.post("/default/emailOTP", DefaultController.emailOTPRequest)
// Field: phone**, code**
route.post("/default/createByPhone",
    DefaultController.phoneCheck,
    DefaultController.phoneOTPCheck,
    AccountController.AccountCreateByPhone
)
// Field: phone**
route.post("/default/phoneCheck",
    DefaultController.phoneCheck,
    (req, res) => {res.send({msg: "ok" })}
)
// Field: phone**
route.post("/default/phoneOTP", 
        DefaultController.phoneCheck, 
        DefaultController.phoneOTPRequest
)

// Field: (email_or_phone**, password**) | (email_or_phone**, code**) | googleToken**
route.post("/default/login", AccountController.AccountSignin, AccountController.AccountInfo)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: name, birth, gender, address
route.post("/default/updateInfo",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountUpdateInfo
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.get("/default/info",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountInfo
)
// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: newPhone**, code**
route.post("/default/updatePhone",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    DefaultController.phoneOTPCheck,
    AccountController.AccountUpdatePhone
)
// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: password**, newPassword**
route.post("/default/updatePassword",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountUpdatePassword
)
//#endregion

//#region CHAT
// require: accessToken
// role: ["Customer"]
// field: message**
route.post("/chat/newChat",
    DefaultController.roleVerify(["Customer"]),
    ChatController.NewChat
)
// require: accessToken
// role: ["Customer", "Sale"]
route.get("/chat/getChat",
    DefaultController.roleVerify(["Customer", "Sale"]),
    ChatController.GetChat
)
// require: accessToken
// role: ["Customer", "Sale"]
// field: chatId**, message**
route.post("/chat/addMessage",
    DefaultController.roleVerify(["Customer", "Sale"]),
    ChatController.AddMessage
)
// require: accessToken
// role: ["Customer", "Sale"]
// field: chatId**, skip, get
route.post("/chat/getMessages",
    DefaultController.roleVerify(["Customer", "Sale"]),
    ChatController.GetMessages
)
//#endregion

//#region Category
// require: accessToken
// role: ["Admin"]
// field: name**, image**, specsModel**
route.post("/category/create", 
    DefaultController.roleVerify(["Admin"]), 
    CategoryCreate.CategoryCreate
)

// require: accessToken
// role: ["Admin"]
// field: name**, image**, specsModel**
route.post("/category/update", 
    DefaultController.roleVerify(["Admin"]), 
    CategoryCreate.CategoryUpdate
)

// require: accessToken
// field: name**
route.post("/category/read", 
    CategoryCreate.CategoryRead
)

// require: accessToken
// role: ["Admin"]
// field: name**
route.post("/category/delete", 
    DefaultController.roleVerify(["Admin"]), 
    CategoryCreate.CategoryDelete
)

//#endregion
