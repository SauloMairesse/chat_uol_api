import express, { json } from 'express'
import cors from 'cors'
import chalk from 'chalk'
import { MongoClient } from 'mongodb'
import Joi from 'joi'

//JOI

const nameREF = Joi.object({
    name: Joi.string().required()
});

const statusREF = Joi.object({
    lastStatus: Joi.date().required()
});

const messageREF = Joi.object({
    to: Joi.string().required(),
    from: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.any().valid('message', 'private_message').required()
});

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
        // console.log(chalk.bold.green('Requisição Get /participants Feita'))
        res.send(participants)
    } catch (err){
        console.log(chalk.bold.red('Erro Get /participants'))
        res.status(500).send( { error: err.message } )
    }
} )

//Post participants
app.post('/participants', async (req,res) => {
    const {name} = req.body
    
    const validation = nameREF.validate({name}, {abortEarly: true})
    if(validation.error) {
        res.sendStatus(422)
        return
    }
    
    console.log(chalk.bold.yellow('Nome participante: ',name))
    const participante = {
        name: `${name}`,
        lastStatus: Date.now()
    }
    const message = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format("HH:mm:ss")
    }
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
        await database.collection('messages').insertOne(message)
        console.log(chalk.bold.green('post /participants'), participante)
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
        let filteredMessageList = limitedMessagesList.filter(message => message.to === 'Todos' || message.type === 'private_message' && message.to === user || message.type === 'private_message' && message.from === user)
        // console.log(chalk.bold.blue('Get /messages'))
        res.status(201).send(filteredMessageList)
    } catch (err) {
        console.log(chalk.bold.red('erro Get',err))
        res.status(500).send('Deu Ruim')
    }
} )

//Post messages
app.post('/messages', async (req,res) => {
    const {to, text, type} = req.body
    const {user} = req.headers
    const message = {
        to: `${to}`,
        from: `${user}`,
        text: `${text}`,
        type: `${type}`,
        time: dayjs().format("HH:mm:ss")
    }

    const validation = messageREF.validate(message, {abortEarly: true})
    if(validation.error){
        res.sendStatus(422)
        return
    }

    console.log(chalk.bold.yellow(`mensagem: ${message.to}\n${message.from}\n${message.text}\n${message.type}\n${message.time}`))
    //Requisitar Lista Mensagem
    try {
        console.log(chalk.bold.blue('post /messages'))
        const onlineUser = await database.collection('participants').findOne( {to} )
        const mensagensExistentes = await database.collection('messages').find().toArray()
        if(onlineUser){
            console.log(chalk.bold.red('User is not online '))
            res.status(404)
            return
        }
        await database.collection("messages").insertOne(message)
        console.log(chalk.bold.green('mensagem enviada com sucesso'),message)
        // console.log(chalk.bold.green('mensagens existente:\n'), mensagensExistentes)
        res.sendStatus(201)
        } catch(err) {
            console.log(chalk.bold.red('Erro post message\n'), err)
            res.status(500).send('Erro post message')
        }
})

//Post Status
app.post('/status', async (req, res) => {
    const {user} = req.headers
    
    try{
        const onlineUser = await database.collection('participants').findOne({user})
        if(!onlineUser){
            console.log(chalk.bold.red('Erro post Status'))
            res.sendStatus(404)
            return
        }
    } catch (erro) {
        res.sendStatus(500)
    }
} )

//Delete participants
app.delete('/message/:id', async (req, res) => {
    const {id} = req.params;
    try{
        const message = await database.collection('messages').findOne({ _id: new mongodb.ObjectId(id) });
        if(!message){
            res.sendStatus(404)
        }
    } catch (err) {}
} )