import idb from 'idb';

const dbPromise = idb.open('test-db', 1, (upgradeDb) => {
  const keyValStore = upgradeDb.createObjectStore('keyval');
  keyValStore.put("value", "key");
});


