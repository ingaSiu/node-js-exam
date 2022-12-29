console.log('Hello');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8080;

const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.URI;
//console.log(uri);

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri);

app.listen(port, () => {
  console.log(`Servers is running on the ${port}`);
});

process.on('exit', () => {
  client.close();
  console.log(' Exit app closed...');
});

process.on('SIGINT', () => {
  //close mongodb client when exting server
  client.close();
  console.log(' Sigint app closed...');
});

app.post('/api/users', async (req, res) => {
  try {
    const con = await client.connect();
    const insertAddress = await con
      .db('users_db')
      .collection('addresses')
      .insertOne({
        city: req.body.address.city,
        street: req.body.address.street,
      });
    if (insertAddress) {
      const insertUser = await con
        .db('users_db')
        .collection('users')
        .insertOne({
          name: req.body.name,
          email: req.body.email,
          addressId: ObjectId(insertAddress.insertedId),
        });
      res.send(insertUser);
      return;
    }
    res.status(500).send('User not inserted');
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const con = await client.connect();
    const data = await con
      .db('users_db')
      .collection('users')
      .aggregate([
        {
          $lookup: {
            from: 'addresses',
            localField: 'addressId',
            foreignField: '_id',
            as: 'address',
          },
        },
        {
          $project: {
            _id: '$_id',
            name: '$name',
            email: '$email',
            address: { $first: '$address' },
          },
        },
      ])
      .toArray();
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.get('/api/users/names', async (req, res) => {
  try {
    const con = await client.connect();
    const data = await con.db('users_db').collection('users').find().toArray();
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});
