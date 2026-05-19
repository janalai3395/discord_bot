class TTLCache {
  constructor(ttlMs = 1000 * 60 * 30) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);

    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = {
  pokemonCache: new TTLCache(1000 * 60 * 60),
  catchCache: new TTLCache(1000 * 60 * 30),
};
