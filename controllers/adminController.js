const fs = require("fs");
const path = require("path");

const adminController = {};

adminController.loginUser = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        try{
            const userDoc = JSON.parse(body);
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"));
            readStream.on("error", (err) => {
                res.writeHead(500, {"Content-Type":"application/json"});
                res.end(JSON.stringify({message: "Error al leer el archivo.", error: err.message}));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            
            readStream.on("end", () => {
                let users = [];
                if(data.trim()){
                    users = JSON.parse(data).users;
                }

                const userLogged = users.find((user) => Number(userDoc.document) === Number(user.document));
                if(userLogged){
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify(userLogged));
                }else{
                    res.writeHead(404, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Usuario no encontrado."}));
                }
            });
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "Hubo un error al verificar el usuario.", err}));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"application/json"});
        res.end(JSON.stringify({message: "Error en la peticion.", error: err.message}));
    });
}

adminController.getUser = (req, res) => {
    const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"), {encoding: "utf-8"});
    readStream.on("error", (err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
    });

    let data = "";
    readStream.on("data", (chunk) => {
        data += chunk;
    });
    readStream.on("end", () => {
        try{
            const parsedData = JSON.parse(data.trim());
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(parsedData));
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "Hubo un error al enlistar los usuarios.", err}));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Hubo un problema al realizar la petición.", err}));
    });
}

const parseDateSafe = (value) => {
    if (value instanceof Date) {
      return value;
    }
  
    if (typeof value === "string") {
      if (value.includes("-")) {
        return new Date(value);
      }
  
      // DD/MM/YYYY
      if (value.includes("/")) {
        const [day, month, year] = value.split("/");
        return new Date(year, month - 1, day);
      }
    }
  
    throw new Error("Formato de fecha inválido: " + value);
};

const weeksBetween = (start, end) => {
    const startDate = parseDateSafe(start);
    const endDate = parseDateSafe(end);
  
    const ms = endDate - startDate;
    return Math.floor(ms / (1000 * 60 * 60 * 24 * 7));
};

const calculateTotalClasses = (start, end, weeklyFrequency) => {
    const startDate = parseDateSafe(start);
    const endDate = parseDateSafe(end);
    const weeks = weeksBetween(startDate, endDate);
    return weeks * weeklyFrequency;
}

const calculateTotalClassesDays = (paidDays, weeklyFrequency) => {
    const weeks = Math.floor(paidDays / 7);
    return weeks * weeklyFrequency;
};

adminController.adminCreateUser = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        try{
            const newUser = JSON.parse(body);
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"));
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type":"application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                
                let db = {lastId: data.lastId, users: []};

                if(data.trim()){
                    db = JSON.parse(data);
                }
                if(db.users.find((userDoc) => userDoc.document === newUser.document)){
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "El documento ingresado ya existe."})); 
                    return;
                }

                const newUserId = db.lastId + 1;
                newUser.id = newUserId;
                db.lastId = newUserId;

                if(newUser.weeklyFrequency !== 5){
                    newUser.totalClasses = calculateTotalClasses(newUser.initialDate, newUser.expirationDate, newUser.weeklyFrequency);
                    newUser.remainingClasses = newUser.totalClasses;
                    newUser.lastUpdate = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                    newUser.accumulatorDays = 0;
                    newUser.lastDayUpdate = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                }else{
                    newUser.totalClasses = 0;
                    newUser.remainingClasses = 0;
                    newUser.lastUpdate = "";
                    newUser.accumulatorDays = 0;
                    newUser.lastDayUpdate = "";
                }


                if(newUser.weeklyFrequency !== 5){
                    const lastU = new Date(parseDateSafe(newUser.lastUpdate));
                    const initialD = new Date(parseDateSafe(newUser.initialDate));
                    
                    const weeksPassed = weeksBetween(initialD, lastU);                    
        
                    const classesToConsume = weeksPassed * newUser.weeklyFrequency;
    
                    newUser.remainingClasses = Math.max(0, newUser.remainingClasses - classesToConsume);
                }


                db.users.push({
                    id: newUser.id,
                    firstname: newUser.firstname,
                    lastname: newUser.lastname,
                    document: newUser.document,
                    email: newUser.email,
                    phone: newUser.phone,
                    age: newUser.age,
                    plan: newUser.plan,
                    term: newUser.term,
                    faceDescriptor: newUser.faceDescriptor,
                    weeklyFrequency: newUser.weeklyFrequency,
                    totalClasses: newUser.totalClasses,
                    remainingClasses: newUser.remainingClasses,
                    accumulatorDays: newUser.accumulatorDays,
                    lastUpdate: newUser.lastUpdate,
                    lastDayUpdate: newUser.lastDayUpdate,
                    initialDate: newUser.initialDate,
                    expirationDate: newUser.expirationDate,
                    paidDays: newUser.paidDays,
                    paymentHistory: [{
                        id: Date.now(),
                        plan: newUser.plan,
                        term: newUser.term,
                        amount: newUser.amount,
                        paymentMethod: newUser.paymentMethod,
                        initialDate: newUser.initialDate,
                        expirationDate: newUser.expirationDate
                    }]
                });


                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"), {encoding: "utf-8"});
                writeStream.write(JSON.stringify(db, null, 2)); 
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Usuario creado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al crear el usuario."}, err));
                });
                });

        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"text/plain"});
        res.end(JSON.stringify({message: "Error en la petición."}, err));
    });
}




const updateRemainingClasses = (user) => {
    const now = new Date();
    const last = new Date(parseDateSafe(user.lastUpdate));
  
    if (now <= last) {
        return;
    }

    const weeksPassed = weeksBetween(last, now);
    if (weeksPassed <= 0) return;

  
    let classesToConsume;

    if(user.accumulatorDays < user.weeklyFrequency){
        classesToConsume = (weeksPassed * user.weeklyFrequency) - user.accumulatorDays;
    }else{
        classesToConsume = (weeksPassed * user.weeklyFrequency) - user.weeklyFrequency;
    }

  
    user.remainingClasses = Math.max(0, user.remainingClasses - classesToConsume);

    user.lastUpdate = now.toISOString().split("T")[0].split("-").reverse().join("/");

    user.accumulatorDays = 0;
}


adminController.updateRemainingClasses = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        try{
            const updatedUser = JSON.parse(body);
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"));
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};

                if(data.trim()){
                    db = JSON.parse(data);
                }
                
                const index = db.users.findIndex((obj) => updatedUser.document === obj.document);
                if(index !== -1){

                    const currentUser = db.users[index];
                    const today = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                    
                    if(!currentUser.lastDayUpdate){
                        currentUser.lastDayUpdate = today;
                    }
                    const alreadyUpdatedToday = currentUser.lastDayUpdate === today;

                    if(!alreadyUpdatedToday){

                        if(currentUser.weeklyFrequency !== 5){
                            updateRemainingClasses(currentUser);
                            currentUser.remainingClasses--;
                            currentUser.accumulatorDays++;
                        }
                    
                        if(currentUser.remainingClasses < 0){
                            currentUser.remainingClasses = 0;
                        }
           
                        currentUser.lastDayUpdate = today;
                    }
                };

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Función updateRemainingClasses ejecutada."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al actualizar el usuario."}, err));
                });
            });

        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"text/plain"});
        res.end(JSON.stringify({message: "Error en la petición."}, err));
    });
}


adminController.getUpdateUser = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        try{
            const parsedId = JSON.parse(body);
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"), { encoding: "utf-8" });

            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message }));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                try{
                    const db = JSON.parse(data.trim());

                    const user = db.users.find((user) => Number(user.id) === Number(parsedId.id));

                    if(user){
                        res.writeHead(200, {"Content-Type":"application/json"});
                        res.end(JSON.stringify(user));
                    }else{
                        res.writeHead(404, {"Content-Type":"application/json"});
                        res.end(JSON.stringify({ message: "No se encontró el ID del usuario." }));                            }
                }catch(err){
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({ message: "Hubo un error al procesar el archivo JSON.", error: err.message }));
                }
            });
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({ message: "Error al procesar el cuerpo de la solicitud.", error: err.message }));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ message: "Hubo un problema al realizar la petición.", error: err.message }));
    });
}

adminController.searchUser = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        try{
            const parsedDocument = JSON.parse(body);
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"), { encoding: "utf-8" });

            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message }));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                try{
                    const db = JSON.parse(data.trim());

                    const user = db.users.find((user) => Number(user.document) === Number(parsedDocument.document));

                    if(user){
                        res.writeHead(200, {"Content-Type":"application/json"});
                        res.end(JSON.stringify(user));
                    }else{
                        res.writeHead(404, {"Content-Type":"application/json"});
                        res.end(JSON.stringify({ message: "No se encontró el ID del usuario." }));                            }
                }catch(err){
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({ message: "Hubo un error al procesar el archivo JSON.", error: err.message }));
                }
            });
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({ message: "Error al procesar el cuerpo de la solicitud.", error: err.message }));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ message: "Hubo un problema al realizar la petición.", error: err.message }));
    });
}

adminController.adminUpdateUser = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        try{
            const updatedUser = JSON.parse(body);
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"));
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};

                if(data.trim()){
                    db = JSON.parse(data);
                }
                
                const usuariosFiltrados = db.users.filter((user) => user.id !== updatedUser.id);
                if(usuariosFiltrados.find((userDoc) => updatedUser.document === userDoc.document)){
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "El documento ingresado ya existe."})); 
                    return;
                }

                const today = new Date();

                const membershipEnd = new Date(new Date((updatedUser.initialDate).split('/').reverse().join('-')).getTime() + updatedUser.dataDays * 24 * 60 * 60 * 1000);


                if(updatedUser.weeklyFrequency !== 5){
                    updatedUser.totalClasses = calculateTotalClasses(updatedUser.initialDate, updatedUser.expirationDate, updatedUser.weeklyFrequency);
                    updatedUser.remainingClasses = updatedUser.totalClasses;
                    updatedUser.lastUpdate = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                    updatedUser.accumulatorDays = 0;
                    updatedUser.lastDayUpdate = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                }else{
                    updatedUser.totalClasses = 0;
                    updatedUser.remainingClasses = 0;
                    updatedUser.lastUpdate = "";
                    updatedUser.accumulatorDays = 0;
                    updatedUser.lastDayUpdate = "";
                }

                if(updatedUser.weeklyFrequency !== 5){
                    const lastU = new Date(parseDateSafe(updatedUser.lastUpdate));
                    const initialD = new Date(parseDateSafe(updatedUser.initialDate));
                    
                    const weeksPassed = weeksBetween(initialD, lastU);

                    const classesToConsume = weeksPassed * updatedUser.weeklyFrequency;
    
                    updatedUser.remainingClasses = Math.max(0, updatedUser.remainingClasses - classesToConsume);
                }


                const index = db.users.findIndex((obj) => updatedUser.id === obj.id);
                if(index !== -1){

                    const currentUser = db.users[index];
                    
                    db.users[index] = {
                        ...currentUser,
                        id: updatedUser.id,
                        firstname: updatedUser.firstname,
                        lastname: updatedUser.lastname,
                        document: updatedUser.document,
                        email: updatedUser.email,
                        phone: updatedUser.phone,
                        age: updatedUser.age,
                        plan: updatedUser.plan,
                        ...(updatedUser.dataActive === "true" && updatedUser.amount !== "" && updatedUser.paymentMethod !== "" && {
                            paidDays: updatedUser.paidDays,
                            term: updatedUser.term,
                            weeklyFrequency: updatedUser.weeklyFrequency,
                            totalClasses: updatedUser.totalClasses,
                            remainingClasses: updatedUser.remainingClasses,
                            accumulatorDays: updatedUser.accumulatorDays,
                            lastUpdate: updatedUser.lastUpdate,
                            lastDayUpdate: updatedUser.lastDayUpdate,
                            initialDate: updatedUser.initialDate,
                            expirationDate: updatedUser.expirationDate
                        })
                    };
                    if(currentUser.paidDays < 0 && membershipEnd < today){
                        db.users[index] = {
                            ...currentUser,
                            paidDays: -1
                        }
                    }
                    if(updatedUser.dataActive === "true" && updatedUser.amount !== "" && updatedUser.paymentMethod !== ""){
                        db.users[index].paymentHistory = [
                            ...currentUser.paymentHistory,
                            {
                                id: Date.now(),
                                plan: updatedUser.plan,
                                term: updatedUser.term,
                                amount: updatedUser.amount,
                                paymentMethod: updatedUser.paymentMethod,
                                initialDate: updatedUser.initialDate,
                                expirationDate: updatedUser.expirationDate
                            }
                        ]
                    }
                    
                };

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Usuario actualizado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al actualizar el usuario."}, err));
                });
            });

        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"text/plain"});
        res.end(JSON.stringify({message: "Error en la petición."}, err));
    });
}

adminController.adminDeleteUser = (req, res) => {
    let id = "";
    req.on("data", (chunk) => {
        id += chunk;
    });
    req.on("end", () => {
        const parsedId = JSON.parse(id);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"));
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });

            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};

                if(data.trim()){
                    db = JSON.parse(data);
                }
                
                db.users = db.users.filter((obj) => parsedId.id !== obj.id);
                
                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Usuario eliminado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al eliminar el usuario."}, err));
                });
            });
        }catch(err){
                res.writeHead(400, {"Content-Type":"application/json"});
                res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
    req.on("error", (err) => {
        res.writeHead(500, {"Content-Type":"text/plain"});
        res.end(JSON.stringify({message: "Error en la petición."}, err));
    });
}

adminController.deletePayment = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });

    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
    
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
    
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
    
                const user = db.users.find((user) => Number(user.document) === Number(parsedBody.userDocument));

                if(!user){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({message: "Usuario no encontrado."}));
                }

                const paymentUser = user.paymentHistory.find((payment) => Number(payment.id) === Number(parsedBody.paymentId));

                let subtractPaidDays = "";

                if(new Date(paymentUser.expirationDate.split('/').reverse().join('-')).getTime() > new Date().getTime()){

                    if(paymentUser.term === "1 Mes"){
                        subtractPaidDays = 30;
                    }
                    
                    for(let i = 2; i <= 12; i++){
                        if(paymentUser.term === `${i} Meses`){
                            subtractPaidDays = i * 30;
                        }
                    }
                    
                    let expirationDate = paymentUser.expirationDate; 
                    expirationDate = expirationDate.split('/').reverse().join('-');
                
                    const sortedPayments = user.paymentHistory.slice().sort((a, b) => {
                        const dateA = new Date(a.expirationDate.split('/').reverse().join('-')).getTime();
                        const dateB = new Date(b.expirationDate.split('/').reverse().join('-')).getTime();
                        return dateA - dateB;
                    });
    
                    if(sortedPayments.length >= 2){
                        const secondLastPayment = sortedPayments[sortedPayments.length - 2];
                        if(new Date(expirationDate).getTime() > new Date().getTime()){
                            user.plan = secondLastPayment.plan;
                            user.term = secondLastPayment.term;
                            user.expirationDate = secondLastPayment.expirationDate;
                            user.paidDays = user.paidDays - subtractPaidDays;
                        }
                    }else if(sortedPayments.length === 1){
                        if(new Date(expirationDate).getTime() > new Date().getTime()){
                            user.plan = "";
                            user.term = "";
                            user.expirationDate = "";
                            user.paidDays = user.paidDays - subtractPaidDays;
                        }
                    } 
                }

                if(user.paidDays < -1){
                    user.paidDays = -1;
                }

                const newPaymentHistory = user.paymentHistory.filter(
                    (payment) => Number(payment.id) !== Number(parsedBody.paymentId)
                );

                user.paymentHistory = newPaymentHistory;

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Pago eliminado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al eliminar el pago."}, err));
                });

            })
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
}

adminController.updatePayment = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });

    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
    
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });

            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
    
                const user = db.users.find((user) => Number(user.document) === Number(parsedBody.userDocument));

                if(!user){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({message: "Usuario no encontrado."}));
                }

                let updatePayment = user.paymentHistory.find(payment => Number(payment.id) === Number(parsedBody.paymentId));

                if(!updatePayment){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Pago no encontrado." }));
                }

                let updatePaidDays = "";
                if(parsedBody.term === "1 Mes"){
                    updatePaidDays = 30;
                }
                for(let i = 2; i <= 12; i++){
                    if(parsedBody.term === `${i} Meses`){
                        updatePaidDays = i * 30;
                    }
                }   
                let paymentTermDays = "";
                if(updatePayment.term === "1 Mes"){
                    paymentTermDays = 30;
                }
                for(let i = 2; i <= 12; i++){
                    if(updatePayment.term === `${i} Meses`){
                        paymentTermDays = i * 30;
                    }
                }

                user.weeklyFrequency = Number(parsedBody.weeklyFrequency);
                
          
               
                const parsedTermNumber = Number(parsedBody.term.split(' ')[0]);
                const paymentUserTermNumber = Number(updatePayment.term.split(' ')[0]);
                

                if(parsedTermNumber > paymentUserTermNumber){
                    user.paidDays = (user.paidDays + updatePaidDays) - paymentTermDays;
                }else{
                    user.paidDays = (user.paidDays - paymentTermDays) + updatePaidDays;
                }

                if(user.weeklyFrequency !== 5){
                    user.totalClasses = calculateTotalClassesDays(user.paidDays, user.weeklyFrequency);
                    user.remainingClasses = user.totalClasses;
                    user.lastUpdate = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                    user.accumulatorDays = 0;
                    user.lastDayUpdate = new Date().toISOString().split("T")[0].split("-").reverse().join("/");
                }else{
                    user.totalClasses = 0;
                    user.remainingClasses = 0;
                    user.lastUpdate = "";
                    user.accumulatorDays = 0;
                    user.lastDayUpdate = "";
                }

                updatePayment.plan = parsedBody.plan;
                updatePayment.term = parsedBody.term;
                updatePayment.amount = parsedBody.amount;
                updatePayment.paymentMethod = parsedBody.paymentMethod;
                
                user.plan = parsedBody.plan;
                user.term = parsedBody.term;
               
                if(new Date(updatePayment.expirationDate.split('/').reverse().join('-')).getTime() < new Date().getTime()){
                    user.expirationDate = user.expirationDate;
                }else{
                    const newExpirationDate = new Date(new Date().getTime() + user.paidDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0].split("-").reverse().join("/");

                    user.expirationDate = newExpirationDate;
                    updatePayment.expirationDate = newExpirationDate;
                }

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Pago actualizado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al actualizar el pago."}, err));
                });
            });
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."})); 
        }
    })
}

adminController.getMonthlyBalance = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });

    const parseDate = (fechaStr) => {
        const [day, month, year] = fechaStr.split('/');
        return new Date(`${year}-${month}-${day}T00:00:00`);
    }
    const normalizeISODate = (isoDateStr) => {
        const date = new Date(isoDateStr);
        date.setUTCHours(0, 0, 0, 0);
        return date;
    };
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
    
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });

            readStream.on("end", () => {
                let db = {};
                let monthlyBalance = {
                    userPayments: [],
                    productsPayments: [],
                    expensesPayments: []
                };
                if(data.trim()){
                    db = JSON.parse(data);
                }
                
                db.users.forEach(user => {
                    user.paymentHistory.forEach(payment => {
                        const initialDate = parseDate(payment.initialDate);
                        if(normalizeISODate(initialDate) >= normalizeISODate(parsedBody.from) && normalizeISODate(initialDate) <= normalizeISODate(parsedBody.to)){
                            monthlyBalance.userPayments.push({...payment, 
                                document: user.document,
                                firstname: user.firstname, 
                                lastname: user.lastname});
                        }
                    });
                });
                db.productsPaymentHistory.forEach(payment => {
                    const initialDate = parseDate(payment.date);
                    if(normalizeISODate(initialDate) >= normalizeISODate(parsedBody.from) && normalizeISODate(initialDate) <= normalizeISODate(parsedBody.to)){
                        monthlyBalance.productsPayments.push(payment);
                    }
                });

                db.expenses.forEach(expense => {
                    const initialDate = parseDate(expense.date);
                    if(normalizeISODate(initialDate) >= normalizeISODate(parsedBody.from) && normalizeISODate(initialDate) <= normalizeISODate(parsedBody.to)){
                        monthlyBalance.expensesPayments.push(expense);
                    }
                });

                if(monthlyBalance.userPayments.length > 0 || monthlyBalance.productsPayments.length > 0 || monthlyBalance.expensesPayments.length > 0){
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify(monthlyBalance));
                }else{
                    res.writeHead(404, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({ message: "No se encontró ningun pago entre las fechas recibidas." }));
                }
            })
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."})); 
        }
    })
}

adminController.createProductPayment = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
        
                const user = db.users.find((user) => user.document === parsedBody.document);
                db.productsPaymentHistory.push({
                    id: Date.now(),
                    document: parsedBody.document,
                    firstname: user ? user.firstname : parsedBody.firstname || "NN",
                    lastname: user ? user.lastname : parsedBody.lastname || "NN",
                    product: parsedBody.product,
                    date: parsedBody.date,
                    amount: parsedBody.amount,
                    paymentMethod: parsedBody.paymentMethod
                });

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Pago creado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al crear el pago."}, err));
                });
            });
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."})); 
        }
    })
}

adminController.deleteProductPayment = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
    
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
    
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
                
                const filterProducts = db.productsPaymentHistory.filter((payment) => Number(payment.id) !== Number(parsedBody.id));
                db.productsPaymentHistory = filterProducts;

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Pago eliminado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al eliminar el pago."}, err));
                });
            })
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
}

adminController.updateProductPayment = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
                const productUpdate = db.productsPaymentHistory.find((payment) => Number(payment.id) === Number(parsedBody.id));

                if(!productUpdate){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Producto no encontrado." }));
                }

                productUpdate.document = parsedBody.document;
                productUpdate.firstname = parsedBody.firstname;
                productUpdate.lastname = parsedBody.lastname;
                productUpdate.product = parsedBody.product;
                productUpdate.amount = parsedBody.amount;
                productUpdate.paymentMethod = parsedBody.paymentMethod;                
   
                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Pago del producto actualizado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al actualizar el pago del producto."}, err));
                });
            })
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
}

adminController.createExpense = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
        
                if(parsedBody.type === "Sueldo"){
                    db.expenses.push({
                        id: Date.now(),
                        type: parsedBody.type,
                        firstname: parsedBody.firstname,
                        lastname: parsedBody.lastname,
                        amount: parsedBody.amount,
                        date: parsedBody.date,
                    })                    
                }                
                if(parsedBody.type === "Alquiler" || parsedBody.type === "Gastos Varios"){
                    db.expenses.push({
                        id: Date.now(),
                        type: parsedBody.type,
                        detail: parsedBody.detail,
                        amount: parsedBody.amount,
                        date: parsedBody.date,
                    })                    
                }

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Egreso creado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al crear el egreso."}, err));
                });
            });
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."})); 
        }
    })
}

adminController.deleteExpense = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
    
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
    
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
                
                const filterExpense = db.expenses.filter((expense) => Number(expense.id) !== Number(parsedBody.id));
                db.expenses = filterExpense;

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Egreso eliminado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al eliminar el egreso."}, err));
                });
            })
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
}

adminController.updateExpense = (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        const parsedBody = JSON.parse(body);
        try{
            const readStream = fs.createReadStream(path.join(__dirname, "../data/database.json"))
            readStream.on("error", (err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Error al leer el archivo.", error: err.message}));
            });
            let data = "";
            readStream.on("data", (chunk) => {
                data += chunk;
            });
            readStream.on("end", () => {
                let db = {};
                if(data.trim()){
                    db = JSON.parse(data);
                }
                const expenseUpdate = db.expenses.find((expense) => Number(expense.id) === Number(parsedBody.id));

                if(!expenseUpdate){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "Producto no encontrado." }));
                }

                if(expenseUpdate.type === "Sueldo"){
                    expenseUpdate.firstname = parsedBody.firstname;
                    expenseUpdate.lastname = parsedBody.lastname;
                    expenseUpdate.amount = parsedBody.amount;
                    expenseUpdate.date = parsedBody.date;
                }
                if(expenseUpdate.type === "Alquiler" || expenseUpdate.type === "Gastos Varios"){
                    expenseUpdate.detail = parsedBody.detail;
                    expenseUpdate.amount = parsedBody.amount;
                    expenseUpdate.date = parsedBody.date;
                }

                const writeStream = fs.createWriteStream(path.join(__dirname, "../data/database.json"));
                writeStream.write(JSON.stringify(db, null, 2));
                writeStream.end();
                writeStream.on("finish", () => {
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Egreso actualizado correctamente."}));
                });
                writeStream.on("error", (err) => {
                    res.writeHead(500, {"Content-Type":"application/json"});
                    res.end(JSON.stringify({message: "Error al actualizar el egreso."}, err));
                });
            })
        }catch(err){
            res.writeHead(400, {"Content-Type":"application/json"});
            res.end(JSON.stringify({message: "JSON invalido."}));
        }
    });
}


module.exports = { adminController };