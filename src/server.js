import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {
        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true});
        const db = client.db('college-kitchen');
    
        await operations(db);
    
        client.close();
    } catch (error) {
        res.status(500).json({ message: 'Error connecting to db', error });
    }
};

app.get('/api/recipes', async (req, res) => {
    MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true}, function(err, db) {
        if (err) throw err;
        const mydb = db.db('college-kitchen');
        mydb.collection("posts").find({}).toArray(function(err, result) {
            if (err) throw err;
            res.status(200).json(result);
            db.close();
        });
    });
});

app.get('/api/recipes/type/:eatingTime', async (req, res) => {

    const eatingTime = req.params.eatingTime;

    MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true}, function(err, db) {

        if (err) throw err;
        const mydb = db.db('college-kitchen');
        mydb.collection("posts").find({eatingTime: eatingTime}).toArray(function(err, result) {
            if (err) throw err;
            res.status(200).json(result);
            db.close();
        });
    });
});

app.get('/api/recipes/:name', async (req, res) => {
    
    const foodName = req.params.name;

    MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true}, function(err, db) {

        if (err) throw err;
        const mydb = db.db('college-kitchen');
        mydb.collection("posts").find({name: foodName}).toArray(function(err, result) {
            if (err) throw err;
            res.status(200).json(result);
            db.close();
        });
    });
});

app.get('/api/recipes/id/:id', async (req, res) => {
    withDB(async (db) => {
        const recipeId = req.params.id;

        const recipeInfo = await db.collection('posts').findOne(ObjectId(recipeId));
        res.status(200).json(recipeInfo);
    }, res);
});

app.post('/api/profile/post', async (req, res) => {
    const { name, estimatedPrice, ingredients, steps, eatingTime, tokenID } = req.body;

    const {OAuth2Client} = require('google-auth-library');
    const client = new OAuth2Client('811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com');
    const ticket = await client.verifyIdToken({
        idToken: tokenID,
        audience: '811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    //get the id of a person from gmail
    const userid = payload['sub'];

    withDB(async (db) => {
        let doc = {
            name: name,
            estimatedPrice: estimatedPrice,
            ingredients: ingredients,
            steps: steps,
            eatingTime: eatingTime,
            userID: userid,
        };
        await db.collection('posts').insertOne(doc);
    }, res);
});

app.post('/api/tokensignin', async (req, res) => {
    const { token, year } = req.body;

    const {OAuth2Client} = require('google-auth-library');
    const client = new OAuth2Client('811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com');

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: '811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    //get the id of a person from gmail
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];

    withDB(async (db) => {
        let doc = {
            userID: userid,
            yearJoined: year
        };
        if (await db.collection('usersAndInfo').countDocuments() === 0 || await db.collection('usersAndInfo').countDocuments({userID: {$eq: userid}}, { limit: 1 }) === 0) {
            await db.collection('usersAndInfo').insertOne(doc);
        }
    }, res);
});

app.get('/api/userID/:userID', async (req, res) => {

    const token = req.params.userID;
    const {OAuth2Client} = require('google-auth-library');
    const client = new OAuth2Client('811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com');

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: '811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    //get the id of a person from gmail
    const userid = payload['sub'];

    MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true}, function(err, db) {

        if (err) throw err;
        const mydb = db.db('college-kitchen');
        mydb.collection("posts").find({userID: userid}).toArray(function(err, result) {
            if (err) throw err;
            res.status(200).json(result);
            db.close();
        });
    });
});




app.post('/api/profile-info/post', async (req, res) => {
    const { name, bioInfo, webLink, tokenID } = req.body;

    const {OAuth2Client} = require('google-auth-library');
    const client = new OAuth2Client('811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com');
    const ticket = await client.verifyIdToken({
        idToken: tokenID,
        audience: '811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    //get the id of a person from gmail
    const userid = payload['sub'];

    withDB(async (db) => {
        await db.collection('usersAndInfo').updateMany(
            { userID:  userid},
            [ 
                {$set: { name: name , bioInfo: bioInfo, webLink: webLink}}
            ]
        )
    }, res);
});


app.get('/api/profile/info/:tokenID', async (req, res) => {
    withDB(async (db) => {
        const token = req.params.tokenID;
        const {OAuth2Client} = require('google-auth-library');
        const client = new OAuth2Client('811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com');

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: '811899914639-fvblag6irfcvgoeel9fo4e3dkrcl21l9.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        //get the id of a person from gmail
        const userid = payload['sub'];

        const recipeInfo = await db.collection('usersAndInfo').findOne({userID:  userid}, {name: 1, bioInfo: 1, webLink: 1, yearJoined: 1, _id: 0, userID: 0});
        res.status(200).json(recipeInfo);
    }, res);
});

app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname + '/build/index.html'));
});


app.listen(8000, () => console.log('Listening on port 8000') );