import { validateAuthor, validateBook, validateReading } from './validation.js';

const STORAGE_KEY = 'reading_tracker_v1';

async function getDb() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
        return JSON.parse(cached);
    }
    const res = await fetch('./data/seed.json');
    if (!res.ok) throw new Error('Failed to load seed.json');
    const seed = await res.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
}

function commitDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function nextId(list) {
    return list.length === 0 ? 1 : Math.max(...list.map(i => i.id)) + 1;
}

function throwApiError(status, message, errors = []) {
    throw { status, message, errors };
}

export async function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    return await getDb();
}

export async function getCountries() {
    return (await getDb()).countries;
}

export async function getThemes() {
    return (await getDb()).themes;
}

export async function createTheme(name) {
    const db = await getDb();
    const trimmed = (name || '').trim();
    if (!trimmed) {
        throwApiError(400, 'Validation failed', [{ field: 'theme', message: 'Theme name cannot be empty' }]);
    }
    if (db.themes.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
        throwApiError(409, 'Theme already exists', [{ field: 'theme', message: 'Theme already exists' }]);
    }
    const theme = { id: nextId(db.themes), name: trimmed };
    db.themes.push(theme);
    commitDb(db);
    return theme;
}

// --- AUTHORS ---
export async function getAuthors() {
    return (await getDb()).authors;
}

export async function saveAuthor(payload) {
    const db = await getDb();
    const record = {
        id: payload.id ? Number(payload.id) : null,
        name: (payload.name || '').trim(),
        countryId: payload.countryId ? Number(payload.countryId) : null,
        birthDate: payload.birthDate || null,
        deathDate: payload.deathDate || null
    };

    const errors = validateAuthor(record, db.authors);
    if (errors.length > 0) throwApiError(400, 'Validation failed', errors);

    if (record.id) {
        const idx = db.authors.findIndex(a => a.id === record.id);
        if (idx === -1) throwApiError(404, 'Author not found');
        db.authors[idx] = record;
    } else {
        record.id = nextId(db.authors);
        db.authors.push(record);
    }
    commitDb(db);
    return record;
}

export async function deleteAuthor(id) {
    const db = await getDb();
    const linked = db.books.filter(b => b.authorIds.includes(id));
    if (linked.length > 0) {
        const names = linked.map(b => b.title).join(', ');
        throwApiError(409, `Author is linked to ${linked.length} book(s): ${names}`);
    }
    db.authors = db.authors.filter(a => a.id !== id);
    commitDb(db);
}

// --- BOOKS ---
export async function getBooks() {
    return (await getDb()).books;
}

export async function saveBook(bookPayload, initialReadingPayload = null) {
    const db = await getDb();
    const book = {
        id: bookPayload.id ? Number(bookPayload.id) : null,
        title: (bookPayload.title || '').trim(),
        authorIds: (bookPayload.authorIds || []).map(Number),
        publicationYear: bookPayload.publicationYear !== '' && bookPayload.publicationYear !== null
            ? Number(bookPayload.publicationYear) : null,
        form: bookPayload.form || null,
        mode: bookPayload.mode || null,
        content: bookPayload.content || null,
        themeIds: (bookPayload.themeIds || []).map(Number)
    };

    const errors = validateBook(book);
    if (initialReadingPayload) {
        const rErrors = validateReading(initialReadingPayload, book.publicationYear);
        errors.push(...rErrors);
    }
    if (errors.length > 0) throwApiError(400, 'Validation failed', errors);

    if (book.id) {
        const idx = db.books.findIndex(b => b.id === book.id);
        if (idx === -1) throwApiError(404, 'Book not found');
        db.books[idx] = book;
    } else {
        book.id = nextId(db.books);
        db.books.push(book);

        if (initialReadingPayload) {
            const newReading = normalizeReading({ ...initialReadingPayload, bookId: book.id });
            newReading.id = nextId(db.readings);
            db.readings.push(newReading);
        }
    }
    commitDb(db);
    return book;
}

export async function deleteBook(id) {
    const db = await getDb();
    db.books = db.books.filter(b => b.id !== id);
    db.readings = db.readings.filter(r => r.bookId !== id);
    commitDb(db);
}

// --- READINGS ---
export async function getReadings() {
    return (await getDb()).readings;
}

function normalizeReading(payload) {
    const status = payload.status;
    return {
        id: payload.id ? Number(payload.id) : null,
        bookId: Number(payload.bookId),
        status,
        yearRead: ['Read', 'Abandoned'].includes(status) && payload.yearRead !== '' && payload.yearRead !== null
            ? Number(payload.yearRead) : null,
        grade: ['Read', 'Abandoned'].includes(status) && payload.grade !== '' && payload.grade !== null
            ? Number(payload.grade) : null,
        recommendedBy: (payload.recommendedBy || '').trim() || null,
        priority: status === 'Want to read' && payload.priority ? payload.priority : null,
        notes: (payload.notes || '').trim() || null
    };
}

export async function saveReading(payload) {
    const db = await getDb();
    const book = db.books.find(b => b.id === Number(payload.bookId));
    if (!book) throwApiError(404, 'Book not found');

    const record = normalizeReading(payload);
    const errors = validateReading(record, book.publicationYear);
    if (errors.length > 0) throwApiError(400, 'Validation failed', errors);

    if (record.id) {
        const idx = db.readings.findIndex(r => r.id === record.id);
        if (idx === -1) throwApiError(404, 'Reading not found');
        db.readings[idx] = record;
    } else {
        record.id = nextId(db.readings);
        db.readings.push(record);
    }
    commitDb(db);
    return record;
}

export async function deleteReading(id) {
    const db = await getDb();
    db.readings = db.readings.filter(r => r.id !== id);
    commitDb(db);
}