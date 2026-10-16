const mongoose = require('mongoose');

async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  const collections = await mongoose.connection.db
    .listCollections({ name: 'users' }, { nameOnly: true })
    .toArray();
  if (collections.length) {
    const indexes = await mongoose.connection.collection('users').indexes();
    const legacyUsernameIndex = indexes.find(
      (index) =>
        index.unique &&
        Object.keys(index.key).length === 1 &&
        index.key.username === 1
    );
    if (legacyUsernameIndex) {
      await mongoose.connection.collection('users').dropIndex(legacyUsernameIndex.name);
      console.log('Removed obsolete unique users.username index');
    }
  }
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
