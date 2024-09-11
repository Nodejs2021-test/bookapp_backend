const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
dotenv.config();

const app = express();

app.use(bodyParser.json());

app.use(cors());
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Connect to database
db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});


// Get all products
app.get('/products', (req, res) => {
  const searchTerm = req.query.name_like || '';
  db.query(
    'SELECT * FROM products WHERE name LIKE ?',
    [`${searchTerm}%`],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    }
  );
});

// 2. Get a single product by ID
app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(results[0]);
  });
});


// 3. Create a new product
app.post('/products', (req, res) => {
  const product = req.body;
  const query = `INSERT INTO products (id, name, overview, long_description, price, poster, image_local, rating, in_stock, size, best_seller) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    product.id,
    product.name,
    product.overview,
    product.long_description,
    product.price,
    product.poster,
    product.image_local,
    product.rating,
    product.in_stock,
    product.size,
    product.best_seller
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ message: 'Product created successfully', id: results.insertId });
  });
});

// 4. Update an existing product by ID
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = req.body;
  const query = `UPDATE products SET name = ?, overview = ?, long_description = ?, price = ?, poster = ?, image_local = ?, rating = ?, in_stock = ?, size = ?, best_seller = ? WHERE id = ?`;
  const values = [
    product.name,
    product.overview,
    product.long_description,
    product.price,
    product.poster,
    product.image_local,
    product.rating,
    product.in_stock,
    product.size,
    product.best_seller,
    id
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ message: 'Product updated successfully' });
  });
});

// 5. Delete a product by ID
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM products WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted successfully' });
  });
});

// 6. Get a featured_products
app.get('/featured_products', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM products ORDER BY RAND() limit 6', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(results);
  });
});

// JWT secret key
const JWT_SECRET = 'idgewwb1148w6asaas';

// Register API
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  // Check if user already exists
  db.query('SELECT email FROM users WHERE email = ?', [email], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) throw err;

      // Insert new user into database
      db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash], (err, results) => {
        if (err) throw err;
        const token = jwt.sign(
          { id: results.insertId, results }, // Payload: user id and email
          JWT_SECRET, // Secret key
          { expiresIn: '1h' } // Token expires in 1 hour
        );
        data = {
          id: results.insertId,
          accessToken: token
        }
        res.status(201).json({ message: 'User registered successfully.', result: data });
      });
    });
  });
});

// Login API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  // Check if user exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare hashed password
    bcrypt.compare(password, results[0].password, (err, isMatch) => {
      if (err) throw err;

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // Generate JWT
      const token = jwt.sign({ id: results[0].id }, JWT_SECRET, { expiresIn: '1h' });
      results[0].accessToken = token;
      res.json({ message: 'Logged in successfully.', result: results[0] });
    });
  });
});

// 2. Get a single product by ID
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(results[0]);
  });
});

//Crete order 

app.post('/orders', (req, res) => {
  const { user, cartList, amount_paid, orders_id, quantity } = req.body;
  const productIds = cartList.map(item => item.id).join(',');
  const insertQuery = `INSERT INTO orders (product_id, user_id, amount_paid,orders_id,total_quantity, status) VALUES (?, ?, ?, ?,?,?)`;
  // cartList.forEach((item) => {
  db.query(insertQuery, [productIds, user.id, amount_paid, orders_id, quantity, '1'], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database insertion error' });
    }
  });
  // });

  // Respond back to client after all inserts
  //res.status(200).json({ message: 'Order created successfully' });
  res.json({ result: req.body });
});


//get Product to userID
app.get('/user-products/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT 
      o.id AS order_id,
      o.amount_paid,
      o.total_quantity AS quantity,
      p.id AS product_id,
      p.name,
      p.overview,
      p.long_description,
      p.price,
      p.poster,
      p.image_local,
      p.rating,
      p.in_stock,
      p.size,
      p.best_seller,
      u.name AS user_name,
      u.email AS user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN products p ON FIND_IN_SET(p.id, o.product_id) > 0
    WHERE o.user_id = ?
    ORDER BY o.id, p.id
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving orders and products' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No orders found for this user' });
    }
    const orders = results.reduce((acc, row) => {
      const { order_id, amount_paid, quantity, product_id, name, overview, long_description, price, poster, image_local, rating, in_stock, size, best_seller, user_name, user_email } = row;
      if (!acc[order_id]) {
        acc[order_id] = {
          id: order_id,
          amount_paid,
          quantity,
          user: {
            name: user_name,
            email: user_email,
            id: userId
          },
          cartList: []
        };
      }

      // Push product details into the correct order
      acc[order_id].cartList.push({
        id: product_id,
        name,
        overview,
        long_description,
        price,
        poster,
        image_local,
        rating,
        in_stock,
        size,
        best_seller
      });

      return acc;
    }, {});

    // Convert orders object to array
    const resultArray = Object.values(orders);
    // Send the response back to the client
    res.status(200).json(resultArray);
  });
});




// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
