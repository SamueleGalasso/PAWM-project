/**
 * Questo è il file app.js, il principale dove importiamo tutti gli altri file principali tra cui le routes,
 * per gestire i vari path richiesti dall'utente, gestiamo inoltre gli errori tra cui error 404 e 500,
 * csrf protection contro gli attacchi csrf e infine ci connettiamo il database.
 *
 * Final Version
 */

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI =
  'mongodb+srv://samuele:Galaxy1998@pawm-htmuq.mongodb.net/shop';

const app = express();
//costruttore della sessione
const store = new MongoDBStore({
    //uri del db
  uri: MONGODB_URI,
    //nome della collection da creare
  collection: 'sessions'
});
const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

//body parser usato per parsare le incoming request
app.use(bodyParser.urlencoded({ extended: false }));
//middleware per servire file che hanno path "/"
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
//middleware usato come protezione contro gli attacchi di tipo csrf
app.use(csrfProtection);
//middleware usato per flashare messaggi tipicamente d'errore
app.use(flash());
//middleware usato per assicurarci che l'utente che effettua la richiesta sia presente nella sessione corrente nel database
//per cercarlo nel db uso l'id.
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
        //check per essere sicuri che non memorizzi undefined in req.user
        if(!user){
            return next();
        }
      req.user = user;
      next();
    })
    .catch(err => {
        throw new Error(err)
    });
});
//rendo isAuthenticated e csrfToken dei campi locali in modo da renderli disponibili a tutte le viste renderizzate
//durante questa request
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
//middlewares per gestire le routes
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
//middleware per gestire gli errori 404 e 500 rispettivamente path not found e server issues
app.use(errorController.get404);
app.use((error, req,res,next) => {
    console.log(error);
    res.redirect('/500');
});
//ci connettiamo al database e ci mettiamo in ascolto per la porta 3000
mongoose
  .connect(MONGODB_URI,
      {useNewUrlParser: true,
      useUnifiedTopology: true
      })
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
