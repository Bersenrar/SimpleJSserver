const http = require("http");
const {MongoClient} = require("mongodb");
const fs = require("fs");
const path = require("path");

const port = 5555;

const conn_url = "mongodb://127.0.0.1:27017/";
const dbName = "TasksManager";

http.createServer(async (req,  res)=>{
    console.log(`Received request: {url ${req.url}, method ${req.method}}`)

    if (req.url.startsWith("/static/")){
        let url_path = req.url.split("/")
        console.log("Requested static file: ", path.join(__dirname, "static", url_path[2], url_path[3]))
        let type = (url_path[3].endsWith(".svg")) ? "image/svg+xml": "text/css";
        fs.readFile(path.join(__dirname, "static", url_path[2], url_path[3]), (err, data)=>{
           if (!err){
               res.setHeader("Content-type", type)
               res.statusCode = 200;
               res.write(data);
           }else{
               res.statusCode = 400;
               res.write("Something went wrong");
           }
           res.end();
        });
    }

    if (req.url === "/"){
        fs.readFile("./static/html/index.html", (err, data)=>{
           if (!err){
               res.setHeader("Content-Type", "text/html; charset=utf-8");
               res.write(data);
               res.statusCode = 200;
           } else {
               res.statusCode = 400;
               res.write("<h1>Something went wrong</h1>");
           }
            res.end();
        });
    } else if (req.url === "/upload_data"){
        let user_form = "";
        req.on("data", (part)=>{user_form = user_form + part;})
        req.on("end", async ()=>{
            console.log(user_form);
            let toDBform = {}
            for (let chunk of user_form.split("&")){
                chunk = chunk.split("=");
                toDBform[chunk[0]] = decodeURIComponent(chunk[1].replace(/\+/g, " "));
            }
            toDBform["Done"] = false;
            const client = new MongoClient(conn_url);
            try {
                await client.connect();
                const db = client.db(dbName);
                const tasksCollection = db.collection("Tasks");
                await tasksCollection.insertOne(toDBform);
                console.log(toDBform);
                res.write("OK\n");
                res.statusCode = 200;
            } catch (err){
                res.write(`Something went wrong\n${err}`);
                res.statusCode = 400;
            }
            await client.close();
            res.end();
        })
    } else if (req.url === "/get_data_by_name"){
        const client = new MongoClient(conn_url);
        let user_form = "";
        req.on("data", (part)=>{
            user_form = user_form + part;
        });
        req.on("end", async ()=>{
            let nameToSearch = decodeURIComponent(user_form.split("=")[1].replace(/\+/g, " "));
            try {
                await client.connect();
                const db = client.db(dbName);
                const tasksCollection = db.collection("Tasks");
                let taskObject = await tasksCollection.findOne({"taskName": nameToSearch});
                res.statusCode = 200;
                console.log(taskObject);
                if (!taskObject){
                    res.write("No object found");
                } else{
                    res.write(`
                    <style>
                        div {
                            border: 1px solid;
                            display: block;
                            text-align: center;
                        }
                        a {
                            display: block;
                        }
                    </style>
                    <div>
                        <h3>Task: ${taskObject["taskName"]}</h3>
                        <p>Description: ${taskObject["taskDescription"]}</p>
                        <p>Deadline: ${taskObject["taskDeadline"]}</p>
                        <p>Done: ${taskObject["Done"]}</p>
                        <a href="/">Return to main page</a>
                    </div>`
                    );
                }
            }catch (err){
                console.log("Something went wrong: ", err);
                res.statusCode = 400;
                res.write("Something went wrong");
            }
            res.end()
        });
    } else if (req.url.startsWith("/get_data")){
        const client = new MongoClient(conn_url);
        try {
            await client.connect();
            const db = client.db(dbName);
            const tasksCollection = db.collection("Tasks");
            if (req.url.substring(10)){
                let nameToChange = decodeURIComponent(req.url.substring(10)).split("=")[1];
                await tasksCollection.updateOne({"taskName": nameToChange}, {$set: {"Done": true}});
            }
            const data = await tasksCollection.find({}).toArray();
            res.setHeader("Content-type", "text/html");
            res.statusCode = 200;
            res.write(`
                <h2>All tasks</h2>
                <a href='/' id="return_link"><p>Return to main page</p></a>
                `)
            for (let task of data){
                if (!task["Done"]){
                    res.write(`
                        <style>
                            div {
                                border: 1px solid;
                                display: block;
                                text-align: center;
                            }
                            a {
                                display: block;
                                text-decoration: none;
                                color: black;
                            }
                            a p {
                                width: 100px;
                                height: 30px;
                                background: aquamarine;
                            }
                            #return_link p{
                                width: 150px;
                                height: 30px;
                                background: aquamarine;
                            }
                            a p:hover{
                                background: cadetblue;
                                transition: 0.5s ease;
                            }
                        </style>
                        <div>
                            <h3>Task: ${task["taskName"]}</h3>
                            <p>Description: ${task["taskDescription"]}</p>
                            <p>Deadline: ${task["taskDeadline"]}</p>
                            <p>Done: <b>${task["Done"]}</b></p>
                            <a href="/get_data?name_to_mark=${task['taskName']}"><p>Mark as done</p></a>
                        </div>`
                    );
                } else {
                    res.write(`
                        <style>
                            div {
                                border: 1px solid;
                                display: block;
                                text-align: center;
                            }
                            a {
                                display: block;
                                text-decoration: none;
                                color: black;
                            }
                            a p {
                                width: 100px;
                                height: 30px;
                                background: aquamarine;
                            }
                            #return_link p{
                                width: 150px;
                                height: 30px;
                                background: aquamarine;
                            }
                            a p:hover{
                                background: cadetblue;
                                transition: 0.5s ease;
                            }
                        </style>
                        <div>
                            <h3>Task: ${task["taskName"]}</h3>
                            <p>Description: ${task["taskDescription"]}</p>
                            <p>Deadline: ${task["taskDeadline"]}</p>
                            <p>Done: <b>${task["Done"]}</b></p>
                            <p>Task Marked as Done</p>
                        </div>`
                    );
                }
            }
        } catch (error){
            console.log("Something went wrong", error);
        }
        await client.close();
        res.end();
    }
}).listen(port, ()=>{
    console.log("Server run on port: ", port)
});

