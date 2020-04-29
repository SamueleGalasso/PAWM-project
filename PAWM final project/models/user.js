/**
 *
 * @type {Mongoose}
 * In questo model viene definito lo schema dell'user che avrà un email, una password, dei token di reset nel caso
 * l'utente richieda di resettare la propria password e un carrello contenente un array di items e la quantita dei prodotti.
 * Inoltre sono presenti delle funzioni utili per gestire alcune richieste che può effettuare l'utente tra cui aggiungere al carrello
 * dei prodotti, pulire tutto il carrello rimuovendo ogni items o rimuovere un tipo di prodotto.
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: { type: Number, required: true }
      }
    ]
  }
});
/**
 *
 * Una serie di funzioni messe a disposizione dell'utente, tra cui addToCart per aggiungere un prodotto
 * al proprio carrello, rimuovere un prodotto dal proprio carrello o addirittura fare il clear completo del Cart
 * in questione.
 */
userSchema.methods.addToCart = function(product) {
  //memorizzo in cartProductIndex l'indice del prodotto da aggiungere al carrello
  const cartProductIndex = this.cart.items.findIndex(cp => {
    return cp.productId.toString() === product._id.toString();
  });
  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];

  //se cartProductIndex è maggiore o uguale a 0 cioè se è gia presente lo stesso prodotto nel carrello aggiorno solo la quantita
  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
    //se il prodotto non era gia presente nel carrello lo inserisco nell'array di items
  } else {
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity
    });
  }
  //aggiorno il carrello e lo salvo nel db
  const updatedCart = {
    items: updatedCartItems
  };
  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.removeFromCart = function(productId) {
  //creo un nuovo array updatedCartItems contenente tutti i prodotti che soddisfano la condizione del filter, cioè tutti i prodotti tranne quello da rimuovere
  const updatedCartItems = this.cart.items.filter(item => {
    return item.productId.toString() !== productId.toString();
  });
  //aggiorno il carrello e lo salvo nel db
  this.cart.items = updatedCartItems;
  return this.save();
};

//funzione usata per pulire completamente il carrello
userSchema.methods.clearCart = function() {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
