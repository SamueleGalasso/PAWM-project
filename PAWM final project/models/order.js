/**
 *
 * @type {Mongoose}
 * In questo model definiamo lo schema degli ordini, che conterrà un array di prodotti un user e un userId.
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  //array di prodotti contenente prodotti e quantita
  products: [
    {
      product: { type: Object, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  //user con email e userId
  user: {
    email: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  }
});

module.exports = mongoose.model('Order', orderSchema);
