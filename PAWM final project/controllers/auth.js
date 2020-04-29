/**
 * Questo controller è utilizzato per gestire le richieste di autenticazione, quindi ad esempio un'utente non registrato
 * utilizzerà una funzione di questo file per fare il sign-up, o per resettare la password o per effettuare il logout.
 * Inoltre è stato aggiunta una funzione per inviare e-mail all'utente che si è registrato o che vuole effettuare un
 * reset password contenente un link di reset.
 *
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');


//dati gmail per inviare email ad utenti registrati
let transporter = nodemailer.createTransport({
  service:'gmail',
  auth: {
    user: 'shop.pawm@gmail.com',
    pass: 'unicam2020'
  }
});


exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  //estraggo email e password inseriti nel form dall'utente
  const email = req.body.email;
  const password = req.body.password;
 //controllo se ci sono errori di validazione degli input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //se ci sono errori renderizzo la stessa pagina mantenendo i vecchi input settando status code a 422 e flashando un messaggio d'errore
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }
  //superati i controlli di validation cerco un'utente nel db per email usando quella inserita nel form

  User.findOne({ email: email })
    .then(user => {
      //se l'user non viene trovato viene rendirizzata la stessa pagina settato lo status code a 422 e flashato il messaggio d'errore
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput: {
            email: email,
            password: password
          },
          validationErrors: []
        });
      }
      //se l'user viene trovato nel db utilizzo bcrypt per comparare la password inserita nel form e quella nel db che è criptata
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          //se matchano le password setto i parametri della sessione a true e memorizzo nel campo user l'utente loggato
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            //salvo la sessione nel db
            return req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          }
          //se le password non matchano renderizzo la stessa pagina setto lo status code a 422 e flasho il messaggio d'errore
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
              email: email,
              password: password
            },
            validationErrors: []
          });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  //estraggo email e password inseriti nel form dall'utente
  const email = req.body.email;
  const password = req.body.password;
 //controllo se ci sono errori di validazione nel caso renderizzo la stessa pagina setto status code a 422 e flasho un messaggio d'errore
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    });
  }
  //se non ci sono errori di validazione uso bcrypt per criptare la password, creo l'user e lo salvo nel db

  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] }
      });
      return user.save();
    })
      //invia un'email all'utente appena registrato per informarlo che l'operazione ha avuto successo
    .then(result => {
      let mailOptions = {
        from: 'shop.pawm@gmail.com',
        to: email,
        subject: 'You have signed up successfully!',
        text: 'Congratulations, you have been registered to our e-commerce successfully, enjoy our website!'
      };
      transporter.sendMail(mailOptions, function (err,data) {
        if(err){
          console.log('error',err);
        }else{
          console.log('email sent');
        }

      });
      res.redirect('/login');
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  //distruggo la sessione e reindirizzo alla home page
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    //creo una stringa di randomBytes
    const token = buffer.toString('hex');
    //cerco nel db l'utente per email usando quella inserita nel form di reset
    User.findOne({ email: req.body.email })
      .then(user => {
        //se non trova l'user flasha un messaggio d'errore
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }
        //se l'utente viene trovato memorizzo nei campi resetToken e resetTokenExpiration  rispettivamente token e una expiration date di un ora di tempo rispetto ad adesso.
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        //salvo l'utente nel db
        return user.save();
      })
      .then(result => {
        res.redirect('/');
        let mailOptions = {
          //invio un'email contenente un link di reset, che ha come parametro lo stesso token che abbiamo generato precedentemente e salvato nel db nel campo resetToken dell'user
          from: 'shop.pawm@gmail.com',
          to: req.body.email,
          subject: 'Password Reset',
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `
        };
        transporter.sendMail(mailOptions, function (err,data) {
          if(err){
            console.log('error',err);
          }else{
            console.log('email sent');
          }
        });
      })
      .catch(err => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  //estraggo il token presente nell'url
  const token = req.params.token;
  //cerco nel db l'utente che ha questo token memorizzato nel campo resetToken e controllo che non sia scaduta la expiration date
  //memorizzata nel campo resetTokenExpiration
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  //estraggo password e user id
  const newPassword = req.body.password;
  const userId = req.body.userId;
  console.log(userId.toString());
  const passwordToken = req.body.passwordToken;
  let resetUser;
  // cerco nel db l'user con lo stesso resetToken, expiration date valida e stesso user id estratto dal corpo della request

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
      //cripto la nuova password
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
      //aggiorno la password e setto gli i token di reset ad undefined
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(result => {
      res.redirect('/login');
    })
    .catch(err => {
      console.log(err);
    });
};
