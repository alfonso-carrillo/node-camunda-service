const { Router } = require('express');
const router = Router();
const admin = require('firebase-admin');

// For make http request to camunda server
const https = require('http');
const { Client, logger } = require("camunda-external-task-client-js");
const { Variables } = require("camunda-external-task-client-js");

// configuration for the Client:
//  - 'baseUrl': url to the Workflow Engine
//  - 'logger': utility to automatically log important events
const config = { baseUrl: "http://localhost:8080/engine-rest", use: logger };

// create a Client instance with custom configuration
const client = new Client(config);

// Save if the user email is true or false
let isAuth = '';

//Subscribe to the worker checkAuthEmail
client.subscribe("checkAuthEmail", async function({ task, taskService }) {
    
    const processVariables = new Variables();

    // When the variable isAuth its different of empty send the variable alpha to the current instance in camunda
    if(isAuth !== ''){
        processVariables.set("alpha", isAuth);
        isAuth = '';
    }

    // complete the task
    await taskService.complete(task, processVariables);
});

// Firebase config with credentials
const serviceAccount = require("../../node-firebase-128ae-firebase-adminsdk-4hulp-57c2c76408.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://node-firebase-128ae.firebaseio.com/'
});
// End Firebase config with credentials

const db = admin.database();

router.get('/', (req, res) => {

    // Query to firebase and pass all the values
    db.ref('contacts').once('value', snapshot => {
        const data = snapshot.val();
        res.render('index', {contacts: data});
    });

});

router.post('/new-contact', (req, res) => {

    let contact = req.body;

    // Saves the user contact in object
    const newContact = {
        firstname: contact.firstname,
        lastname: contact.lastname,
        email: contact.email,
        phone: contact.phone
    };

    // Start the request to camunda to start a instance
    const data = JSON.stringify({});

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/engine-rest/process-definition/key/CheckEmail/start',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const requ = https.request(options, (resu) => {

        // When the request is OK check the user email and save the data on contacts(FIREBASE)
        resu.on('data', (d) => {
            isAuth = /alphacredit/.test(newContact.email);
            db.ref('contacts').push(newContact);
        })

    });

    requ.on('error', (error) => {
        console.error('soy error', error)
    });

    requ.write(data);
    requ.end();
    // End the request to camunda to start a instance

    // Redirects to the main page
    res.redirect('/');

});

router.get('/delete-contact/:id', (req, res) => {

    let id = req.params.id;

    // Removes the contact from firebase
    db.ref('contacts/'+ id).remove();
    
    // Redirects to the main page
    res.redirect('/');

});

module.exports = router;