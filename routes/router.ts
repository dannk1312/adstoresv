import express, { NextFunction, Request, Response } from 'express';
import * as AccountController from '../controllers/accountController';
import * as ChatController from '../controllers/chatController';
import * as DefaultController from '../controllers/defaultController';
import * as CategoryController from '../controllers/categoryController';
import * as ProductController from '../controllers/productController';
import * as BillController from '../controllers/billController';

export const route = express.Router();
route.get("/", (req: Request, res: Response) => {
    res.send(`ADStore Server`);
})

//#region DEFAULT ACCOUNT
// Field: email_or_phone**, password**, code**, name, birth, gender
route.post("/default/signUp",
    DefaultController.OTPCheck,
    AccountController.SignUp
)

// Field: email_or_phone**
route.post("/default/otp", DefaultController.OTPRequest)

// Field: (email_or_phone**, password**) | (email_or_phone**, code**) | googleToken**
route.post("/default/login", AccountController.SignIn)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.get("/default/info",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.Info
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.get("/default/surface",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.Surface
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: name, birth, gender
route.post("/default/updateInfo",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.UpdateInfo
)


// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: phone**, code**
route.post("/default/updatePhone",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    DefaultController.phoneOTPCheck,
    AccountController.UpdatePhone
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: old_password**, password**
route.post("/default/updatePassword",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.UpdatePassword
)


// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.post("/default/readBag",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.ReadBag
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
route.post("/default/readNotifications",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.ReadNotifications
)

// require: accessToken
// role: ["Customer", "Sale", "Admin"]
// field: _id // id off notifications
route.post("/default/deleteNotification",
    DefaultController.Role(["Customer", "Sale", "Admin"]),
    AccountController.DeleteNotification
)

// require: accessToken
// role: ["Admin"]
// field: dest_id**, message**
route.post("/default/sendNotification",
    DefaultController.Role(["Admin"]),
    AccountController.SendNotification
)

// require: accessToken
// role: ["Customer"]
// field: dest_id**, message**
route.post("/default/updateBag",
    DefaultController.Role(["Customer", "Admin"]), // Admin để test cho tiện
    ProductController.ValidBag,
    AccountController.UpdateBag
)
//#endregion

//#region CHAT
// require: accessToken
// role: ["Customer"]
// field: message**
route.post("/chat/newChat",
    DefaultController.Role(["Customer"]),
    ChatController.New
)
// require: accessToken
// role: ["Customer", "Sale"]
route.get("/chat/getChat",
    DefaultController.Role(["Customer", "Sale"]),
    ChatController.List
)
// require: accessToken
// role: ["Customer", "Sale"]
// field: chatId**, message**
route.post("/chat/addMessage",
    DefaultController.Role(["Customer", "Sale"]),
    ChatController.AddMessage
)
// require: accessToken
// role: ["Customer", "Sale"]
// field: chatId**, skip, get
route.post("/chat/getMessages",
    DefaultController.Role(["Customer", "Sale"]),
    ChatController.GetMessages
)
//#endregion

//#region Category
// require: accessToken
// role: ["Admin"]
// field: name**, image_base64**, specsModel**
route.post("/category/create", 
    DefaultController.Role(["Admin"]), 
    CategoryController.Create
)

// require: accessToken
// role: ["Admin"]
// field: _id, name, image_base64, specsModel
route.post("/category/update", 
    DefaultController.Role(["Admin"]), 
    CategoryController.Update
)

// field: name**
route.post("/category/read", 
    CategoryController.Read
)

route.get("/category/list", 
    CategoryController.List
)

// require: accessToken
// role: ["Admin"]
// field: name**
route.post("/category/delete", 
    DefaultController.Role(["Admin"]), 
    CategoryController.Delete
)

// field: name**, specs (specs: {name: value})
route.post("/category/query", 
    CategoryController.Query
)

//#endregion

//#region Product
// require: accessToken
// role: ["Admin"]
// field: name**, code**, desc, colors**, category_id**, specs_link**, price**, sale
route.post("/product/create", 
    DefaultController.Role(["Admin"]), 
    ProductController.Create
)

// field: _id**
route.post("/product/read", 
    ProductController.Read
)

// field: _id**
route.post("/product/readComments", 
    ProductController.ReadComment
)

// field: accessToken, _id**, desc
// role: ["Admin"]
route.post("/product/update", 
    DefaultController.Role(["Admin"]), 
    ProductController.Update
)

// field: accessToken, data
// role: ["Admin"]
route.post("/product/import", 
    DefaultController.Role(["Admin"]), 
    ProductController.Imports
)
//#endregion

// field: accessToken, data
// role: ["Customer", "Admin"]
route.post("/bill/billCalc", 
    DefaultController.Role(["Customer", "Admin"]), 
    BillController.Calculate
)
//#endregion

