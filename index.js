console.log('Hello');

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.URI;
// console.log(uri);

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
  // close mongodb client when exting server
  client.close();
  console.log(' Sigint app closed...');
});

const getExternalNames = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users');
  const jsonBody = await response.json();
  return jsonBody;
};

const insertUsers = async (user, con) => {
  const insertAddress = await con.db('users_db').collection('addresses').insertOne({
    city: user.address.city,
    street: user.address.street,
  });
  if (insertAddress) {
    const insertUser = await con
      .db('users_db')
      .collection('users')
      .insertOne({
        name: user.name,
        email: user.email,
        addressId: ObjectId(insertAddress.insertedId),
      });
    return insertUser;
  }
  return {};
};

const getUsers = async (con) => {
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
  return data;
};

app.post('/api/fill', async (req, res) => {
  try {
    const newUsers = await getExternalNames();
    const con = await client.connect();
    const usersData = await getUsers(con);

    newUsers.forEach((user) => {
      const exists = usersData.find(
        (existingUser) => existingUser.name === user.name && existingUser.email === user.email,
      );
      if (!exists) {
        insertUsers(user, con);
      }
    });
    res.send('inserted');
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const con = await client.connect();
    const insertUser = await insertUsers(req.body, con);
    res.send(insertUser);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const con = await client.connect();
    const usersData = await getUsers(con);
    res.send(usersData);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.get('/api/users/names', async (req, res) => {
  try {
    const con = await client.connect();
    const data = await con
      .db('users_db')
      .collection('users')
      .aggregate([
        {
          $project: {
            _id: '$_id',
            name: '$name',
          },
        },
      ])
      .toArray();
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.get('/api/users/emails', async (req, res) => {
  try {
    const con = await client.connect();
    const data = await con
      .db('users_db')
      .collection('users')
      .aggregate([
        {
          $project: {
            _id: '$_id',
            name: '$name',
            email: '$email',
          },
        },
      ])
      .toArray();
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.toString() });
  }
});

app.get('/api/users/address', async (req, res) => {
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
