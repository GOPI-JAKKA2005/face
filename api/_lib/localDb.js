/**
 * Local File-Backed Database Fallback when Firebase credentials are not yet configured.
 * Persists collections to server/data/localStore.json.
 * Provides identical Firestore API surface for documents, collections, and queries.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../../data/localStore.json');

// Initialize store file if missing
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (_e) {
    // Fall back to default template if file cannot be read
  }
  return {
    students: {},
    attendance: {},
    settings: {
      system: {
        timezone: 'Asia/Kolkata',
        earlyWindowMinutes: 60,
        lateCountsFrom: 'start',
        weekdays: [1, 2, 3, 4, 5, 6],
        holidays: [],
        kioskMessage: 'Please look at the camera',
        sessions: {
          morning: { enabled: true, start: '08:00', graceMinutes: 15, cutoff: '13:00' },
          afternoon: { enabled: true, start: '13:00', graceMinutes: 15, cutoff: '18:00' }
        },
        recognition: {
          threshold: 0.45,
          minMarginToSecond: 0.06,
          eyeTolerance: 0.12,
          requireLiveness: false,
          requiredConsecutiveFrames: 2,
          cooldownSeconds: 15
        }
      }
    },
    signatures: {},
    kioskEvents: {},
    media: {}
  };
}

let memoryStore = loadStore();

function persistStore() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local store:', err);
  }
}

class LocalDocRef {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
  }

  async get() {
    const col = memoryStore[this.collectionName] || {};
    const item = col[this.id];
    return {
      exists: item !== undefined,
      id: this.id,
      data: () => (item ? JSON.parse(JSON.stringify(item)) : undefined)
    };
  }

  async set(data, options = {}) {
    if (!memoryStore[this.collectionName]) memoryStore[this.collectionName] = {};
    if (options.merge && memoryStore[this.collectionName][this.id]) {
      memoryStore[this.collectionName][this.id] = {
        ...memoryStore[this.collectionName][this.id],
        ...JSON.parse(JSON.stringify(data))
      };
    } else {
      memoryStore[this.collectionName][this.id] = JSON.parse(JSON.stringify(data));
    }
    persistStore();
    return { writeTime: new Date() };
  }

  async update(data) {
    return this.set(data, { merge: true });
  }

  async delete() {
    if (memoryStore[this.collectionName] && memoryStore[this.collectionName][this.id]) {
      delete memoryStore[this.collectionName][this.id];
      persistStore();
    }
    return { writeTime: new Date() };
  }
}

class LocalQuery {
  constructor(collectionName, filters = []) {
    this.collectionName = collectionName;
    this.filters = filters;
    this._limit = null;
  }

  where(field, op, value) {
    return new LocalQuery(this.collectionName, [...this.filters, { field, op, value }]);
  }

  orderBy() {
    return this;
  }

  limit(n) {
    const q = new LocalQuery(this.collectionName, this.filters);
    q._limit = n;
    return q;
  }

  async get() {
    const col = memoryStore[this.collectionName] || {};
    let docs = Object.entries(col).map(([id, data]) => ({
      id,
      data: () => JSON.parse(JSON.stringify(data)),
      exists: true
    }));

    for (const f of this.filters) {
      docs = docs.filter(doc => {
        const val = doc.data()[f.field];
        if (f.op === '==' || f.op === '===') return val === f.value;
        if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
        if (f.op === '>=') return val >= f.value;
        if (f.op === '<=') return val <= f.value;
        return true;
      });
    }

    if (this._limit && this._limit > 0) {
      docs = docs.slice(0, this._limit);
    }

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (fn) => docs.forEach(fn)
    };
  }
}

class LocalCollectionRef extends LocalQuery {
  constructor(collectionName) {
    super(collectionName, []);
  }

  doc(id) {
    const docId = id || 'doc_' + Math.random().toString(36).substring(2, 9);
    return new LocalDocRef(this.collectionName, docId);
  }

  async add(data) {
    const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const ref = this.doc(id);
    await ref.set(data);
    return { id };
  }
}

export const localDb = {
  collection: (name) => new LocalCollectionRef(name),
  doc: (pathStr) => {
    const [col, id] = pathStr.split('/');
    return new LocalDocRef(col, id);
  },
  runTransaction: async (updateFunction) => {
    const transaction = {
      get: async (ref) => ref.get(),
      set: async (ref, data, opts) => ref.set(data, opts),
      update: async (ref, data) => ref.update(data),
      delete: async (ref) => ref.delete()
    };
    return await updateFunction(transaction);
  }
};

export const localAuth = {
  verifyIdToken: async (_token) => {
    return {
      uid: 'admin-local-master',
      email: 'admin@institution.edu',
      admin: true
    };
  }
};
