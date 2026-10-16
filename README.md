# Event Registration System

Express.js + MongoDB (Mongoose) REST API with JWT authentication, user registration management, and an organizer admin panel.

## Features

- **Backend**: Express.js (routes → controllers → models), centralized error handling, rate-limited auth, Helmet, CORS
- **Models**: `User`, `Event`, `Registration` (Mongoose / MongoDB)
- **Public API**: event list (search + pagination) and event details
- **Registration**: logged-in users submit a registration form; registrations are linked to both the user and the event
- **Manage registrations**: users can view their registrations and cancel them (seats are released automatically; re-registering after cancel is allowed)
- **Capacity safety**: seats are reserved with an atomic update, so an event can never be overbooked
- **Organizer authentication**: role-based (`user` / `organizer`) JWT auth
- **Admin panel** (`/admin.html`): dashboard stats, create/edit/delete events, view attendees, cancel an attendee, export CSV
- **Simple frontend** (`/`): browse events, register, manage "My Registrations"

## Setup

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET, MONGO_URI, ORGANIZER_SECRET
npm run seed              # optional: creates an organizer + 3 sample events
npm run dev               # or: npm start
```

Open:
- User site: http://localhost:5000
- Admin panel: http://localhost:5000/admin.html

Default seeded organizer (change in `.env`): `admin@example.com` / `Admin@12345`

You can also create an organizer from the admin page ("Organizer sign up") using the `ORGANIZER_SECRET` key.

MongoDB: local install (`mongodb://127.0.0.1:27017/...`) or a free MongoDB Atlas connection string in `MONGO_URI`.

When connecting to a database from an older version, startup removes the obsolete unique `users.username` index. Legacy accounts using `salt`/`hash` credentials are upgraded to bcrypt after a successful login.

## Project structure

```
src/
  server.js              entry point (DB connect + listen)
  app.js                 express app, middleware, static files
  config/db.js
  models/                User.js, Event.js, Registration.js
  middleware/            auth.js (protect, authorize), error.js
  controllers/           auth, event, registration, admin
  routes/index.js        all API routes
  utils/helpers.js
scripts/seed.js
public/                  index.html (users), admin.html (organizers), css/, js/
```

## Data models

| Model | Key fields |
|---|---|
| User | name, email (unique), password (bcrypt), role: `user` \| `organizer` |
| Event | title, description, location, date, capacity, registeredCount, category, price, status (`published`/`draft`/`cancelled`), organizer → User |
| Registration | user → User, event → Event, attendeeName, attendeeEmail, phone, tickets, notes, status (`registered`/`cancelled`); unique index on (user, event) |

## API reference

Send the token as `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | name, email, password | attendee account |
| POST | `/api/auth/register-organizer` | name, email, password, organizerKey | needs `ORGANIZER_SECRET` |
| POST | `/api/auth/login` | email, password | returns `token` + `user` |
| GET | `/api/auth/me` | – | current user |

### Events (public)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/events` | `?search=&category=&page=&limit=&upcoming=false` |
| GET | `/api/events/:id` | event details (incl. `seatsLeft`) |

### Registrations (logged-in user)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/events/:id/register` | body: attendeeName, attendeeEmail, phone, tickets, notes |
| GET | `/api/registrations/my` | `?status=registered\|cancelled` |
| GET | `/api/registrations/:id` | own registration only |
| DELETE | `/api/registrations/:id` | cancel own registration |

### Admin (organizer only)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/stats` | dashboard numbers |
| GET | `/api/admin/events` | own events (incl. drafts) |
| POST | `/api/admin/events` | create event |
| PUT | `/api/admin/events/:id` | update (own events only) |
| DELETE | `/api/admin/events/:id` | deletes event + its registrations |
| GET | `/api/admin/events/:id/registrations` | attendee list |
| GET | `/api/admin/events/:id/registrations.csv` | CSV export |
| PATCH | `/api/admin/registrations/:id/cancel` | cancel an attendee's registration |

### Example (curl)

```bash
# login
curl -X POST localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@12345"}'

# register for an event
curl -X POST localhost:5000/api/events/<EVENT_ID>/register \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"phone":"01700000000","tickets":2}'
```

## Security notes

- Passwords hashed with bcrypt; JWT secret from environment
- Organizer routes protected by role check, and organizers can only manage their own events
- Mass-assignment protection (whitelisted fields), regex-escaped search, HTML-escaped frontend output, CSV formula-injection guard
- Rate limiting on auth endpoints, Helmet headers
