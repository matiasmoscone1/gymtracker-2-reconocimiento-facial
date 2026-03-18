/*const https = require("https");*/
const http = require("http");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const process = require("process");
const { htmlController } = require("./controllers/htmlController");
const { adminController } = require("./controllers/adminController");

/*
const options = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem")
};*/

const server = http.createServer(/*options,*/ (req, res) => {
    if(req.url.startsWith("/css")){
        htmlController.css(req, res);
    }
    if(req.url === '/public/html/port.txt'){
        fs.readFile(path.join(__dirname, "public/html/port.txt"), 'utf8', (err, data) => {
            if(err){
                res.writeHead(500, {'Content-Type':'text/plain'});
                res.end('Error al cargar el archivo port.txt');
                console.error('Error leyendo el archivo:', err);
                return;
            }
            res.writeHead(200, {'Content-Type':'text/plain'});
            res.end(data);
        });
    }
    if(req.url === "/images/wallpaper.jpg"){
        fs.readFile(path.join(__dirname, "public/images/wallpaper.jpg"), (err, data) => {
            if(err){
                res.writeHead(404, {"Content-Type":"text/plain"});
                res.end("Imagen no encontrada.");
                return;
            }
            res.writeHead(200, {"Content-Type":"image/jpg"});
            res.end(data);
        })
    }
    if(req.url === "/images/icon.png" || req.url === "/favicon.ico"){
        fs.readFile(path.join(__dirname, "public/images/icon.png"), (err, data) => {
            if(err){
                res.writeHead(404, {"Content-Type":"text/plain"});
                res.end("Imagen no encontrada.");
                return;
            }
            res.writeHead(200, {"Content-Type":"image/jpg"});
            res.end(data);
        })
    }
    if(req.url.startsWith("/models")){
        const filePath = path.join(__dirname, req.url);
    
        fs.readFile(filePath, (err, data) => {
            if(err){
                res.writeHead(404, {"Content-Type":"text/plain"});
                res.end("Modelo no encontrado");
                return;
            }
    
            res.writeHead(200);
            res.end(data);
        });
    
        return;
    }
    if(req.url === "/face-api.min.js"){
        const filePath = path.join(__dirname, "face-api.min.js");
    
        fs.readFile(filePath, (err, data) => {
            if(err){
                res.writeHead(404, {"Content-Type":"text/plain"});
                res.end("JS no encontrado");
                return;
            }
    
            res.writeHead(200, {"Content-Type":"application/javascript"});
            res.end(data);
        });
    
        return;
    }
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;
    
    switch(pathname){
        case "/updateUser":
            htmlController.adminUpdateUser(req, res, url.searchParams);
            break;
        case "/billing":{
            htmlController.adminBilling(req, res);
            break;
        }
    }
    switch(req.url){
        case "/": {
            htmlController.login(req, res)
            break;
        }
        case "/adminPanel": {
            htmlController.adminPanel(req, res);
            break;
        }
        case "/createUser": {
            htmlController.adminCreateUser(req, res);
            break;
        }
        case "/registerFace": {
            htmlController.adminRegisterFace(req, res);
            break;
        }
        case "/loginUser": {
            adminController.loginUser(req, res);
            break;
        }
        case "/getUser": {
            adminController.getUser(req, res);
            break;
        }
        case "/adminCreateUser": {
            adminController.adminCreateUser(req, res);
            break;
        }
        case "/updateRemainingClasses": {
            adminController.updateRemainingClasses(req, res);
            break;
        }
        case "/getUpdateUser": {
            adminController.getUpdateUser(req, res);
            break;
        }
        case "/searchUser": {
            adminController.searchUser(req, res);
            break;
        }
        case "/adminUpdateUser": {
            adminController.adminUpdateUser(req, res);
            break;
        }
        case "/adminDeleteUser": {
            adminController.adminDeleteUser(req, res);
            break;
        }
        case "/deletePayment": {
            adminController.deletePayment(req, res);
            break;
        }
        case "/updatePayment": {
            adminController.updatePayment(req, res);
            break;
        }
        case "/monthlyBalance": {
            adminController.getMonthlyBalance(req, res);
            break;
        }
        case "/createProductPayment": {
            adminController.createProductPayment(req, res);
            break;
        }
        case "/deleteProductPayment": {
            adminController.deleteProductPayment(req, res);
            break;
        }
        case "/updateProductPayment": {
            adminController.updateProductPayment(req, res);
            break;
        }
        case "/createExpense": {
            adminController.createExpense(req, res);
            break;
        }
        case "/deleteExpense": {
            adminController.deleteExpense(req, res);
            break;
        }
        case "/updateExpense": {
            adminController.updateExpense(req, res);
            break;
        }
    }
});

const updatePaidDays = () => {
    const readStream = fs.createReadStream(path.join(__dirname, "/data/database.json"), {encoding: "utf-8"});
    readStream.on("error", (err) => {
        console.error("Error al leer el archivo.", err);
    });
    let data = "";
    readStream.on("data", (chunk) => {
        data += chunk;
    });

    readStream.on("end", () => { 
        try{
            if(data.trim()){
                data = JSON.parse(data);
            }

            const today = (() => {
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = now.getFullYear();
                return `${day}/${month}/${year}`;
            })();
            
            const lastUpdated = data.lastUpdated 
                ? data.lastUpdated.split("/").reverse().join("-") 
                : today.split("/").reverse().join("-");

            const lastDate = new Date(lastUpdated);
            const currentDate = new Date(today.split("/").reverse().join("-"));

            const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

            if(diffDays > 0){
                data.users = data.users.map((user) => ({...user, paidDays: Math.max(-1, user.paidDays - diffDays)}));
            
                data.lastUpdated = today;

                const writeStream = fs.createWriteStream(path.join(__dirname, "/data/database.json"));
                writeStream.write(JSON.stringify(data, null, 2));
                writeStream.end();

                writeStream.on("error", (err) => {
                    console.error("Error al actualizar la base de datos.", err);
                });
            }
        }catch(err){
            console.error("Error al procesar los datos.", err);
        }
    });
}

updatePaidDays();
setInterval(updatePaidDays, 24 * 60 * 60 * 1000);

const sourceFile = path.join(__dirname, "/data/database.json");
const backupDir = path.join(__dirname, "/backup");
const logFile = path.join(__dirname, "lastBackup.txt");

const shouldBackup = async () => {
    try{
        const lastBackupDate = await fsPromises.readFile(logFile, 'utf8');
        if(!lastBackupDate.trim()){
            return true;
        }
        const lastDate = new Date(lastBackupDate.trim());
        const currentDate = new Date();

        const diffTime = currentDate - lastDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        return diffDays >= 5;
    }catch(err){
        return true;
    }
};

const hasUsers = async () => {
    try{
        const data = await fsPromises.readFile(sourceFile, 'utf8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed.users) && parsed.users.length > 0;
    }catch(err){
        return false;
    }
};

const cloneDatabase = async () => {
    const validToBackup = await shouldBackup();
    const hasValidUsers = await hasUsers();

    if(!validToBackup || !hasValidUsers){
        return;
    }

    const destinationFile = path.join(backupDir, "database_backup.json");

    try{
        await fsPromises.copyFile(sourceFile, destinationFile);
        await fsPromises.writeFile(logFile, new Date().toISOString());
    }catch(err){
        console.error("Error al copiar la base de datos: ", err);
    }
};

cloneDatabase();

const clearPayments = () => {

    const parseDDMMYYYY = (str) => {
        const [day, month, year] = str.split('/');
        return new Date(`${year}-${month}-${day}`);
    }

    const readStream = fs.createReadStream(path.join(__dirname, "/data/database.json"), {encoding: "utf-8"});
    readStream.on("error", (err) => {
        console.error("Error al leer el archivo.", err);
    });
    let data = "";
    readStream.on("data", (chunk) => {
        data += chunk;
    });

    readStream.on("end", () => { 
        try{
            if(data.trim()){
                data = JSON.parse(data);
            }

            const today = new Date();
            today.setFullYear(today.getFullYear() - 5);
        
            const compareDate = today.toISOString().split("T")[0].split("-").reverse().join("/");
            
            data.users = data.users.map((user) => {
                return {
                  ...user,
                  paymentHistory: user.paymentHistory.filter((payment) => {
                    return parseDDMMYYYY(payment.expirationDate) > parseDDMMYYYY(compareDate);
                  }),
                };
            });

            data.productsPaymentHistory = data.productsPaymentHistory.filter((payment) => {
                return parseDDMMYYYY(payment.date) > parseDDMMYYYY(compareDate);
            });

            const writeStream = fs.createWriteStream(path.join(__dirname, "/data/database.json"));
            writeStream.write(JSON.stringify(data, null, 2));
            writeStream.end();

            writeStream.on("error", (err) => {
                console.error("Error al actualizar la base de datos.", err);
            });
        }catch(err){
            console.error("Error al procesar los datos.", err);
        }
    });
}

const LAST_CLEAR_FILE = path.join(__dirname, "lastClearPayments.txt");

const checkAndRunClearPayments = async () => {
    const now = new Date();
    let shouldRun = false;
  
    try{
        const lastRunStr = (await fsPromises.readFile(LAST_CLEAR_FILE, "utf-8")).trim();
        const lastRunDate = new Date(lastRunStr);
    
        const diffInMs = now - lastRunDate;
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
        if(diffInDays >= 30){
            shouldRun = true;
        }
    }catch(err){
        shouldRun = true;
    }
    if(shouldRun){
      clearPayments();
      await fsPromises.writeFile(LAST_CLEAR_FILE, now.toISOString(), "utf-8");
    }
};

checkAndRunClearPayments();

let PORT;
/*const PORT = 5000;*/


server.listen(PORT,  /*"0.0.0.0",*/ () => {
    PORT = server.address().port;
    fs.writeFileSync("port.txt", PORT.toString());
    fs.writeFileSync(path.join(__dirname, "/public/html/port.txt"), PORT.toString());

        const width = process.stdout.columns || 80;
        const height = process.stdout.rows || 24;
        
        const rectWidth = 50;
        const rectHeight = 7; 
        
        const paddingLeft = Math.floor((width - rectWidth) / 2);
        const paddingTop = Math.floor((height - rectHeight) / 2 - 5);
        
        const rect = [
        " ".repeat(paddingLeft) + " " + "_".repeat(rectWidth - 2) + " ",
        " ".repeat(paddingLeft) + "|" + " ".repeat(rectWidth - 2) + "|",
        " ".repeat(paddingLeft) + "|" + " ".repeat(rectWidth - 2) + "|",
        " ".repeat(paddingLeft) + "|" + " ".repeat(rectWidth - 2) + "|",
        " ".repeat(paddingLeft) + "|" + " GymTracker iniciado...".padStart(Math.floor(rectWidth / 2) + 11) + " ".repeat(Math.ceil(rectWidth / 2) - 13) + "|",
        " ".repeat(paddingLeft) + "|" + " ".repeat(rectWidth - 2) + "|",
        " ".repeat(paddingLeft) + "|" + " ".repeat(rectWidth - 2) + "|",
        " ".repeat(paddingLeft) + "|" + "_".repeat(rectWidth - 2) + "|","\n",
        "No cerrar esta ventana o en su defecto no funcionara GymTracker.".padStart(width / 2 + 31)+"\n",
        "Si tiene dudas, cierre todas las ventanas y tambien las del".padStart(width / 2 + 30),
        "navegador de chrome, luego vuelva a abrir GymTracker una sola vez.".padStart(width / 2 + 33)+"\n"+"\n",
        "Pantalla completa: En el navegador aprete f11".padStart(width / 2 + 22)
        ];
        
        console.log("\n".repeat(paddingTop) + rect.join("\n"));

});
