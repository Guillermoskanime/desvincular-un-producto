const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = Schema({
  cisnumber: Number,
  account: Number,
  accountMasked: Number,
  clientName: String,
  company: Number,
  product: String,
  status: Number,
  subProduct: Number,
  tokenTdc: String,
  updatedAt: Date,
  uuid: String,
  description: String,
});

module.exports = mongoose.model('Productos', ProductSchema);
