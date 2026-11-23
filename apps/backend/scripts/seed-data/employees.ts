import type { Persona } from '@softeng-app/db';

/** A demo employee and the Auth0 login the seed creates for them. */
export interface SeedEmployee {
    /** Stable key other fixtures use to reference this employee (e.g. as an owner). */
    key: string;
    /** Fixed primary key — Employee.id has no autoincrement. */
    id: number;
    firstName: string;
    lastName: string;
    persona: Persona;
    /** Auth0 username; the email is derived as `<username>@example.com`. */
    username: string;
    /**
     * Profile photo filename inside the frontend's `src/assets/Team Photos/`
     * (reused rather than duplicated). Employees without one get no photo.
     */
    photo?: string;
}

/**
 * The team (from `MeetTheTeam.tsx`) plus Wilson Wong and John Admin,
 * two per persona. Ids are grouped by persona in blocks of 10.
 */
export const employees: SeedEmployee[] = [
    { key: 'dylan', id: 1, firstName: 'Dylan', lastName: 'Zickus', persona: 'underwriter', username: 'dylan', photo: 'Dylan Zickus.jpg' },
    { key: 'oscar', id: 2, firstName: 'Oscar', lastName: 'Stomberg', persona: 'underwriter', username: 'oscar', photo: 'Oscar Stomberg.jpg' },
    { key: 'jake', id: 11, firstName: 'Jake', lastName: 'Swanson', persona: 'businessAnalyst', username: 'jake', photo: 'Jake Swanson.jpg' },
    { key: 'hayden', id: 12, firstName: 'Hayden', lastName: 'Schultz', persona: 'businessAnalyst', username: 'hayden', photo: 'Hayden Schultz.jpg' },
    { key: 'luke', id: 21, firstName: 'Luke', lastName: 'Ciarletta', persona: 'actuarialAnalyst', username: 'luke', photo: 'Luke Ciarletta.png' },
    { key: 'nick', id: 22, firstName: 'Nick', lastName: 'Houghton', persona: 'actuarialAnalyst', username: 'nick', photo: 'Nicholas Houghton.jpeg' },
    { key: 'cameron', id: 31, firstName: 'Cameron', lastName: 'Pietraski', persona: 'excelOperator', username: 'cameron', photo: 'Cameron Pietraski.png' },
    { key: 'philip', id: 32, firstName: 'Philip', lastName: 'Ostrowski', persona: 'excelOperator', username: 'philip', photo: 'Philip Ostrowski.jpg' },
    { key: 'joey', id: 41, firstName: 'Joseph', lastName: 'Hemmerle', persona: 'businessOps', username: 'joey', photo: 'Joey Hemmerle.jpg' },
    { key: 'ricardo', id: 42, firstName: 'Ricardo', lastName: 'Guzman Volpe', persona: 'businessOps', username: 'ricardo', photo: 'Ricardo Guzman Volpe.jpeg' },
    { key: 'wilson', id: 51, firstName: 'Wilson', lastName: 'Wong', persona: 'admin', username: 'wilson' },
    { key: 'john', id: 52, firstName: 'John', lastName: 'Admin', persona: 'admin', username: 'john' },
];
