import express, { json } from 'express'
import cors from 'cors'
import chalk from 'chalk'
import { MongoClient } from 'mongodb'

// BACKEND
const app = express()
app.use(cors())
app.use(json())
app.listen(5000, () => {
    console.log(chalk.bold.green('Servidor UOl online : porta 5000'))
})

let db;
const mongoClient = new MongoClient("mongodb://localhost:27017");
mongoClient.connect().then(() => {
    db = mongoClient.db("UOL_DB");
});

//Post User
app.post('/participants', (req,res) => {
    const theUser = req.body.name
    console.log(theUser)
    if(!theUser){  //user === ''
        res.status(422).send('Erro')
        return
    }

    let usersList = getUserList()
    let userAlreadyExiste = usersList.find( user => user.name === theUser.name) 
    if(!userAlreadyExiste){
        res.status(409).send('User Already Existe')
        return
    }
    registerUser(theUser)
    res.status(201).send('The User has been registred')
})

//Get participants
app.get('/participants', (req, res) => {
    let userList = getUserList()
    res.status(201).send(userList)
} )

//Get Mensagens
app.get('/messagens', (req, res) => {
    const limit = parseInt(req.query.limit)
    const user = req.header.user
    let listMesages = getMessagesList()
    res.status(201).send(listMesages)
} )

// app.post('/messages', (req, res) => {
//     const user = req.headers.user
//     const message = req.body
// })


// Functions
function registerUser(user) {
    db.collection("users").insertOne(
        {
            name: `${user}`,
            lastStatus: Date.now()
        });
    }
function getUserList(){
        let userslist
        db.collection("users").find().toArray().then(users => {
            userslist = users;
        });
        return userslist
    }
function getMessagesList(){
        let listMessages
        db.collection("messages").find().toArray().then(messages => {
            listMessages = messages // array de usuários
        });
        return listMessages
    }
function toSendMenssage(from,to,text,type){
        db.collection("messages").insertOne(
            {
                from: `${from}}`,
                to: `${to}`,
                text: `${text}`,
                type:`${type}`
            });
    }

// DATABASE
    //inserire um dado
// db.collection("users").insertOne({
// 	email: "joao@email.com",
// 	password: "minha_super_senha"
// });

    //Comando para buscar no DB
// db.coleçao.find( { oqQuero: 'pipipipopopo' } );
    
    //Fazendo busca no DB
// db.collection("users").findOne({
// 	email: "joao@email.com"
// }).then(user => {
// 	console.log(user); // imprimirá um objeto { "_id": ..., "email": ..., "password": ... } 
// });

    //Listar todos os documentos da coleção
// db.collection("users").find().toArray().then(users => {
//     console.log(users); // array de usuários
// });
