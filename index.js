const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const hbs = require('hbs');

app.use(express.json());
app.use(express.static('express'));

app.use('/public', express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

hbs.registerPartials(__dirname + '/views/partials');

// setting koneksi
const dbConnection = require('./connection/db')

// setting encoded data post
app.use(express.urlencoded({ extended: false }))

// setting express-session
const session = require('express-session')
app.use(
  session({
    cookie: {
      maxAge: 2 * 60 * 60 * 1000,
      secure: false,
      httpOnly: true
    },
    store: new session.MemoryStore(),
    saveUninitialized: false,
    resave: false,
    secret: 'secretValue'
  })
)

// setting flash message middleware
app.use((req, res, next) => {
  res.locals.message = req.session.message
  delete req.session.message
  next()
})

// setting multer
const uploadFile = require('./middlewares/uploadFile');
const { query } = require('./connection/db');

// setting folder uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// setting pathfile
const pathFile = "http://localhost:3000/uploads/"

// var isLogin = false;

app.get('/', function (req, res) {

  const query = `SELECT * FROM articles ORDER BY id DESC`

  dbConnection.getConnection((err, conn) => {
    if (err) throw err

    conn.query(query, (err, results) => {
      if (err) throw err

      let articles = []

      for (let result of results) {
        articles.push({
          ...result,
          image: pathFile + result.image
        })
      }

      if (articles.length == 0) {
        articles = false
      }

      res.render('index', {
        title: 'Articles',
        isLogin: req.session.isLogin,
        articles
      });
    })

    conn.release()
  })


});

app.get('/article/:id', function (req, res) {
  var { id } = req.params;

  const query = `SELECT * FROM articles WHERE id = ${id} `

  dbConnection.getConnection((err, conn) => {
    if (err) throw err

    conn.query(query, (err, results) => {
      if (err) throw err

      const article = {
        ...results[0],
        image: pathFile + results[0].image
      }

      res.render('article', {
        title: 'Articles',
        isLogin: req.session.isLogin,
        article
      });
    })

    conn.release()
  })
});

app.get('/article-add', function (req, res) {
  res.render('addArticle', {
    title: 'Add Articles',
    isLogin: req.session.isLogin
  });
});

app.post('/article-add', uploadFile('image'), function (req, res) {
  const { title, content } = req.body
  const image = req.file.filename
  const userId = req.session.user.id

  if (title == '' || content == '') {
    req.session.message = {
      type: "danger",
      message: "Please insert all field"
    }
    return res.redirect('/article-add')
  }

  const query = `INSERT INTO articles (title, image, content, user_id) VALUES ("${title}","${image}","${content}",${userId});`

  dbConnection.getConnection((err, conn) => {
    if (err) throw err

    conn.query(query, (err, results) => {
      if (err) {
        res.redirect('/article-add')
      } else {
        req.session.message = {
          type: "success",
          message: "Add article has successfully"
        }
        return res.redirect(`/article/${results.insertId}`)
      }
    })

    conn.release()
  })

})

app.get('/article-delete/:id', function (req, res) {
  const { id } = req.params

  const query = `DELETE FROM articles WHERE id = ${id}`

  dbConnection.getConnection((err, conn) => {
    if (err) throw err

    conn.query(query, (err, results) => {
      if (err) {
        req.session.message = {
          type: "danger",
          message: err.sqlMessage
        }
        res.redirect('/')
      } else {
        req.session.message = {
          type: "success",
          message: "Delete Article susccessfully"
        }
        res.redirect('/')
      }
    })

    conn.release()
  })
})

app.get('/article-edit/:id', function (req, res) {
  const { id } = req.params;
  const title = 'Edit Article';

  const query = `SELECT * FROM articles WHERE id = ${id};`;

  dbConnection.getConnection((err, conn) => {
    if (err) throw err;

    conn.query(query, (err, results) => {
      // if (err) throw err;
      const article = {
        ...results[0],
        image: pathFile + results[0].image,
      };
      res.render('editArticle', {
        title,
        isLogin: req.session.isLogin,
        article,
      });
    });

  });
});

app.post('/article-edit', uploadFile('image'), function (req, res) {
  let { id, title, content, oldImage } = req.body;

  let image = oldImage.replace(pathFile, '');

  if (req.file) {
    image = req.file.filename;
  }

  const query = `UPDATE articles SET title = "${title}", content = "${content}", image = "${image}" WHERE id = ${id}`;

  dbConnetion.getConnection((err, conn) => {
    // if (err) throw err;
    if (err) {
      console.log(err);
    }

    conn.query(query, (err, results) => {
      // if (err) throw err;

      if (err) {
        console.log(err);
      }
      res.redirect(`/article/${id}`);
    });

  });
});


app.get('/login', function (req, res) {
  res.render('login', {
    title: 'Login',
    isLogin: req.session.isLogin
  });
});

app.post('/login', function (req, res) {
  const { email, password } = req.body

  const query = `SELECT id, email, MD5(password), name FROM users WHERE email = '${email}' AND password = '${password}';`

  if (email == '' || password == '') {
    req.session.message = {
      type: "danger",
      message: "Please insert all field"
    }
    return res.redirect('/login')
  }

  dbConnection.getConnection((err, conn) => {
    if (err) throw err

    conn.query(query, (err, results) => {
      if (err) throw err

      if (results.length == 0) {
        req.session.message = {
          type: "danger",
          message: "Email or password not found"
        }
        return res.redirect('/login')
      } else {
        req.session.message = {
          type: "success",
          message: "Login successfuly"
        }

        req.session.isLogin = true

        req.session.user = {
          id: results[0].id,
          name: results[0].name,
          email: results[0].email
        }
        return res.redirect('/')
      }
    })

    conn.release()
  })
})

app.get('/register', function (req, res) {
  res.render('register', {
    title: 'Register',
    isLogin: req.session.isLogin
  });
});

app.post('/register', function (req, res) {
  const { email, name, password } = req.body

  if (email == '' || name == '' || password == '') {
    req.session.message = {
      type: "danger",
      message: "Please insert all field"
    }
    return res.redirect('/register')
  }

  const query = `INSERT INTO users (email, password, name) VALUES ('${email}','${password}','${name}');`

  dbConnection.getConnection((err, conn) => {
    if (err) throw err

    conn.query(query, (err, results) => {
      if (err) throw err

      req.session.message = {
        type: "success",
        message: "Register account has successfully"
      }

      res.redirect('/register')
    })

    conn.release()
  })
});

app.get('/logout', function (req, res) {
  req.session.destroy()
  res.redirect('/')
})

const server = http.createServer(app);
const port = 3000;
server.listen(port);
console.debug('Server listening on port ' + port);
