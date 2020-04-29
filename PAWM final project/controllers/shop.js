/**
 * Questo controller gestisce tutte le richieste legate allo shop quindi il caricamento dei prodotti presenti nel database
 * il caricamento del carrello, del checkout ecc.
 * Inoltre con l'aggiunta di stripe all'applicazione, è possibile effettuare dei pagamenti.
 */

const Product = require('../models/product');
const Order = require('../models/order');
const nodemailer = require('nodemailer');
//secret key di stripe pacchetto usato per effettuare pagamenti
const stripe = require('stripe')('sk_test_0c9fbwyR4YV86SJSdkV3G9Ws00GZVME69p');
//dati gmail per inviare email ad utenti registrati
let transporter = nodemailer.createTransport({
    service:'gmail',
    auth: {
        user: 'shop.pawm@gmail.com',
        pass: 'unicam2020'
    }
});

//numero prodotti per pagina
const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    //memorizzo in page la rappresentazione numerica del query parameter che indica il numero della pagina, se non esiste è 1 di default
    const page = +req.query.page || 1;
    let totalItems;

    //conto tutti i prodotti presenti nel database e li divido in pagine
    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        //renderizzo la pagina product-list
        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'Products',
                path: '/products',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

//controller per la richiesta di vedere i dettagli di un singolo prodotto
exports.getProduct = (req, res, next) => {
    //estraggo dall'url il parametro che in questo caso è il product id e cerco nel db il prodotto tramite id e lo renderizzo
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => console.log(err));
};

//renderizza la home page
exports.getIndex = (req, res, next) => {
    //memorizzo in page la rappresentazione numerica del query parameter che indica il numero della pagina, se non esiste è 1 di default
    const page = +req.query.page || 1;
    let totalItems;

    //conto tutti i prodotti presenti nel db e li divido per pagine in questo caso due per pagina
    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

//renderizza il carrello dell'user loggato
exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => console.log(err));
};

//controller usato per aggiungere prodotti al carrello
exports.postCart = (req, res, next) => {
    //estraggo l'id del prodotto
  const prodId = req.body.productId;
  //cerco il prodotto nel db tramite id
  Product.findById(prodId)
    .then(product => {
        //se lo trovo con successo lo aggiungo al carrello
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

//controller usato per eliminare un prodotto dal carrello
exports.postCartDeleteProduct = (req, res, next) => {
    //cerco nel db il prodotto tramite id
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
        //dopo aver eliminato il prodotto vengo reindirizzato alla pagina del carrello
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

//controller che renderizza la pagina del checkout
exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            //memorizzo in products i cart items presenti nel carrello al momento della richiesta di checkout
            products = user.cart.items;
            total = 0;
            //calcolo il prezzo totale del carrello
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            });

            //stripe si occupa del pagamento
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100,
                        currency: 'eur',
                        quantity: p.quantity
                    };
                }),
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            });
        })
        .then(session => {
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

//controller usato per renderizzare la pagina del checkout/success ossia la pagina che visualizziamo nel caso in cui il pagamento venga effettuato con successo
exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            //conto la quantita dei prodotti
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            //creo l'ordine e lo memorizzo nel db
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        //infine pulisco il carrello eliminando tutti i prodotti che c'erano prima di effettuare l'ordine
        .then(result => {
            return req.user.clearCart();
        })
        //infine veniamo reindirizzati alla pagina degli ordini /orders
        .then(() => {
            let mailOptions = {
                from: 'shop.pawm@gmail.com',
                to: req.user.email,
                subject: 'Order received successfully!',
                text: 'We have received your payment successfully, we are preparing your shipment!'
            };
            transporter.sendMail(mailOptions, function (err,data) {
                if(err){
                    console.log('error',err);
                }else{
                    console.log('email sent');
                }

            });
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


//serve per renderizzare la pagina degli ordini
exports.getOrders = (req, res, next) => {
    //cerco l'ordine nel db tramite l'user id
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => console.log(err));
};
