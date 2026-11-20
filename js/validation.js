export const BOOK_FORMS = [
    'Novel', 'Novella', 'Short Story', 'Short Story Collection',
    'Play', 'Essay', 'Treatise', 'Diary', 'Graphic Novel'
];

export const BOOK_MODES = ['Prose', 'Drama', 'Poetry', 'Sequential Art'];
export const BOOK_CONTENTS = ['Fiction', 'Non-fiction'];
export const READING_STATUSES = ['Want to read', 'Reading', 'Paused', 'Read', 'Abandoned'];
export const READING_PRIORITIES = ['Low', 'Medium', 'High'];

export function validateAuthor(authorData, existingAuthors) {
    const errors = [];
    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split('T')[0];

    const name = (authorData.name || '').trim();
    if (!name) {
        errors.push({ field: 'name', message: 'Author name is required' });
    } else {
        const duplicate = existingAuthors.some(
            a => a.id !== authorData.id && a.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            errors.push({ field: 'name', message: 'An author with this name already exists' });
        }
    }

    if (authorData.birthDate && authorData.birthDate > todayStr) {
        errors.push({ field: 'birthDate', message: 'Birth date cannot be in the future' });
    }

    if (authorData.deathDate) {
        if (authorData.deathDate > todayStr) {
            errors.push({ field: 'deathDate', message: 'Death date cannot be in the future' });
        } else if (authorData.birthDate && authorData.deathDate <= authorData.birthDate) {
            errors.push({ field: 'deathDate', message: 'Death date must be after birth date' });
        }
    }

    return errors;
}

export function validateBook(bookData) {
    const errors = [];
    const currentYear = new Date().getFullYear();

    if (!(bookData.title || '').trim()) {
        errors.push({ field: 'title', message: 'Book title is required' });
    }

    if (bookData.publicationYear !== null && bookData.publicationYear !== '') {
        const year = Number(bookData.publicationYear);
        if (!Number.isInteger(year)) {
            errors.push({ field: 'publicationYear', message: 'Publication year must be an integer' });
        } else if (year === 0) {
            errors.push({ field: 'publicationYear', message: 'Year 0 is invalid (use -1 for 1 BC or 1 for AD 1)' });
        } else if (year > currentYear) {
            errors.push({ field: 'publicationYear', message: 'Publication year cannot be in the future' });
        }
    }

    return errors;
}

export function validateReading(readingData, bookPublicationYear) {
    const errors = [];
    const currentYear = new Date().getFullYear();
    const status = readingData.status;

    if (!READING_STATUSES.includes(status)) {
        errors.push({ field: 'status', message: 'Valid status is required' });
    }

    const hasYear = readingData.yearRead !== null && readingData.yearRead !== '';
    const hasGrade = readingData.grade !== null && readingData.grade !== '';
    const hasPriority = readingData.priority !== null && readingData.priority !== '';

    // Year read rules
    if (status === 'Read' && !hasYear) {
        errors.push({ field: 'yearRead', message: 'Year read is required when status is Read' });
    } else if (!['Read', 'Abandoned'].includes(status) && hasYear) {
        errors.push({ field: 'yearRead', message: 'Year read is only allowed for Read or Abandoned status' });
    } else if (hasYear) {
        const yr = Number(readingData.yearRead);
        if (!Number.isInteger(yr) || yr === 0) {
            errors.push({ field: 'yearRead', message: 'Year read must be a valid non-zero integer' });
        } else if (yr > currentYear) {
            errors.push({ field: 'yearRead', message: 'Year read cannot be in the future' });
        } else if (bookPublicationYear && yr < bookPublicationYear) {
            errors.push({ field: 'yearRead', message: `Year read cannot be earlier than publication year (${bookPublicationYear})` });
        }
    }

    // Grade rules
    if (!['Read', 'Abandoned'].includes(status) && hasGrade) {
        errors.push({ field: 'grade', message: 'Grade is only allowed when status is Read or Abandoned' });
    } else if (hasGrade) {
        const g = Number(readingData.grade);
        if (Number.isNaN(g) || g < 0 || g > 10 || Math.round(g * 10) % 5 !== 0) {
            errors.push({ field: 'grade', message: 'Grade must be between 0.0 and 10.0 in steps of 0.5' });
        }
    }

    // Priority rules
    if (status !== 'Want to read' && hasPriority) {
        errors.push({ field: 'priority', message: 'Priority is only allowed when status is Want to read' });
    }

    return errors;
}