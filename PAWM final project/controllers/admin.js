/**
 * controlla e gestisce le richieste dell'utente registrato (admin) e permette di svolgere tutte le classiche funzioni di un
 * e-commerce tra cui aggiungere prodotti, cancellare o editare il proprio annuncio di vendita.
 */

const { validationResult } = require('express-validator/check');

const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  //estraggo tutti i campi compilati dall'utente del form per aggiungere un prodotto
  const title = req.body.title;
  const imageUrl = req.body.imageUrl;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
//se ci sono errori di validazione viene lanciata un'eccezione
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
//se non ci sono errori di validazione creo il prodotto con i campi precedentemente estratti
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  //salvo il prodotto nel db
  product
    .save()
    .then(result => {
      console.log('Created Product');
      res.redirect('/admin/products');
    })
      //gestisco l'errore della promise nel caso dovesse presentarsi
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  //estraggo il query parameter se è true posso editare il prodotto altrimenti vengo reindirizzato alla home page
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  //estraggo l'id del prodotto di cui voglio editare i campi che è presente nell'url
  const prodId = req.params.productId;
  //cerco il prodotto tramite id nel db
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  //estraggo tutti "nuovi" campi del prodotto da editare inseriti dall'user nel form
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedImageUrl = req.body.imageUrl;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
//se ci sono errori di validazione lancio un'eccezione e la gestisco
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        imageUrl: updatedImageUrl,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
//cerco il prodotto nel db tramite id
  Product.findById(prodId)
    .then(product => {
      //controllo se il prodotto nel db e quello di cui abbiamo richiesto l'edit hanno lo stesso userId cioè se appartengono allo stesso user
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }
      //aggiorno i campi del prodotto con quelli appena inseriti nel form
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      product.imageUrl = updatedImageUrl;
      //salvo il prodotto aggiornato nel db
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
  //cerco i prodotti nel db appartenenti all'utente loggato, quindi ritorna tutti i prodotti che hanno userId uguale all'id dell'utente che effettua la richiesta
  Product.find({ userId: req.user._id })
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch(err => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
  //estraggo l'id del prodotto dal body della request
  const prodId = req.body.productId;
  //elimino dal db il prodotto che ha id uguale a quello estratto e userId uguale a quello dell'utente che ne ha fatto richiesta di delete
  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.redirect('/admin/products');
    })
    .catch(err => console.log(err));
};
