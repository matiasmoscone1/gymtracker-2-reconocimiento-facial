const fs = require("fs");
const path = require("path");

const htmlController = {};

const functionReadFile = (req, res, route, css) => {
    fs.readFile(path.join(__dirname, `../public/${css ? "css" : "html"}/${route}`), "utf-8", (err, data) => {
        if(err){
            res.writeHead(500, {"Content-Type": "text/plain"});
            res.end("Error al leer el archivo HTML.");
            return;
        }
        res.writeHead(200, {"Content-Type":`text/${css ? "css" : "html"}`});
        res.end(data);
    });
}

htmlController.login = (req, res) => {
    functionReadFile(req, res, "login.html");
}

htmlController.loginScan = (req, res) => {
    functionReadFile(req, res, "loginScan.html");
}

htmlController.adminPanel = (req, res) => {
    functionReadFile(req, res, "adminPanel.html");
}

htmlController.adminCreateUser = (req, res) => {
    functionReadFile(req, res, "createUser.html");
}

htmlController.adminUpdateUser = (req, res) => {
    functionReadFile(req, res, "updateUser.html");
}

htmlController.adminBilling = (req, res) => {
    functionReadFile(req, res, "billing.html");
}

htmlController.adminRegisterFace = (req, res) => {
    functionReadFile(req, res, "registerFace.html");
}

htmlController.css = (req, res) => {
    functionReadFile(req, res, "styles.css", "css");
}


module.exports = { htmlController };
