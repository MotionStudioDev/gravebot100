const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://efebaba3538_db_user:mtn02@mtn03.g1kszlu.mongodb.net/grave_bot?retryWrites=true&w=majority&appName=MTN3';
const DB_NAME = 'grave_bot';

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('[MONGO] MongoDB bağlantısı başarılı');
  return db;
}

function getDB() {
  if (!db) throw new Error('MongoDB henüz bağlanmadı!');
  return db;
}

const roleStore = {
  async save(guildId, userId, roleIds) {
    const database = getDB();
    await database.collection('roles').updateOne(
      { guildId, userId },
      { $set: { guildId, userId, roles: roleIds, savedAt: new Date() } },
      { upsert: true }
    );
  },
  async get(guildId, userId) {
    const database = getDB();
    return await database.collection('roles').findOne({ guildId, userId });
  },
  async remove(guildId, userId) {
    const database = getDB();
    await database.collection('roles').deleteOne({ guildId, userId });
  },
};

const logSettings = {
  async get(guildId) {
    const database = getDB();
    return await database.collection('logSettings').findOne({ guildId });
  },
  async set(guildId, settings) {
    const database = getDB();
    await database.collection('logSettings').updateOne(
      { guildId },
      { $set: { guildId, ...settings } },
      { upsert: true }
    );
  },
  async remove(guildId) {
    const database = getDB();
    await database.collection('logSettings').deleteOne({ guildId });
  },
};

const welcomeSettings = {
  async get(guildId) {
    const database = getDB();
    return await database.collection('welcomeSettings').findOne({ guildId });
  },
  async set(guildId, settings) {
    const database = getDB();
    await database.collection('welcomeSettings').updateOne(
      { guildId },
      { $set: { guildId, ...settings } },
      { upsert: true }
    );
  },
  async remove(guildId) {
    const database = getDB();
    await database.collection('welcomeSettings').deleteOne({ guildId });
  },
};

const afkStore = {
  async set(guildId, userId, reason) {
    const database = getDB();
    await database.collection('afk').updateOne(
      { guildId, userId },
      { $set: { guildId, userId, reason, since: Date.now() } },
      { upsert: true }
    );
  },
  async get(guildId, userId) {
    const database = getDB();
    return await database.collection('afk').findOne({ guildId, userId });
  },
  async remove(guildId, userId) {
    const database = getDB();
    await database.collection('afk').deleteOne({ guildId, userId });
  },
};

const verifySettings = {
  async get(guildId) {
    const database = getDB();
    return await database.collection('verifySettings').findOne({ guildId });
  },
  async set(guildId, settings) {
    const database = getDB();
    await database.collection('verifySettings').updateOne(
      { guildId },
      { $set: { guildId, ...settings } },
      { upsert: true }
    );
  },
  async remove(guildId) {
    const database = getDB();
    await database.collection('verifySettings').deleteOne({ guildId });
  },
};

const guardSettings = {
  async get(guildId) {
    const database = getDB();
    return await database.collection('guardSettings').findOne({ guildId });
  },
  async set(guildId, settings) {
    const database = getDB();
    await database.collection('guardSettings').updateOne(
      { guildId },
      { $set: { guildId, ...settings } },
      { upsert: true }
    );
  },
  async remove(guildId) {
    const database = getDB();
    await database.collection('guardSettings').deleteOne({ guildId });
  },
};

const guardWarns = {
  async get(guildId, userId) {
    const database = getDB();
    return await database.collection('guardWarns').findOne({ guildId, userId });
  },
  async add(guildId, userId, type) {
    const database = getDB();
    const doc = await database.collection('guardWarns').findOne({ guildId, userId });
    const now = Date.now();
    let count = 1;
    if (doc && doc[type]) {
      const last = doc.updatedAt || 0;
      count = (now - last > 24 * 60 * 60 * 1000) ? 1 : (doc[type] + 1);
    }
    await database.collection('guardWarns').updateOne(
      { guildId, userId },
      { $set: { guildId, userId, [type]: count, updatedAt: now } },
      { upsert: true }
    );
    return count;
  },
  async reset(guildId, userId, type) {
    const database = getDB();
    if (type) {
      await database.collection('guardWarns').updateOne(
        { guildId, userId },
        { $set: { [type]: 0, updatedAt: Date.now() } },
        { upsert: true }
      );
    } else {
      await database.collection('guardWarns').deleteOne({ guildId, userId });
    }
  },
};

module.exports = { connect, getDB, roleStore, logSettings, welcomeSettings, afkStore, verifySettings, guardSettings, guardWarns };