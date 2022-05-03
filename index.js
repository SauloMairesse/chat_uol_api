import express, { json } from 'express'
import cors from 'cors'
import chalk from 'chalk'
import { MongoClient } from 'mongodb'
import joi from 'joi'
import dayjs from 'dayjs'
import dotenv from "dotenv"
dotenv.config()

//JOI Referencias 
const nameREF = joi.object({
    name: joi.string().required()
});
const statusREF = joi.object({
    lastStatus: joi.date().required()
});
const messageREF = joi.object({
    to: joi.string().required(),
    from: joi.string().required(),
    text: joi.string().required(),
    type: joi.any().valid('message', 'private_message').required(),
    time: joi.required()
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
const mongoClient = new MongoClient(process.env.MONGO_URL)
const promise = mongoClient.connect();
promise.then( () => {
    console.log(chalk.bold.green('Mongo: successful connection\n--------------------------'))
    database = mongoClient.db('UOL_DB')
} )
promise.catch(e => console.log(chalk.bold.red('Deu ruim conectar no Mongo',e)))

//Get participants
app.get('/participants', async (req, res) => {
    const {user} = req.headers
    
    try {
        const participants = await database.collection('participants').find().toArray()
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
        const userAlreadyExiste = await database.collection('participants').findOne( {name} )
        if(userAlreadyExiste){
            console.log(chalk.bold.red('User Already Existe'))
            res.status(409).send('User Already Existe')
            return
        }
        await database.collection("participants").insertOne(participante)
        await database.collection('messages').insertOne(message)
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
        console.log(chalk.bold.red('Erro validation Message\n', message))
        console.log(validation.error)
        res.sendStatus(422)
        return
    }
    try {
        const onlineUser = await database.collection('participants').findOne( {to} )
        if(onlineUser){
            console.log(chalk.bold.red('The user is not online'))
            res.status(404)
            return
        }
        await database.collection("messages").insertOne(message)
        console.log(chalk.bold.green('Message sent'))
        res.sendStatus(201)
        } catch(err) {
            console.log(chalk.bold.red('Erro post message'), err)
            res.status(500).send('Erro post message')
        }
})

//Post Status
app.post('/status', async (req, res) => {
    const {user} = req.headers
    try{
        await database.collection('participants').updateOne({name: user}, {$set: {lastStatus: Date.now()}})
        res.sendStatus(200)
    } catch (erro) {
        console.log(chalk.bold.red('User not found', erro))
        res.sendStatus(404)
    }
} )

// Delete participants
setInterval( async() => {
    const time = Date.now() - 10000
    let Offparticipants = []
    try {
        const participantesList = await database.collection('participants').find().toArray()
        Offparticipants = participantesList.filter( participante => participante.lastStatus < time);
    } catch (err) {
        console.log(chalk.bold.red('Erro setInterval, to Delete Participante', err))
    }
    Offparticipants.forEach(async (participante) => {
        try{
            await database.collection('messages').insertOne({from: participante.name, 
                                                             to: 'Todos', 
                                                             text: 'sai da sala...', 
                                                             type: 'status', 
                                                             time: dayjs().format('HH:mm:ss')})
            await database.collection('participants').deleteOne({name: participante.name})
        } catch (err) {
            console.log(chalk.bold.red('Erro forEach'))
        }
    })
}, 15000);