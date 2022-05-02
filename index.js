import express, { json } from 'express'
import cors from 'cors'
import chalk from 'chalk'
import { MongoClient } from 'mongodb'

// BACKEND
const app = express()
app.use(cors())
app.use(json())
app.listen(5000, () => {
    console.log(chalk.bold.green('--------------------------\nExpress:UOl online : porta 5000'))
})

//MONGO
let database = null
const mongoClient = new MongoClient("mongodb://localhost:27017")
const promise = mongoClient.connect();
promise.then( () => {
    console.log(chalk.bold.green('Mongo: successful connection\n--------------------------'))
    database = mongoClient.db('UOL_DB')
} )
promise.catch(e => console.log(chalk.bold.red('Deu ruim conectar no Mongo',e)))

//Get participants
app.get('/participants', async (req, res) => {
    try {
        const participants = await database.collection('participants').find().toArray()
        console.log(chalk.bold.green('Requisição Get /participants Feita'))
        res.send(participants)
    } catch (err){
        console.log(chalk.bold.red('Erro Get /participants'))
        res.status(500).send( { error: err.message } )
    }
} )

//Post participants
app.post('/participants', async (req,res) => {
    const {name} = req.body
    console.log(chalk.bold.yellow('Nome participante: ',name))
    const participante = {
        name: `${name}`,
        lastStatus: Date.now()
        }
    //Requisitar Lista
    try {
        console.log(chalk.bold.blue('Requisição post /participants'))
        const userAlreadyExiste = await database.collection('participants').findOne( {name} )
        const usersList = await database.collection('participants').find().toArray()
        if(userAlreadyExiste){
            console.log(chalk.bold.red('User Already Existe'))
            res.status(409).send('User Already Existe')
            return
        }
        await database.collection("participants").insertOne(participante)
        console.log(chalk.bold.green('participante inserido com sucesso'), participante)
        console.log(chalk.bold.green('lista de usuarios'), usersList)
        res.sendStatus(201)
        } catch(err) {
            console.log(chalk.bold.red('Erro post participantes\n'), err)
            res.status(500).send('Erro post participantes')
        }
})

//Get Mensagens
app.get('/messages', async (req, res) => {
    const {limit} = req.query
    const {user} = req.headers
    try{
        let messagesList = await database.collection('messages').find().toArray()
        let start = messagesList.length - limit
        let end = messagesList.length
        let limitedMessagesList = messagesList.slice(start, end)
        let filteredMessageList = limitedMessagesList.filter(message => message.from === user || message.to === user || message.type === 'message')
        console.log(chalk.bold.blue('Get /messages'),filteredMessageList)
        res.status(201).send(filteredMessageList)
    } catch (err) {
        console.log(chalk.bold.red('erro Get',err))
        res.status(500).send('Deu Ruim')
    }
} )