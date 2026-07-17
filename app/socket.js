const { Server } = require('socket.io');

module.exports = function (server, app) {
    console.log('coming-cron-function')
    const io = new Server(server, {
        cors: {
            // origin: "http://localhost:4000",
            origin: process.env.SOCKET_ORIGIN || '*',
            methods: ["GET", "POST"]
        }
    });

    //  Make io globally available to controllers
    app.set('socketio', io);
    global.io = io; 
    io.on('connection', (socket) => {
        console.log('🟢 Socket connected:', socket.id);

        socket.on('chat message', (msg) => {
            console.log('💬', msg);
            io.emit('chat message', msg); // broadcast
        });

        socket.on('payment status', (msg) => {
            console.log('💬', msg);
            io.emit('payment status', msg); // broadcast
        });

        socket.on('disconnect', () => {
            console.log('🔴 Socket disconnected:', socket.id);
        });
    });
};

