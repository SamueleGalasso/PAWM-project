/**
 *
 * @type {Mongoose}
 * In questo model viene definito lo schema dei prodotti memorizzati nel database, che avranno un titolo, un prezzo una descrizione
 * l'url di un immagine e lo userId dell'utente che ha caricato nello shop il prodotto
 */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  //fa riferimento allo schema degli User, per mettere in relazione i prodotti e gli user a cui appartengono
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Product', productSchema);

