import * as store from './store.js';
import {
    BOOK_FORMS, BOOK_MODES, BOOK_CONTENTS,
    READING_STATUSES, READING_PRIORITIES
} from './validation.js';

let state = {
    countries: [],
    authors: [],
    themes: [],
    books: [],
    readings: [],
    sort: { column: 'yearRead', direction: 'desc' }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    populateStaticSelects();
    setupEventListeners();
    await refreshAll();
});

async function refreshAll() {
    const [countries, authors, themes, books, readings] = await Promise.all([
        store.getCountries(),
        store.getAuthors(),
        store.getThemes(),
        store.getBooks(),
        store.getReadings()
    ]);
    state = { ...state, countries, authors, themes, books, readings };
    renderReadingsTable();
    renderBooksTable();
    renderAuthorsTable();
}

function populateStaticSelects() {
    fillSelect('book-form', BOOK_FORMS, true);
    fillSelect('book-mode', BOOK_MODES, true);
    fillSelect('book-content', BOOK_CONTENTS, true);
    fillSelect('init-reading-status', READING_STATUSES, false);
    fillSelect('init-reading-priority', READING_PRIORITIES, true);
    fillSelect('reading-status', READING_STATUSES, false);
    fillSelect('reading-priority', READING_PRIORITIES, true);
}

function fillSelect(id, options, includeEmpty) {
    const el = document.getElementById(id);
    el.innerHTML = includeEmpty ? '<option value="">-- None --</option>' : '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        el.appendChild(option);
    });
}

// --- ALERTS & ERRORS ---
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('global-alert');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    setTimeout(() => alertBox.classList.add('hidden'), 5000);
}

function clearFormErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function showFormErrors(form, errors) {
    clearFormErrors(form);
    errors.forEach(err => {
        const span = form.querySelector(`[data-error-for="${err.field}"]`);
        if (span) span.textContent = err.message;
    });
}

// --- HELPERS ---
function getAuthorNames(authorIds) {
    if (!authorIds || authorIds.length === 0) return '-';
    return authorIds
        .map(id => state.authors.find(a => a.id === id)?.name || 'Unknown')
        .join(', ');
}

function getStatusBadge(status) {
    const map = {
        'Read': 'badge-read',
        'Reading': 'badge-reading',
        'Paused': 'badge-paused',
        'Want to read': 'badge-want',
        'Abandoned': 'badge-abandoned'
    };
    return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

// --- RENDERING: READING LOG (FR-05) ---
function renderReadingsTable() {
    const tbody = document.getElementById('tbody-readings');
    const enriched = state.readings.map(r => {
        const book = state.books.find(b => b.id === r.bookId);
        return {
            ...r,
            title: book ? book.title : 'Unknown Book',
            authors: book ? getAuthorNames(book.authorIds) : '-'
        };
    });

    const { column, direction } = state.sort;
    const mult = direction === 'asc' ? 1 : -1;

    enriched.sort((a, b) => {
        const valA = a[column] === '-' ? null : a[column];
        const valB = b[column] === '-' ? null : b[column];

        // Nulls always sort last
        if (valA === null && valB === null) return a.id - b.id;
        if (valA === null) return 1;
        if (valB === null) return -1;

        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = valA - valB;
        } else {
            cmp = String(valA).localeCompare(String(valB));
        }
        return cmp !== 0 ? cmp * mult : a.id - b.id;
    });

    tbody.innerHTML = enriched.map(r => `
        <tr>
            <td><strong>${r.title}</strong></td>
            <td>${r.authors}</td>
            <td>${getStatusBadge(r.status)}</td>
            <td>${r.yearRead ?? '-'}</td>
            <td>${r.grade !== null ? r.grade.toFixed(1) : '-'}</td>
            <td class="actions-cell">
                <button type="button" class="btn-secondary btn-sm" data-edit-reading="${r.id}">Edit</button>
                <button type="button" class="btn-danger btn-sm" data-delete-reading="${r.id}">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- RENDERING: BOOKS (FR-02 & FR-03) ---
function renderBooksTable() {
    const tbody = document.getElementById('tbody-books');
    tbody.innerHTML = state.books.map(b => {
        const themes = b.themeIds.map(id => state.themes.find(t => t.id === id)?.name).filter(Boolean).join(', ') || '-';
        const bookReadings = state.readings.filter(r => r.bookId === b.id);
        const yearDisplay = b.publicationYear === null ? '-' : (b.publicationYear < 0 ? `${Math.abs(b.publicationYear)} BC` : b.publicationYear);

        return `
            <tr>
                <td><strong>${b.title}</strong></td>
                <td>${getAuthorNames(b.authorIds)}</td>
                <td>${yearDisplay}</td>
                <td>${[b.form, b.mode].filter(Boolean).join(' / ') || '-'}</td>
                <td>${themes}</td>
                <td>${bookReadings.length}</td>
                <td class="actions-cell">
                    <button type="button" class="btn-primary btn-sm" data-add-reading="${b.id}">+ Reading</button>
                    <button type="button" class="btn-secondary btn-sm" data-edit-book="${b.id}">Edit</button>
                    <button type="button" class="btn-danger btn-sm" data-delete-book="${b.id}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- RENDERING: AUTHORS (FR-01) ---
function renderAuthorsTable() {
    const tbody = document.getElementById('tbody-authors');
    tbody.innerHTML = state.authors.map(a => {
        const country = state.countries.find(c => c.id === a.countryId)?.name || '-';
        return `
            <tr>
                <td><strong>${a.name}</strong></td>
                <td>${country}</td>
                <td>${a.birthDate || '-'}</td>
                <td>${a.deathDate || '-'}</td>
                <td class="actions-cell">
                    <button type="button" class="btn-secondary btn-sm" data-edit-author="${a.id}">Edit</button>
                    <button type="button" class="btn-danger btn-sm" data-delete-author="${a.id}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.view;
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
            document.getElementById(`view-${target}`).classList.remove('hidden');
        });
    });

    // Reset Data (FR-07)
    document.getElementById('btn-reset').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all changes and restore the initial seed data?')) {
            await store.resetData();
            await refreshAll();
            showAlert('Data has been reset to initial seed.');
        }
    });

    // Close modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.closeModal).close();
        });
    });

    // Table sorting (FR-05)
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (state.sort.column === col) {
                state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.sort = { column: col, direction: col === 'yearRead' || col === 'grade' ? 'desc' : 'asc' };
            }
            document.querySelectorAll('.sort-icon').forEach(s => s.textContent = '');
            th.querySelector('.sort-icon').textContent = state.sort.direction === 'asc' ? '▲' : '▼';
            renderReadingsTable();
        });
    });

    // --- AUTHOR EVENTS ---
    document.getElementById('btn-new-author').addEventListener('click', () => openAuthorModal());

    document.getElementById('tbody-authors').addEventListener('click', async (e) => {
        const editId = e.target.dataset.editAuthor;
        const delId = e.target.dataset.deleteAuthor;
        if (editId) {
            const author = state.authors.find(a => a.id === Number(editId));
            openAuthorModal(author);
        } else if (delId) {
            if (!confirm('Delete this author?')) return;
            try {
                await store.deleteAuthor(Number(delId));
                await refreshAll();
                showAlert('Author deleted.');
            } catch (err) {
                showAlert(err.message, 'error');
            }
        }
    });

    document.getElementById('form-author').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        clearFormErrors(form);
        const payload = {
            id: document.getElementById('author-id').value || null,
            name: document.getElementById('author-name').value,
            countryId: document.getElementById('author-country').value || null,
            birthDate: document.getElementById('author-birth').value || null,
            deathDate: document.getElementById('author-death').value || null
        };
        try {
            await store.saveAuthor(payload);
            document.getElementById('modal-author').close();
            await refreshAll();
            showAlert('Author saved successfully.');
        } catch (err) {
            if (err.errors) showFormErrors(form, err.errors);
            else showAlert(err.message, 'error');
        }
    });

    // --- BOOK EVENTS ---
    document.getElementById('btn-new-book').addEventListener('click', () => openBookModal());

    document.getElementById('include-first-reading').addEventListener('change', (e) => {
        document.getElementById('first-reading-fields').classList.toggle('hidden', !e.target.checked);
    });

    document.getElementById('btn-add-theme').addEventListener('click', async () => {
        const input = document.getElementById('new-theme-input');
        const form = document.getElementById('form-book');
        clearFormErrors(form);
        try {
            const newTheme = await store.createTheme(input.value);
            input.value = '';
            state.themes = await store.getThemes();
            const select = document.getElementById('book-themes');
            const opt = document.createElement('option');
            opt.value = newTheme.id;
            opt.textContent = newTheme.name;
            opt.selected = true;
            select.appendChild(opt);
        } catch (err) {
            if (err.errors) showFormErrors(form, err.errors);
        }
    });

    document.getElementById('tbody-books').addEventListener('click', async (e) => {
        const editId = e.target.dataset.editBook;
        const delId = e.target.dataset.deleteBook;
        const addReadingBookId = e.target.dataset.addReading;

        if (editId) {
            const book = state.books.find(b => b.id === Number(editId));
            openBookModal(book);
        } else if (addReadingBookId) {
            openReadingModal(Number(addReadingBookId));
        } else if (delId) {
            const bookId = Number(delId);
            const count = state.readings.filter(r => r.bookId === bookId).length;
            const msg = `Delete this book? This will also delete ${count} associated reading(s).`;
            if (!confirm(msg)) return;
            await store.deleteBook(bookId);
            await refreshAll();
            showAlert('Book and its readings deleted.');
        }
    });

    document.getElementById('form-book').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        clearFormErrors(form);
        const id = document.getElementById('book-id').value || null;

        const bookPayload = {
            id,
            title: document.getElementById('book-title').value,
            publicationYear: document.getElementById('book-year').value,
            form: document.getElementById('book-form').value,
            mode: document.getElementById('book-mode').value,
            content: document.getElementById('book-content').value,
            authorIds: Array.from(document.getElementById('book-authors').selectedOptions).map(o => o.value),
            themeIds: Array.from(document.getElementById('book-themes').selectedOptions).map(o => o.value)
        };

        let initReading = null;
        if (!id && document.getElementById('include-first-reading').checked) {
            initReading = {
                status: document.getElementById('init-reading-status').value,
                priority: document.getElementById('init-reading-priority').value,
                yearRead: document.getElementById('init-reading-year').value,
                grade: document.getElementById('init-reading-grade').value,
                recommendedBy: document.getElementById('init-reading-rec').value,
                notes: document.getElementById('init-reading-notes').value
            };
        }

        try {
            await store.saveBook(bookPayload, initReading);
            document.getElementById('modal-book').close();
            await refreshAll();
            showAlert('Book saved successfully.');
        } catch (err) {
            if (err.errors) showFormErrors(form, err.errors);
            else showAlert(err.message, 'error');
        }
    });

    // --- READING EVENTS ---
    document.getElementById('tbody-readings').addEventListener('click', async (e) => {
        const editId = e.target.dataset.editReading;
        const delId = e.target.dataset.deleteReading;

        if (editId) {
            const reading = state.readings.find(r => r.id === Number(editId));
            openReadingModal(reading.bookId, reading);
        } else if (delId) {
            if (!confirm('Delete this reading record?')) return;
            await store.deleteReading(Number(delId));
            await refreshAll();
            showAlert('Reading deleted.');
        }
    });

    // Status workflow rule (FR-04): clear yearRead/grade after confirmation
    document.getElementById('reading-status').addEventListener('change', (e) => {
        const newStatus = e.target.value;
        const yearInput = document.getElementById('reading-year');
        const gradeInput = document.getElementById('reading-grade');
        const prioritySelect = document.getElementById('reading-priority');

        if (newStatus !== 'Want to read') {
            prioritySelect.value = '';
        }

        if (!['Read', 'Abandoned'].includes(newStatus) && (yearInput.value || gradeInput.value)) {
            if (confirm(`Status "${newStatus}" does not allow Year Read or Grade. Clear those values?`)) {
                yearInput.value = '';
                gradeInput.value = '';
            }
        }
    });

    document.getElementById('form-reading').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        clearFormErrors(form);

        const payload = {
            id: document.getElementById('reading-id').value || null,
            bookId: document.getElementById('reading-book-id').value,
            status: document.getElementById('reading-status').value,
            priority: document.getElementById('reading-priority').value,
            yearRead: document.getElementById('reading-year').value,
            grade: document.getElementById('reading-grade').value,
            recommendedBy: document.getElementById('reading-rec').value,
            notes: document.getElementById('reading-notes').value
        };

        try {
            await store.saveReading(payload);
            document.getElementById('modal-reading').close();
            await refreshAll();
            showAlert('Reading saved successfully.');
        } catch (err) {
            if (err.errors) showFormErrors(form, err.errors);
            else showAlert(err.message, 'error');
        }
    });
}

// --- MODAL OPENERS ---
function openAuthorModal(author = null) {
    const form = document.getElementById('form-author');
    clearFormErrors(form);
    form.reset();

    const countrySelect = document.getElementById('author-country');
    countrySelect.innerHTML = '<option value="">-- Unknown / None --</option>';
    state.countries.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        countrySelect.appendChild(opt);
    });

    document.getElementById('modal-author-title').textContent = author ? 'Edit Author' : 'New Author';
    document.getElementById('author-id').value = author ? author.id : '';
    if (author) {
        document.getElementById('author-name').value = author.name;
        countrySelect.value = author.countryId || '';
        document.getElementById('author-birth').value = author.birthDate || '';
        document.getElementById('author-death').value = author.deathDate || '';
    }
    document.getElementById('modal-author').showModal();
}

function openBookModal(book = null) {
    const form = document.getElementById('form-book');
    clearFormErrors(form);
    form.reset();

    const authorSelect = document.getElementById('book-authors');
    authorSelect.innerHTML = state.authors
        .map(a => `<option value="${a.id}">${a.name}</option>`)
        .join('');

    const themeSelect = document.getElementById('book-themes');
    themeSelect.innerHTML = state.themes
        .map(t => `<option value="${t.id}">${t.name}</option>`)
        .join('');

    const firstReadingBox = document.getElementById('first-reading-fieldset');
    firstReadingBox.classList.toggle('hidden', Boolean(book));
    document.getElementById('first-reading-fields').classList.remove('hidden');

    document.getElementById('modal-book-title').textContent = book ? 'Edit Book' : 'New Book';
    document.getElementById('book-id').value = book ? book.id : '';

    if (book) {
        document.getElementById('book-title').value = book.title;
        document.getElementById('book-year').value = book.publicationYear ?? '';
        document.getElementById('book-form').value = book.form || '';
        document.getElementById('book-mode').value = book.mode || '';
        document.getElementById('book-content').value = book.content || '';
        Array.from(authorSelect.options).forEach(o => o.selected = book.authorIds.includes(Number(o.value)));
        Array.from(themeSelect.options).forEach(o => o.selected = book.themeIds.includes(Number(o.value)));
    }
    document.getElementById('modal-book').showModal();
}

function openReadingModal(bookId, reading = null) {
    const form = document.getElementById('form-reading');
    clearFormErrors(form);
    form.reset();

    const book = state.books.find(b => b.id === bookId);
    document.getElementById('modal-reading-title').textContent = reading ? 'Edit Reading' : 'Add Reading';
    document.getElementById('reading-book-label').textContent = `Book: ${book ? book.title : ''}`;
    document.getElementById('reading-id').value = reading ? reading.id : '';
    document.getElementById('reading-book-id').value = bookId;

    if (reading) {
        document.getElementById('reading-status').value = reading.status;
        document.getElementById('reading-priority').value = reading.priority || '';
        document.getElementById('reading-year').value = reading.yearRead ?? '';
        document.getElementById('reading-grade').value = reading.grade ?? '';
        document.getElementById('reading-rec').value = reading.recommendedBy || '';
        document.getElementById('reading-notes').value = reading.notes || '';
    }
    document.getElementById('modal-reading').showModal();
}