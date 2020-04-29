/**
 *
 * @type {path.PlatformPath | path}
 * Qui gestiamo le routes legate prettamente allo shop, quindi per visualizzare l'index page, per visualizzare il carrello, il checkout,
 * gli ordini effettuati ecc.
 * Anche qui è stato aggiunto il middleware che verifica (su alcune routes) se l'utente è loggato per proteggere quelle routes che necessitano
 * di un user autenticato.
 */

const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

router.get('/checkout/success', shopController.getCheckoutSuccess);

router.get('/checkout/cancel', shopController.getCheckout);

router.get('/orders', isAuth, shopController.getOrders);

module.exports = router;
