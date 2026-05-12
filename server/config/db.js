const mongoose = require("mongoose");

const globalKey = "__fyp_mongoose_cache__";
let cached = global[globalKey];
if (!cached) {
  cached = global[globalKey] = { conn: null, promise: null };
}

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set");
  }
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri)
      .then(() => mongoose.connection)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
