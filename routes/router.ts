import express, { NextFunction, Request, Response } from 'express';
import * as AccountController from '../controllers/accountController';
import * as ChatController from '../controllers/chatController';
import * as DefaultController from '../controllers/defaultController';
import * as CategoryController from '../controllers/categoryController';
import * as ProductController from '../controllers/productController';

export const route = express.Router();
route.get("/", (req: Request, res: Response) => {
    res.send(`ADStore Server`);
})

//#region DEFAULT ACCOUNT
// Field: email_or_phone**, password**, code**, name, birth, gender
route.post("/default/signUp",
    DefaultController.OTPCheck,
    AccountController.AccountSignUp
)

// Field: email_or_phone**
route.post("/default/otp", DefaultController.OTPRequest)

// Field: (email_or_phone**, password**) | (email_or_phone**, code**) | googleToken**
route.post("/default/login", AccountController.AccountSignin)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.get("/default/info",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountInfo
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.get("/default/surface",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountSurface
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: name, birth, gender, address
route.post("/default/updateInfo",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountUpdateInfo
)


// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: phone**, code**
route.post("/default/updatePhone",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    DefaultController.phoneOTPCheck,
    AccountController.AccountUpdatePhone
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: old_password**, password**
route.post("/default/updatePassword",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountUpdatePassword
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.post("/default/readBag",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountReadBag
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.post("/default/readNotifications",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountReadNotifications
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: _id // id off notifications
route.post("/default/deleteNotification",
    DefaultController.roleVerify(["Customer", "Sale", "Admin"]),
    AccountController.AccountDeleteNotifications
)

// require: accessToken
// role: ["Admin"]
// field: dest_id**, message**
route.post("/default/sendNotification",
    DefaultController.roleVerify(["Admin"]),
    AccountController.AccountSendNotification
)

// require: accessToken
// role: ["Customer"]
// field: dest_id**, message**
route.post("/default/updateBag",
    DefaultController.roleVerify(["Customer", "Admin"]), // Admin để test cho tiện
    AccountController.AccountUpdateBag
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
    ChatController.GetChats
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
// field: name**, image_base64**, specsModel**
route.post("/category/create", 
    DefaultController.roleVerify(["Admin"]), 
    CategoryController.CategoryCreate
)

// require: accessToken
// role: ["Admin"]
// field: _id, name, image_base64, specsModel
route.post("/category/update", 
    DefaultController.roleVerify(["Admin"]), 
    CategoryController.CategoryUpdate
)

// field: name**
route.post("/category/read", 
    CategoryController.CategoryRead
)

route.get("/category/list", 
    CategoryController.CategoryList
)

// require: accessToken
// role: ["Admin"]
// field: name**
route.post("/category/delete", 
    DefaultController.roleVerify(["Admin"]), 
    CategoryController.CategoryDelete
)

// field: name**, specs (specs: {name: value})
route.post("/category/query", 
    CategoryController.CategoryQuery
)

//#endregion

//#region Product
// require: accessToken
// role: ["Admin"]
// field: name**, code**, desc, colors**, category_id**, specs_link**, price**, sale
route.post("/product/create", 
    DefaultController.roleVerify(["Admin"]), 
    ProductController.ProductCreate
)

// field: _id**
route.post("/product/read", 
    ProductController.ProductRead
)

// field: _id**
route.post("/product/readComments", 
    ProductController.ProductReadComment
)

// field: accessToken, _id**, desc
// role: ["Admin"]
route.post("/product/update", 
    DefaultController.roleVerify(["Admin"]), 
    ProductController.ProductUpdate
)

// field: accessToken, data
// role: ["Admin"]
route.post("/product/import", 
    DefaultController.roleVerify(["Admin"]), 
    ProductController.ProductImport
)
//#endregion
