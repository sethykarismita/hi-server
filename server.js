/* eslint-disable no-undef */

//................initialize app..........................
const express = require('express')
const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
const path = require('path');
const multer = require('multer');
let conStr = "mongodb://127.0.0.1:27017"
conStr = "mongodb+srv://sndsatya:QtAy7QbfwCnzUhvu@clustersnd.adfao0n.mongodb.net/"
const bcrypt = require("bcrypt")
const http = require('http')
const { Server } = require('socket.io')
const server = http.createServer(app)
const io = new Server(server, { cors: {} });
const fs = require('fs');

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}
//......a function for upload image.........
function uploadImage(req, res, folder, filename) {
  // Set storage engine
  const storage = multer.diskStorage({
    destination: `./uploads/${folder}/`,
    filename: function (req, file, cb) {
      cb(null, filename);
    }
  });
  //upload check file
  const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: function (req, file, cb) {
      checkFileType(file, cb);
    }
  }).single('photo');
  //upload the file
  upload(req, res, (err) => {
    if (err) {
      return ({ result: "error", message: err.message });
    } else {
      if (req.file == undefined) {
        res.send({ result: "error", message: "No file selected" });
      } else {
        res.send({ result: 'success', file: req.file.filename })
      }
    }
  });
};

//rout for upload pic
app.post('/upload/:folder/:filename', (req, res) => {
  uploadImage(req, res, req.params.folder, req.params.filename)
})

// Serve the uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//............default page.....................
app.get('/', (req, res) => {
  res.sendFile('index2.html', { root: path.join(__dirname) }, (err) => {
    if (err) { console.error('Error:', err); res.end() }
    else { console.log('file sent:index2.html'); res.end() }
  });
})
//...................mongodb...............................
const mongoClient = require('mongodb').MongoClient;
mongoClient.connect(conStr).then((clientObject) => {
  const db = clientObject.db('chatapp')
  //get all users data
  app.get('/users', (req, res) => {
    db.collection('users').find({}).toArray()
      .then((users) => { res.send(users); res.end() })
      .catch((er) => { console.log(er) })
  });
  //get user by id
  app.get('/user/:id', (req, res) => {
    db.collection('users').findOne({ email: req.params.id })
      .then((user) => { res.send(user); res.end() })
      .catch((er) => { console.log(er) })
  });
  //get all secondary users
  app.get('/users/:id', (req, res) => {
    db.collection('users').find({ $nor: [{ email: req.params.id }] }).toArray()
      .then((users) => { res.send(users); res.end() })
      .catch((er) => { console.log(er) })
  });
  //add user(single)
  app.post('/user', async (req, res) => {
    var hashPassword = await bcrypt.hash(req.body.password, 10)
    var newUser = {
      id: req.body.id,
      name: req.body.name,
      email: req.body.email,
      password: hashPassword,
      pic: req.body.pic
    }
    db.collection('users').insertOne(newUser).then((data) => {
      data.info = "Signup success. You can login now!"
      res.send(data); res.end()
    })
      .catch((er) => { console.log(er) })
  });

  //login user id and password
  app.get('/login/:email/:password', (req, res) => {
    db.collection('users').findOne({ email: req.params.email }).then(async (data) => {
      if (data) {
        const hashPassword = await bcrypt.compare(req.params.password, data.password)
        if (hashPassword) { data.result = "success"; res.send(data); res.end() }
        else { res.send("Error: Invalid credentials"); res.end() }
      } else { res.send("Error: User not found"); res.end() }
    })
      .catch((er) => { console.log(er) })
  });
  //view chats by ids
  app.get('/chats/:email/', (req, res) => {
    db.collection('chats').find({ $or: [{ p1: req.params.email }, { p2: req.params.email }] })
      .toArray().then((chats) => { res.send(chats); res.end() })
      .catch((er) => { console.log(er) })
  });
  //delete user
  app.delete('/deleteuser/:email', (req, res) => {
    db.collection('users').deleteOne({ email: req.params.email })
      .then(() => { res.send('User deleted successfully!!'); res.end() })
      .catch((er) => { console.log(er) })
  });
  //update image name
  app.put('/updatepic/:email/:newpic', (req, res) => {
    db.collection('users').updateOne({ email: req.params.email }, { $set: { pic: req.params.newpic } })
      .then(() => {
        res.send("Profile pic changed successfully!!") 
        const directory = path.join(__dirname, 'uploads/users');
        const recetFile=req.params.newpic;
        const email=req.params.email;
        fs.readdir(directory, (err, files) => {
          if (err) throw err;
          files.forEach(file => {
            if (file.startsWith(email) && file !== recetFile) {
              fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
                res.end()
              });
            }
          });
        });
      })
  });
  //update name
  app.put('/updatename/:email/:newname', (req, res) => {
    db.collection('users').updateOne({ email: req.params.email }, { $set: { name: req.params.newname } })
      .then(() => { res.send("Name changed successfully!!") })
  });
  //update password
  app.put('/updatepassword/:email/:newpassword', async (req, res) => {
    var hashPassword = await bcrypt.hash(req.params.newpassword, 10)
    db.collection('users').updateOne({ email: req.params.email }, { $set: { password: hashPassword } })
      .then(() => { res.send("Password changed successfully!!"); res.end() })
  });
  //update profile pic
  app.put('/updatepic/:email/:newpic', (req, res) => {
    db.collection('users').updateOne({ email: req.params.email }, { $set: { pic: req.params.newpic } })
      .then(() => { res.send("Profile pic changed successfully!!"); res.end() })
  });

})

//.................connect to socket.................
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  // Emit the list of all rooms to the newly connected user
  socket.emit('roomList', Array.from(io.sockets.adapter.rooms.keys()));

  socket.join(userId);
  // Broadcast the updated room list to all users when a new room is created
  io.emit('roomList', Array.from(io.sockets.adapter.rooms.keys()));

  mongoClient.connect(conStr).then((clientObject) => {
    const db = clientObject.db('chatapp')
    //add chat
    app.post('/chat', (req, res) => {
      db.collection('chats').insertOne(req.body).then(() => {
        //send chat to receiver
        io.to(req.body.p2).emit('message', req.body);
        res.send(req.body); res.end()
      })
    });
  })

  // Broadcast the updated user list to all users when a user disconnects
  socket.on('disconnect', () => {
    io.emit('roomList', Array.from(io.sockets.adapter.rooms.keys()));
  });
});


//.....................view all files............................................................................
app.get('/files/:folder/:subfolder', (req, res) => {
  const uploadsDir = path.join(__dirname, req.params.folder + "/" + req.params.subfolder);
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory: ' + err);
    }
    res.send(files);
  });
});
//................. files from folder.................................
app.get('/files/:folder', (req, res) => {
  const uploadsDir = path.join(__dirname, req.params.folder);
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory: ' + err);
    }
    res.send(files);
  });
});
//...................delete a file from server...................
const uploadsDir = path.join(__dirname, 'uploads/pics');
app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send('Error deleting file');
    }
    res.send(`File ${filename} deleted successfully`);
  });
});
//......................delete all from sub folder........................
app.delete('/deleteall/:fubfolder', (req, res) => {
  const directory = path.join(__dirname, 'uploads/' + req.params.fubfolder);
  fs.readdir(directory, (err, files) => {
    if (err) throw err;
    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
        res.send('All files from subfolder ' + req.params.fubfolder + " deleted.")
        res.end()
      });
    }

  });
})

//listen to the server
const port = 6060
server.listen(port, () => { console.log(`Server started at port:${port}`) })