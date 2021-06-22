const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const _ = require('underscore');
const randomstring = require("randomstring");
const bodyParser = require('body-parser');

const port = 8067;
const authenticated = {};
const SECRET_KEY = 'S[dcDX.Y}j~XNnW^zRGx{]vJ94}z9<Qp';

// app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('<h1>TopERP Long Polling</h1>');
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});

app.get('/get_token', function (req, res) {
    const session_id = req.query.session_id;
    const secret_key = req.query.secret;
    if (!session_id || !secret_key || secret_key !== SECRET_KEY) {
        res.send('');
    }
    // const old_token = _.find(authenticated, function (s_session_id) {
    //     return s_session_id === session_id
    // });
    // if (old_token) {
    //     res.send(old_token);
    //     return;
    // }
    const token = randomstring.generate(32);
    authenticated[session_id] = token;
    res.send(token);
});

app.post('/post_message', function (req, res) {
    const secret_key = req.body.secret;
    if (!secret_key || secret_key !== SECRET_KEY) {
        res.send('');
    }
    const db = req.body.db;
    const channels = JSON.parse(req.body.channels);
    if (db && nsp && nsp.connected) {
        nsp.emit(db + ',notification', {channels: channels});
    }
    res.send('done');
});


const nsp = io.of('/socket.io');
nsp.on('connection', function (socket) {
    socket.authorized = false;
    const token = socket.handshake.query.token;
    const sid = socket.handshake.query.session_id;
    if (sid && token && authenticated[sid] === token) {
        socket.authorized = true;
        socket.emit('authorized');
        _.each(io.nsps, function (nsp) {
            if (_.findWhere(nsp.sockets, { id: socket.id })) {
                // console.log("restoring socket to", nsp.name);
                nsp.connected[socket.id] = socket;
            }
        });
    } else {
        socket.disconnect('unauthorized');
    }
    socket.on('t_ping', function () {
        socket.emit('t_pong');
    })
});
