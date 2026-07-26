# MAGNET — College Communication Platform

## Software Requirement Specification (SRS)

**Version:** 1.0
**Date:** July 13, 2026
**Author:** Dhilip
**Project Name:** Magnet

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [User Roles](#5-user-roles)
6. [Use Cases](#6-use-cases)
7. [Module Breakdown](#7-module-breakdown)
8. [Database Planning](#8-database-planning)
9. [API Planning](#9-api-planning)
10. [Folder Structure](#10-folder-structure)
11. [Technology Stack](#11-technology-stack)
12. [Development Roadmap](#12-development-roadmap)
13. [Security Features](#13-security-features)
14. [Deployment Plan](#14-deployment-plan)

---

## 1. Introduction

### 1.1 Purpose

Magnet is a production-ready College Communication Platform designed to streamline and centralize all forms of communication within a college ecosystem. It serves as a single hub for students, faculty, and administrators to interact through posts, messaging, announcements, events, and resource sharing.

### 1.2 Scope

Magnet provides:

- A social feed for posting updates, images, and text content
- Real-time direct messaging between users
- Group/channel-based communication
- Official announcements from administration and faculty
- Event management and calendar integration
- Resource sharing (documents, links, study materials)
- Notification system via push notifications
- Role-based access control (Student, Faculty, Admin)

### 1.3 Definitions

| Term             | Definition                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| Magnet           | The college communication platform being built                             |
| Feed             | A scrollable timeline of posts from all users or filtered by groups/channels |
| Channel          | A topic-based or department-based communication room                       |
| Direct Message   | Private 1-on-1 or group messaging between users                            |
| Announcement    | An official post from Admin/Faculty visible to all or targeted audiences   |
| Push Notif.      | Real-time alerts delivered via Firebase Cloud Messaging                     |

---

## 2. Overall Description

### 2.1 Product Perspective

Magnet is a full-stack web application composed of:

- **Frontend (React + Tailwind CSS + Vite)** — Served via Vercel
- **Backend (FastAPI + SQLAlchemy)** — Hosted on Render
- **Database (PostgreSQL)** — Managed via Supabase
- **Media Storage** — Cloudinary
- **Push Notifications** — Firebase Cloud Messaging (FCM)

### 2.2 User Classes

| Role       | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| Student    | Regular user. Posts content, sends messages, joins channels.   |
| Faculty    | Can post, manage channels they own, send announcements.       |
| Admin      | Full control. Manages users, channels, announcements, system. |

### 2.3 Operating Environment

- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Mobile-responsive design (no native app initially)
- RESTful API communication over HTTPS

### 2.4 Constraints

- All media uploads go through Cloudinary (max 10MB per file)
- JWT tokens expire after 24 hours; refresh tokens after 7 days
- Free-tier hosting limits: Render (512MB RAM cold starts), Vercel (serverless limits)
- Supabase free tier: 500MB database, 1GB file storage

---

## 3. Functional Requirements

### 3.1 Authentication & User Management

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-01 | Users can register with email, name, college ID, department, and password.  |
| FR-02 | Users can log in with email and password.                                   |
| FR-03 | JWT access tokens are issued on successful login.                           |
| FR-04 | Refresh tokens allow seamless session extension without re-login.           |
| FR-05 | Users can reset their password via email link.                              |
| FR-06 | Users can update their profile (name, bio, avatar, department).             |
| FR-07 | Admin can approve or reject registration requests.                          |
| FR-08 | Admin can promote users to Faculty or demote them.                          |
| FR-09 | Admin can deactivate or delete user accounts.                               |

### 3.2 Feed & Posts

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-10 | Users can create text posts, optionally with images.                        |
| FR-11 | Users can like/unlike posts.                                                |
| FR-12 | Users can comment on posts.                                                 |
| FR-13 | Users can delete their own posts. Admin/Faculty can delete any post.        |
| FR-14 | Feed displays posts in reverse chronological order.                         |
| FR-15 | Feed supports infinite scroll pagination.                                   |
| FR-16 | Users can filter feed by: All, My Posts, My Department, My Channels.        |
| FR-17 | Posts can be tagged with a channel or category.                             |

### 3.3 Direct Messaging

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-18 | Users can send direct text messages to any other user.                      |
| FR-19 | Users can send images in direct messages.                                   |
| FR-20 | Messages are delivered in real-time using WebSockets.                       |
| FR-21 | Users can see online/offline status of other users.                         |
| FR-22 | Users can see "read" indicators on their messages.                          |
| FR-23 | Users can delete their own messages.                                        |
| FR-24 | Message history is persisted and paginated.                                 |

### 3.4 Channels & Groups

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-25 | Users can create channels (public or private).                              |
| FR-26 | Users can join/leave public channels.                                       |
| FR-27 | Private channels require an invite or approval from the owner.              |
| FR-28 | Channel owners can post announcements within the channel.                   |
| FR-29 | Channel owners can add/remove members.                                      |
| FR-30 | Channel chat supports text and image messages.                              |
| FR-31 | Channels have a description, icon, and member count display.                |

### 3.5 Announcements

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-32 | Admin and Faculty can create announcements.                                 |
| FR-33 | Announcements can be targeted to: All, Department, Specific Channel, or Users |
| FR-34 | Announcements are pinned at the top of the feed.                            |
| FR-35 | Users receive push notifications for announcements targeted at them.        |
| FR-36 | Announcements support rich text (bold, italic, links).                      |

### 3.6 Events & Calendar

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-37 | Admin and Faculty can create events with title, description, date/time, venue. |
| FR-38 | Users can RSVP (Going / Interested / Not Going).                            |
| FR-39 | Events appear on a calendar view.                                           |
| FR-40 | Users receive push notifications for upcoming events.                       |

### 3.7 Notifications

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-41 | Push notifications are sent via Firebase Cloud Messaging (FCM).             |
| FR-42 | Users can toggle notification preferences (email digest, push on/off).      |
| FR-43 | Notification badge count is displayed in the navigation bar.                |
| FR-44 | Users can view a notifications inbox with read/unread status.               |

### 3.8 Search & Discovery

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-45 | Users can search for other users by name or department.                     |
| FR-46 | Users can search channels by name.                                          |
| FR-47 | Users can search posts by keyword.                                          |

### 3.9 Admin Panel

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-48 | Admin dashboard shows user count, post count, channel count, active users.  |
| FR-49 | Admin can view and manage all users (ban, promote, delete).                 |
| FR-50 | Admin can view and manage all channels.                                     |
| FR-51 | Admin can view reported content and take action.                            |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| NFR-01 | Page load time < 2 seconds on 4G connection.                               |
| NFR-02 | API response time < 500ms for 95th percentile of requests.                 |
| NFR-03 | System supports 500 concurrent users without degradation.                  |
| NFR-04 | Real-time messages delivered within 100ms on same server.                   |
| NFR-05 | Feed pagination returns results in < 300ms.                                 |

### 4.2 Scalability

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| NFR-06 | Database schema supports horizontal partitioning by department/college.     |
| NFR-07 | Stateless API servers allow horizontal scaling behind a load balancer.      |
| NFR-08 | Media storage is offloaded to Cloudinary (CDN-backed).                      |

### 4.3 Availability

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| NFR-09 | System uptime target: 99.5%.                                                |
| NFR-10 | Graceful degradation when Cloudinary or FCM is temporarily unavailable.     |
| NFR-11 | Database connection pooling via SQLAlchemy pool.                            |

### 4.4 Security

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| NFR-12 | All API traffic over HTTPS (TLS 1.2+).                                     |
| NFR-13 | Passwords hashed with bcrypt (cost factor 12).                              |
| NFR-14 | JWT tokens signed with RS256 or HS256 with strong secret.                  |
| NFR-15 | CORS restricted to frontend origin only.                                    |
| NFR-16 | Rate limiting on authentication endpoints (5 req/min).                     |
| NFR-17 | Input validation on all API endpoints.                                      |
| NFR-18 | SQL injection prevention via SQLAlchemy ORM.                                |

### 4.5 Usability

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| NFR-19 | Mobile-responsive design (works on phones, tablets, desktops).              |
| NFR-20 | WCAG 2.1 AA compliance for accessibility.                                  |
| NFR-21 | Consistent UI language (English).                                           |
| NFR-22 | Dark mode / light mode toggle.                                              |

### 4.6 Maintainability

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| NFR-23 | Code follows PEP 8 (backend) and ESLint/Prettier (frontend).               |
| NFR-24 | All API endpoints are versioned (/api/v1/...).                             |
| NFR-25 | Environment variables managed via .env files (never committed).            |

---

## 5. User Roles

### 5.1 Student

- Register and manage own profile
- Create posts with text and images
- Like, comment on, and share posts
- Send and receive direct messages
- Join public channels; request access to private channels
- View and RSVP to events
- Receive push notifications
- Search users, channels, and posts

### 5.2 Faculty

Everything a Student can do, plus:

- Create announcements targeted to departments, channels, or all users
- Create and manage events
- Create and own channels
- Pin posts within owned channels
- Moderate posts in owned channels (delete inappropriate content)

### 5.3 Admin

Everything a Faculty can do, plus:

- Approve or reject registration requests
- Promote/demote users between Student and Faculty
- Deactivate or delete any user account
- Create system-wide announcements
- Manage all channels (edit, delete, transfer ownership)
- Access admin dashboard with analytics
- View and handle reported content
- Configure system settings (departments list, college info)

---

## 6. Use Cases

### UC-01: User Registration

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Unregistered User                                            |
| Precondition   | User does not have an account                               |
| Main Flow      | 1. User navigates to registration page.                     |
|                | 2. User fills in: name, email, college ID, department, password. |
|                | 3. System validates input.                                   |
|                | 4. System hashes password and creates account.              |
|                | 5. System sends verification email.                          |
|                | 6. User verifies email.                                      |
|                | 7. System activates account (or pending approval for admin-gated colleges). |
| Postcondition  | User account is created and ready for login.                |
| Alt Flow       | 3a. Validation fails → return error messages.               |

### UC-02: User Login

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Registered User                                             |
| Precondition   | User has an active account                                  |
| Main Flow      | 1. User enters email and password.                          |
|                | 2. System verifies credentials.                              |
|                | 3. System issues JWT access token + refresh token.          |
|                | 4. Frontend stores tokens and redirects to feed.            |
| Postcondition  | User is authenticated and can access the platform.          |
| Alt Flow       | 2a. Invalid credentials → return 401 error.                 |

### UC-03: Create Post

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Student / Faculty / Admin                                    |
| Precondition   | User is logged in                                           |
| Main Flow      | 1. User clicks "New Post" button.                           |
|                | 2. User enters text content.                                 |
|                | 3. User optionally attaches an image.                        |
|                | 4. User optionally tags a channel.                           |
|                | 5. User submits the post.                                   |
|                | 6. System validates content, uploads image to Cloudinary.   |
|                | 7. System saves post to database.                            |
|                | 8. Post appears on the user's feed.                          |
| Postcondition  | Post is published and visible to the intended audience.     |

### UC-04: Send Direct Message

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Student / Faculty / Admin                                    |
| Precondition   | User is logged in; recipient exists                         |
| Main Flow      | 1. User navigates to Messages.                              |
|                | 2. User selects or searches for a recipient.                |
|                | 3. User types and sends a message.                          |
|                | 4. Backend receives message via WebSocket.                  |
|                | 5. Backend persists message and forwards to recipient.      |
|                | 6. Recipient sees the message in real-time.                 |
| Postcondition  | Message is delivered and stored.                             |

### UC-05: Create Channel

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Faculty / Admin                                              |
| Precondition   | User is logged in with Faculty or Admin role                |
| Main Flow      | 1. User clicks "Create Channel".                            |
|                | 2. User enters channel name, description, type (public/private). |
|                | 3. System creates the channel.                               |
|                | 4. Creator becomes the channel owner.                        |
| Postcondition  | Channel is created and accessible.                          |

### UC-06: Post Announcement

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Faculty / Admin                                              |
| Precondition   | User is logged in with Faculty or Admin role                |
| Main Flow      | 1. User clicks "New Announcement".                          |
|                | 2. User enters title, body (rich text), and target audience. |
|                | 3. System saves the announcement.                            |
|                | 4. System sends push notifications to targeted users.       |
|                | 5. Announcement is pinned at top of feed.                   |
| Postcondition  | Announcement is visible and users are notified.             |

### UC-07: Create Event

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Faculty / Admin                                              |
| Precondition   | User is logged in with Faculty or Admin role                |
| Main Flow      | 1. User clicks "Create Event".                              |
|                | 2. User enters title, description, date/time, venue, type.  |
|                | 3. System saves event.                                       |
|                | 4. Users can view it on calendar and RSVP.                  |
|                | 5. System sends push notifications for the event.           |
| Postcondition  | Event is published and users are notified.                  |

### UC-08: Admin Manages Users

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Admin                                                        |
| Precondition   | Admin is logged in                                           |
| Main Flow      | 1. Admin navigates to User Management panel.               |
|                | 2. Admin views list of all users.                            |
|                | 3. Admin can search/filter users.                            |
|                | 4. Admin performs action: promote, demote, ban, or delete.  |
|                | 5. System applies the change.                                |
| Postcondition  | User role or status is updated.                              |

### UC-09: React to Post

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Student / Faculty / Admin                                    |
| Precondition   | User is logged in; post exists                              |
| Main Flow      | 1. User sees a post on the feed.                            |
|                | 2. User clicks the like button.                              |
|                | 3. System toggles the like state.                            |
|                | 4. Like count updates on the post.                           |
|                | 5. Alternatively, user types and submits a comment.         |
| Postcondition  | Reaction or comment is recorded and displayed.              |

### UC-10: Search

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Actor          | Any logged-in user                                           |
| Precondition   | User is logged in                                           |
| Main Flow      | 1. User clicks on search bar.                               |
|                | 2. User types a query.                                       |
|                | 3. System returns matching users, channels, and posts.      |
| Postcondition  | User can navigate to any search result.                     |

---

## 7. Module Breakdown

### Module 1: Authentication Module

- Registration (with email verification)
- Login / Logout
- JWT token generation, validation, refresh
- Password hashing (bcrypt)
- Password reset flow

### Module 2: User Profile Module

- Profile CRUD (name, email, bio, avatar, department, year)
- Avatar upload via Cloudinary
- Profile visibility settings
- User directory (search, filter by department)

### Module 3: Feed & Posts Module

- Create / Read / Update / Delete posts
- Image upload for posts (Cloudinary)
- Like / Unlike
- Comment CRUD
- Feed pagination (cursor-based)
- Feed filtering (All, Department, Channel, Mine)
- Post tagging (channels, categories)

### Module 4: Direct Messaging Module

- Real-time messaging via WebSockets (FastAPI WebSocket)
- Message persistence in database
- Conversation list (sorted by last message time)
- Online/offline status
- Read receipts
- Image messages
- Message deletion

### Module 5: Channels Module

- Channel CRUD (create, read, update, delete)
- Public / Private channel types
- Join / Leave / Invite
- Channel chat (text and image messages)
- Channel member management
- Channel owner/admin roles

### Module 6: Announcements Module

- Create / Read / Delete announcements
- Target audience selection (All, Department, Channel, Users)
- Rich text content (markdown or HTML)
- Pin to top of feed
- Push notification dispatch on creation

### Module 7: Events Module

- Create / Read / Update / Delete events
- Calendar view
- RSVP system (Going / Interested / Not Going)
- Event reminders via push notifications

### Module 8: Notifications Module

- Push notification registration (FCM token storage)
- Notification dispatch on: messages, announcements, events, likes, comments
- Notification inbox (read/unread, paginated)
- Notification preferences per user

### Module 9: Search Module

- Full-text search on users, channels, and posts
- Search autocomplete
- Search result ranking

### Module 10: Admin Panel Module

- Dashboard analytics (user count, active users, post count, channel count)
- User management (list, search, promote, demote, ban, delete)
- Channel management (list, edit, delete, transfer ownership)
- Reported content management
- System settings (departments, college name, logo)

---

## 8. Database Planning

### 8.1 Entity-Relationship Diagram (Textual)

```
Users ──< Posts
Users ──< Comments
Users ──< Likes
Users ──< Messages (sender)
Users ──< Messages (receiver)
Users ──< ChannelMembers >── Channels
Users ──< Announcements
Users ──< Events
Users ──< RSVPs >── Events
Users ──< Notifications
Users ──< FCM Tokens
Channels ──< ChannelMessages
Channels ──< ChannelAnnouncements
Posts ──< PostImages
```

### 8.2 Tables

#### users

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK, default uuid_generate_v4()       |
| email           | VARCHAR(255)             | UNIQUE, NOT NULL                     |
| password_hash   | VARCHAR(255)             | NOT NULL                             |
| full_name       | VARCHAR(150)             | NOT NULL                             |
| college_id      | VARCHAR(50)              | UNIQUE                               |
| department      | VARCHAR(100)             |                                      |
| year_of_study   | INTEGER                  |                                      |
| bio             | TEXT                     |                                      |
| avatar_url      | TEXT                     |                                      |
| role            | ENUM('student','faculty','admin') | DEFAULT 'student'          |
| is_verified     | BOOLEAN                  | DEFAULT false                        |
| is_active       | BOOLEAN                  | DEFAULT true                         |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
| updated_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### posts

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| author_id       | UUID                     | FK → users.id, NOT NULL              |
| channel_id      | UUID                     | FK → channels.id, NULLABLE           |
| content         | TEXT                     | NOT NULL                             |
| is_pinned       | BOOLEAN                  | DEFAULT false                        |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
| updated_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### post_images

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| post_id         | UUID                     | FK → posts.id, NOT NULL              |
| image_url       | TEXT                     | NOT NULL                             |
| cloudinary_id   | VARCHAR(255)             |                                      |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### comments

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| post_id         | UUID                     | FK → posts.id, NOT NULL              |
| author_id       | UUID                     | FK → users.id, NOT NULL              |
| content         | TEXT                     | NOT NULL                             |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
| updated_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### likes

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| post_id         | UUID                     | FK → posts.id, NOT NULL              |
| user_id         | UUID                     | FK → users.id, NOT NULL              |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
|                 |                          | UNIQUE(post_id, user_id)             |

#### channels

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| name            | VARCHAR(100)             | NOT NULL                             |
| description     | TEXT                     |                                      |
| type            | ENUM('public','private') | DEFAULT 'public'                     |
| icon_url        | TEXT                     |                                      |
| owner_id        | UUID                     | FK → users.id, NOT NULL              |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
| updated_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### channel_members

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| channel_id      | UUID                     | FK → channels.id, NOT NULL           |
| user_id         | UUID                     | FK → users.id, NOT NULL              |
| role            | ENUM('owner','admin','member') | DEFAULT 'member'              |
| joined_at       | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
|                 |                          | UNIQUE(channel_id, user_id)          |

#### channel_messages

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| channel_id      | UUID                     | FK → channels.id, NOT NULL           |
| sender_id       | UUID                     | FK → users.id, NOT NULL              |
| content         | TEXT                     | NOT NULL                             |
| image_url       | TEXT                     | NULLABLE                             |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### direct_messages

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| sender_id       | UUID                     | FK → users.id, NOT NULL              |
| receiver_id     | UUID                     | FK → users.id, NOT NULL              |
| content         | TEXT                     | NOT NULL                             |
| image_url       | TEXT                     | NULLABLE                             |
| is_read         | BOOLEAN                  | DEFAULT false                        |
| is_deleted      | BOOLEAN                  | DEFAULT false                        |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### announcements

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| author_id       | UUID                     | FK → users.id, NOT NULL              |
| title           | VARCHAR(255)             | NOT NULL                             |
| content         | TEXT                     | NOT NULL                             |
| target_type     | ENUM('all','department','channel','users') | DEFAULT 'all'       |
| target_value    | VARCHAR(255)             | NULLABLE (dept name, channel_id, JSON array of user_ids) |
| is_pinned       | BOOLEAN                  | DEFAULT true                         |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### events

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| creator_id      | UUID                     | FK → users.id, NOT NULL              |
| title           | VARCHAR(255)             | NOT NULL                             |
| description     | TEXT                     |                                      |
| event_date      | TIMESTAMP WITH TZ        | NOT NULL                             |
| end_date        | TIMESTAMP WITH TZ        | NULLABLE                             |
| venue           | VARCHAR(255)             |                                      |
| event_type      | VARCHAR(50)              | (academic, cultural, sports, etc.)   |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### rsvps

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| event_id        | UUID                     | FK → events.id, NOT NULL             |
| user_id         | UUID                     | FK → users.id, NOT NULL              |
| status          | ENUM('going','interested','not_going') | NOT NULL                |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |
|                 |                          | UNIQUE(event_id, user_id)            |

#### notifications

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| user_id         | UUID                     | FK → users.id, NOT NULL              |
| type            | VARCHAR(50)              | (message, announcement, event, like, comment) |
| title           | VARCHAR(255)             | NOT NULL                             |
| body            | TEXT                     | NOT NULL                             |
| reference_type  | VARCHAR(50)              | (post, message, announcement, event) |
| reference_id    | UUID                     | NULLABLE                             |
| is_read         | BOOLEAN                  | DEFAULT false                        |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### fcm_tokens

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| user_id         | UUID                     | FK → users.id, NOT NULL              |
| token           | TEXT                     | NOT NULL, UNIQUE                     |
| device_info     | VARCHAR(255)             |                                      |
| created_at      | TIMESTAMP WITH TZ        | DEFAULT NOW()                        |

#### notification_preferences

| Column          | Type                     | Constraints                          |
| --------------- | ------------------------ | ------------------------------------ |
| id              | UUID                     | PK                                   |
| user_id         | UUID                     | FK → users.id, UNIQUE, NOT NULL      |
| push_enabled    | BOOLEAN                  | DEFAULT true                         |
| message_notifs  | BOOLEAN                  | DEFAULT true                         |
| announcement_notifs | BOOLEAN              | DEFAULT true                         |
| event_notifs    | BOOLEAN                  | DEFAULT true                         |
| like_notifs     | BOOLEAN                  | DEFAULT true                         |
| comment_notifs  | BOOLEAN                  | DEFAULT true                         |

### 8.3 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_channel_id ON posts(channel_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_direct_messages_sender_receiver ON direct_messages(sender_id, receiver_id);
CREATE INDEX idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX idx_channel_messages_created_at ON channel_messages(created_at DESC);
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_full_name_trgm ON users USING gin(full_name gin_trgm_ops);  -- for search
CREATE INDEX idx_channels_name_trgm ON channels USING gin(name gin_trgm_ops);  -- for search
CREATE INDEX idx_posts_content_trgm ON posts USING gin(content gin_trgm_ops);  -- for search
```

---

## 9. API Planning

All endpoints are prefixed with `/api/v1`.

### 9.1 Authentication

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| POST   | `/auth/register`              | Register a new user         | No            |
| POST   | `/auth/login`                 | Login and get tokens        | No            |
| POST   | `/auth/refresh`               | Refresh access token        | Yes (refresh) |
| POST   | `/auth/forgot-password`       | Send password reset email   | No            |
| POST   | `/auth/reset-password`        | Reset password with token   | No            |
| POST   | `/auth/verify-email`          | Verify email address        | No            |

### 9.2 Users

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| GET    | `/users/me`                   | Get current user profile    | Yes           |
| PUT    | `/users/me`                   | Update current user profile | Yes           |
| PUT    | `/users/me/avatar`            | Upload avatar               | Yes           |
| GET    | `/users/:id`                  | Get user by ID              | Yes           |
| GET    | `/users`                      | List users (search/filter)  | Yes           |
| GET    | `/users/online`               | Get online users            | Yes           |

### 9.3 Posts

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| POST   | `/posts`                      | Create a post               | Yes           |
| GET    | `/posts`                      | Get feed (paginated)        | Yes           |
| GET    | `/posts/:id`                  | Get single post             | Yes           |
| PUT    | `/posts/:id`                  | Update post                 | Yes (owner)   |
| DELETE | `/posts/:id`                  | Delete post                 | Yes (owner/admin) |
| POST   | `/posts/:id/like`             | Like/unlike post            | Yes           |
| GET    | `/posts/:id/comments`         | Get comments on post        | Yes           |
| POST   | `/posts/:id/comments`         | Add comment to post         | Yes           |
| DELETE | `/posts/:comments/:id`        | Delete comment              | Yes (owner/admin) |

### 9.4 Direct Messages

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| GET    | `/messages/conversations`     | List all conversations      | Yes           |
| GET    | `/messages/conversations/:userId` | Get messages with user  | Yes           |
| POST   | `/messages`                   | Send a message              | Yes           |
| DELETE | `/messages/:id`               | Delete a message            | Yes (sender)  |
| PUT    | `/messages/:id/read`          | Mark message as read        | Yes (receiver)|
| WS     | `/ws/messages`                | WebSocket for real-time DM  | Yes           |

### 9.5 Channels

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| POST   | `/channels`                   | Create a channel            | Yes (faculty/admin) |
| GET    | `/channels`                   | List channels               | Yes           |
| GET    | `/channels/:id`               | Get channel details         | Yes           |
| PUT    | `/channels/:id`               | Update channel              | Yes (owner)   |
| DELETE | `/channels/:id`               | Delete channel              | Yes (owner/admin) |
| POST   | `/channels/:id/join`          | Join channel                | Yes           |
| POST   | `/channels/:id/leave`         | Leave channel               | Yes           |
| GET    | `/channels/:id/members`       | List channel members        | Yes           |
| POST   | `/channels/:id/members`       | Add member to channel       | Yes (owner/admin) |
| DELETE | `/channels/:id/members/:uid`  | Remove member               | Yes (owner/admin) |
| GET    | `/channels/:id/messages`      | Get channel messages        | Yes           |
| POST   | `/channels/:id/messages`      | Send channel message        | Yes (member)  |
| WS     | `/ws/channels/:id`            | WebSocket for channel chat  | Yes           |

### 9.6 Announcements

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| POST   | `/announcements`              | Create announcement         | Yes (faculty/admin) |
| GET    | `/announcements`              | List announcements          | Yes           |
| GET    | `/announcements/:id`          | Get announcement details    | Yes           |
| DELETE | `/announcements/:id`          | Delete announcement         | Yes (author/admin) |

### 9.7 Events

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| POST   | `/events`                     | Create event                | Yes (faculty/admin) |
| GET    | `/events`                     | List events                 | Yes           |
| GET    | `/events/:id`                 | Get event details           | Yes           |
| PUT    | `/events/:id`                 | Update event                | Yes (creator) |
| DELETE | `/events/:id`                 | Delete event                | Yes (creator/admin) |
| POST   | `/events/:id/rsvp`            | RSVP to event               | Yes           |
| GET    | `/events/:id/rsvps`           | Get event RSVPs             | Yes           |

### 9.8 Notifications

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| GET    | `/notifications`              | Get notifications (paginated)| Yes           |
| PUT    | `/notifications/:id/read`     | Mark notification as read   | Yes           |
| PUT    | `/notifications/read-all`     | Mark all as read            | Yes           |
| GET    | `/notifications/unread-count` | Get unread count            | Yes           |
| POST   | `/notifications/fcm-token`    | Register FCM token          | Yes           |
| DELETE | `/notifications/fcm-token`    | Remove FCM token            | Yes           |
| GET    | `/notifications/preferences`  | Get notification prefs      | Yes           |
| PUT    | `/notifications/preferences`  | Update notification prefs   | Yes           |

### 9.9 Search

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| GET    | `/search?q=query`             | Search users, channels, posts | Yes         |

### 9.10 Admin

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| GET    | `/admin/dashboard`            | Get dashboard stats         | Yes (admin)   |
| GET    | `/admin/users`                | List all users (admin view) | Yes (admin)   |
| PUT    | `/admin/users/:id/role`       | Change user role            | Yes (admin)   |
| PUT    | `/admin/users/:id/status`     | Activate/deactivate user    | Yes (admin)   |
| DELETE | `/admin/users/:id`            | Delete user                 | Yes (admin)   |
| GET    | `/admin/channels`             | List all channels (admin)   | Yes (admin)   |
| DELETE | `/admin/channels/:id`         | Delete channel              | Yes (admin)   |
| GET    | `/admin/reports`              | Get reported content        | Yes (admin)   |
| PUT    | `/admin/settings`             | Update system settings      | Yes (admin)   |

### 9.11 Media Upload

| Method | Endpoint                      | Description                 | Auth Required |
| ------ | ----------------------------- | --------------------------- | ------------- |
| POST   | `/upload/image`               | Upload image to Cloudinary  | Yes           |

---

## 10. Folder Structure

```
magnet/
├── frontend/                          # React + Vite + Tailwind
│   ├── public/
│   │   ├── favicon.ico
│   │   └── logo.svg
│   ├── src/
│   │   ├── assets/                    # Static assets (images, fonts)
│   │   ├── components/
│   │   │   ├── common/               # Reusable UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── Loader.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── Navbar.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ForgotPasswordForm.tsx
│   │   │   ├── feed/
│   │   │   │   ├── PostCard.tsx
│   │   │   │   ├── PostCreator.tsx
│   │   │   │   ├── CommentSection.tsx
│   │   │   │   └── FeedFilters.tsx
│   │   │   ├── messages/
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── MessageInput.tsx
│   │   │   ├── channels/
│   │   │   │   ├── ChannelList.tsx
│   │   │   │   ├── ChannelCard.tsx
│   │   │   │   ├── ChannelChat.tsx
│   │   │   │   └── CreateChannelModal.tsx
│   │   │   ├── announcements/
│   │   │   │   ├── AnnouncementCard.tsx
│   │   │   │   └── AnnouncementCreator.tsx
│   │   │   ├── events/
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   └── CreateEventModal.tsx
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   ├── NotificationList.tsx
│   │   │   │   └── NotificationItem.tsx
│   │   │   ├── profile/
│   │   │   │   ├── ProfileCard.tsx
│   │   │   │   ├── ProfileEditForm.tsx
│   │   │   │   └── ProfileSettings.tsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── UserManagement.tsx
│   │   │       ├── ChannelManagement.tsx
│   │   │       └── SystemSettings.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── FeedPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── MessagesPage.tsx
│   │   │   ├── ChannelsPage.tsx
│   │   │   ├── ChannelDetailPage.tsx
│   │   │   ├── AnnouncementsPage.tsx
│   │   │   ├── EventsPage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── admin/
│   │   │       └── AdminDashboardPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── usePosts.ts
│   │   │   ├── useMessages.ts
│   │   │   ├── useChannels.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useInfiniteScroll.ts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios instance with interceptors
│   │   │   ├── authService.ts
│   │   │   ├── postService.ts
│   │   │   ├── messageService.ts
│   │   │   ├── channelService.ts
│   │   │   ├── announcementService.ts
│   │   │   ├── eventService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── searchService.ts
│   │   │   ├── uploadService.ts
│   │   │   └── adminService.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   ├── validators.ts
│   │   │   ├── dateUtils.ts
│   │   │   └── storage.ts
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── post.ts
│   │   │   ├── message.ts
│   │   │   ├── channel.ts
│   │   │   ├── announcement.ts
│   │   │   ├── event.ts
│   │   │   └── notification.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── package.json
│   └── .env
│
├── backend/                            # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI app entrypoint
│   │   ├── config.py                   # Settings / env vars
│   │   ├── database.py                 # DB engine, session, Base
│   │   ├── dependencies.py             # Shared dependencies (get_db, get_current_user)
│   │   ├── models/                     # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── post.py
│   │   │   ├── comment.py
│   │   │   ├── like.py
│   │   │   ├── channel.py
│   │   │   ├── channel_member.py
│   │   │   ├── channel_message.py
│   │   │   ├── direct_message.py
│   │   │   ├── announcement.py
│   │   │   ├── event.py
│   │   │   ├── rsvp.py
│   │   │   ├── notification.py
│   │   │   ├── fcm_token.py
│   │   │   └── notification_preference.py
│   │   ├── schemas/                    # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── post.py
│   │   │   ├── comment.py
│   │   │   ├── message.py
│   │   │   ├── channel.py
│   │   │   ├── announcement.py
│   │   │   ├── event.py
│   │   │   ├── notification.py
│   │   │   └── common.py              # Pagination, response wrappers
│   │   ├── routers/                    # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── posts.py
│   │   │   ├── messages.py
│   │   │   ├── channels.py
│   │   │   ├── announcements.py
│   │   │   ├── events.py
│   │   │   ├── notifications.py
│   │   │   ├── search.py
│   │   │   ├── upload.py
│   │   │   └── admin.py
│   │   ├── services/                   # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── post_service.py
│   │   │   ├── message_service.py
│   │   │   ├── channel_service.py
│   │   │   ├── announcement_service.py
│   │   │   ├── event_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── search_service.py
│   │   │   ├── upload_service.py
│   │   │   └── admin_service.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── security.py            # Password hashing, JWT
│   │   │   ├── email.py               # Email sending (SMTP)
│   │   │   ├── firebase.py            # FCM push notification helper
│   │   │   ├── cloudinary.py          # Cloudinary upload helper
│   │   │   └── validators.py          # Input validators
│   │   └── websockets/
│   │       ├── __init__.py
│   │       ├── connection_manager.py  # WebSocket connection manager
│   │       └── handlers.py            # WS message handlers
│   ├── alembic/                        # Database migrations
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   └── run.py
│
├── docs/                               # Documentation
│   └── SRS.md                          # This file
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 11. Technology Stack

### 11.1 Frontend

| Technology       | Purpose                                    | Version    |
| ---------------- | ------------------------------------------ | ---------- |
| React            | UI framework                               | 18.x       |
| Vite             | Build tool and dev server                  | 5.x        |
| Tailwind CSS     | Utility-first CSS framework                | 3.x        |
| TypeScript       | Type safety                                | 5.x        |
| React Router     | Client-side routing                        | 6.x        |
| Axios            | HTTP client                                | 1.x        |
| React Context    | Global state management                    | (built-in) |
| Socket.io Client | WebSocket connection for real-time         | 4.x        |
| Firebase         | FCM integration (firebase/messaging)       | 10.x       |
| React Hot Toast  | Toast notifications                        | 2.x        |
| Date-fns         | Date formatting and manipulation           | 3.x        |
| Lucide React     | Icon library                               | latest     |

### 11.2 Backend

| Technology          | Purpose                                    | Version  |
| ------------------- | ------------------------------------------ | -------- |
| FastAPI             | Web framework                              | 0.111.x  |
| SQLAlchemy          | ORM and database toolkit                   | 2.x      |
| Alembic             | Database migrations                        | 1.x      |
| Pydantic            | Data validation (via FastAPI)              | 2.x      |
| python-jose         | JWT token creation and verification        | 3.x      |
| passlib[bcrypt]     | Password hashing                           | 1.7.x    |
| python-multipart    | File upload handling                       | 0.0.x    |
| websockets          | WebSocket support                          | 12.x     |
| httpx               | Async HTTP client (Cloudinary, FCM)        | 0.27.x   |
| firebase-admin      | Server-side Firebase (FCM)                 | 6.x      |
| cloudinary          | Image upload and management                | 1.x      |
| uvicorn             | ASGI server                                | 0.30.x   |
| python-dotenv       | Environment variable management            | 1.x      |
| asyncpg             | PostgreSQL async driver for SQLAlchemy     | 0.29.x   |

### 11.3 Database

| Technology          | Purpose                                    |
| ------------------- | ------------------------------------------ |
| PostgreSQL          | Primary relational database                |
| Supabase PostgreSQL | Managed PostgreSQL hosting                 |

### 11.4 Storage

| Technology          | Purpose                                    |
| ------------------- | ------------------------------------------ |
| Cloudinary          | Image upload, transformation, and CDN      |

### 11.5 Notifications

| Technology                      | Purpose                                |
| ------------------------------- | -------------------------------------- |
| Firebase Cloud Messaging (FCM)  | Browser push notifications            |

### 11.6 Hosting & Deployment

| Component  | Platform       | Details                              |
| ---------- | -------------- | ------------------------------------ |
| Frontend   | Vercel         | Auto-deploy from GitHub, preview PRs |
| Backend    | Render         | Docker-based, auto-deploy from GitHub |
| Database   | Supabase       | Managed PostgreSQL, connection pooling |
| Media      | Cloudinary     | CDN-backed image storage             |

### 11.7 DevOps & Tooling

| Tool             | Purpose                                    |
| ---------------- | ------------------------------------------ |
| Git              | Version control                            |
| GitHub           | Repository hosting and CI/CD triggers      |
| ESLint           | Frontend linting                           |
| Prettier         | Frontend code formatting                   |
| Ruff / Black     | Backend Python linting/formatting          |
| Docker           | Backend containerization                   |
| Pytest           | Backend testing                            |
| Vitest           | Frontend testing                           |

---

## 12. Development Roadmap

### Phase 1: Foundation (Weeks 1–2)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Set up monorepo structure (frontend + backend)              | High     |
| Initialize FastAPI project with SQLAlchemy + Alembic        | High     |
| Initialize React + Vite + Tailwind project                  | High     |
| Design and create database schema via Alembic migrations    | High     |
| Implement User model and auth endpoints (register, login, refresh) | High |
| Implement JWT authentication middleware                      | High     |
| Set up frontend routing, auth context, and protected routes | High     |
| Build login and registration pages                          | High     |
| Connect frontend to backend auth flow                       | High     |

### Phase 2: Core Features (Weeks 3–4)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Implement Post CRUD endpoints                               | High     |
| Implement Like and Comment endpoints                        | High     |
| Build feed page with PostCard, PostCreator, infinite scroll | High     |
| Implement Cloudinary image upload service (backend)         | High     |
| Implement image upload UI (frontend)                        | High     |
| Implement User Profile CRUD endpoints                       | High     |
| Build profile page and profile edit form                    | High     |

### Phase 3: Real-time Messaging (Weeks 5–6)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Implement Direct Message CRUD endpoints                     | High     |
| Set up WebSocket connection manager (FastAPI)               | High     |
| Implement real-time message delivery via WebSocket          | High     |
| Build messaging page (conversation list, chat window)       | High     |
| Implement online/offline status tracking                    | Medium   |
| Implement read receipts                                     | Medium   |

### Phase 4: Channels (Weeks 7–8)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Implement Channel CRUD endpoints                            | High     |
| Implement Channel member management                         | High     |
| Implement channel messages (WebSocket per channel)          | High     |
| Build channels list and channel detail page                 | High     |
| Build channel chat UI                                       | High     |
| Implement join/leave channel flow                           | High     |

### Phase 5: Announcements & Events (Weeks 9–10)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Implement Announcement CRUD endpoints                      | High     |
| Implement target audience filtering logic                   | High     |
| Build announcement cards and announcement page              | High     |
| Implement Event CRUD endpoints                              | Medium   |
| Implement RSVP endpoints                                    | Medium   |
| Build calendar view and event cards                         | Medium   |

### Phase 6: Notifications & Search (Weeks 11–12)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Set up Firebase Admin SDK on backend                        | High     |
| Implement FCM token registration and notification dispatch  | High     |
| Build notification inbox and notification bell              | High     |
| Implement notification preferences                          | Medium   |
| Implement search endpoints (users, channels, posts)         | Medium   |
| Build search page with autocomplete                         | Medium   |

### Phase 7: Admin Panel (Weeks 13–14)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Implement admin dashboard stats endpoints                   | Medium   |
| Implement user management endpoints (promote, demote, ban)  | Medium   |
| Implement channel management endpoints                      | Medium   |
| Build admin dashboard UI                                    | Medium   |
| Build user management table with actions                    | Medium   |
| Implement system settings endpoints                         | Low      |

### Phase 8: Polish & Deployment (Weeks 15–16)

| Task                                                        | Priority |
| ----------------------------------------------------------- | -------- |
| Dark mode / light mode toggle                               | Medium   |
| Mobile responsiveness audit and fixes                       | High     |
| Error handling and loading states across all pages           | Medium   |
| Rate limiting and input validation hardening                | High     |
| Set up Docker for backend                                   | High     |
| Deploy backend to Render                                    | High     |
| Deploy frontend to Vercel                                   | High     |
| Connect to Supabase PostgreSQL in production                | High     |
| Set up Cloudinary production environment                    | High     |
| Set up Firebase project and FCM for production              | High     |
| End-to-end testing and bug fixes                            | High     |
| Write README with setup instructions                        | Medium   |

---

## 13. Security Features

### 13.1 Authentication Security

| Feature                     | Implementation                                              |
| --------------------------- | ----------------------------------------------------------- |
| Password Hashing            | bcrypt with cost factor 12 via passlib                      |
| JWT Access Tokens           | HS256 with strong secret, 24-hour expiry                   |
| JWT Refresh Tokens          | 7-day expiry, stored in HTTP-only cookie                   |
| Token Revocation            | Refresh token stored in DB; can be invalidated on logout   |
| Rate Limiting               | 5 login attempts per minute per IP via slowapi              |
| Brute Force Protection      | Account lockout after 10 failed login attempts              |

### 13.2 Data Security

| Feature                     | Implementation                                              |
| --------------------------- | ----------------------------------------------------------- |
| HTTPS Enforcement           | TLS 1.2+ on all platforms (Vercel/Render/Supabase)         |
| CORS Policy                 | Allow only frontend origin; block all others                |
| Input Validation            | Pydantic schemas validate all API inputs                   |
| SQL Injection Prevention    | SQLAlchemy ORM (parameterized queries)                      |
| XSS Prevention              | React auto-escapes output; sanitize rich text server-side   |
| CSRF Protection             | SameSite cookie attribute on refresh tokens                 |

### 13.3 File Upload Security

| Feature                     | Implementation                                              |
| --------------------------- | ----------------------------------------------------------- |
| File Type Validation        | Whitelist: JPEG, PNG, GIF, WebP only                       |
| File Size Limit             | Max 10MB per file                                           |
| Server-Side Validation      | Validate MIME type, not just extension                      |
| Cloudinary Isolation        | Separate folders per entity type                            |

### 13.4 API Security

| Feature                     | Implementation                                              |
| --------------------------- | ----------------------------------------------------------- |
| Authentication Required     | All endpoints except register/login/refresh require JWT     |
| Role-Based Access           | Admin/Faculty-only endpoints check user role               |
| Resource Ownership          | Users can only modify their own resources                  |
| Rate Limiting               | Global: 100 req/min; Auth: 5 req/min                       |
| Request Size Limits         | Max 10MB per request body                                  |

### 13.5 Infrastructure Security

| Feature                     | Implementation                                              |
| --------------------------- | ----------------------------------------------------------- |
| Environment Variables       | Secrets in .env files, never committed to Git              |
| Database Credentials        | Stored in Supabase dashboard, not in code                  |
| API Keys                    | Cloudinary, Firebase keys in env vars only                  |
| Error Handling              | No stack traces or internal paths exposed to client        |
| Logging                     | Structured logs without sensitive data                     |

---

## 14. Deployment Plan

### 14.1 Environment Setup

#### Backend (.env)

```
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/magnet_db
SECRET_KEY=<random-64-char-string>
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<app-password>
ALLOWED_ORIGINS=https://magnet.vercel.app
```

#### Frontend (.env)

```
VITE_API_URL=https://magnet-api.onrender.com/api/v1
VITE_WS_URL=wss://magnet-api.onrender.com
VITE_FIREBASE_VAPID_KEY=<firebase-vapid-key>
```

### 14.2 Supabase PostgreSQL Setup

1. Create a Supabase project at supabase.com
2. Note the connection string from Settings → Database → Connection string
3. Use the direct connection string for Alembic migrations
4. Use the pooled connection string for the application
5. Enable the `uuid-ossp` extension for UUID generation
6. Enable the `pg_trgm` extension for trigram-based text search

### 14.3 Cloudinary Setup

1. Create a Cloudinary account at cloudinary.com
2. Note the cloud name, API key, and API secret from the dashboard
3. Create upload presets for: posts, avatars, channel-icons
4. Configure unsigned or signed upload presets as needed
5. Set folder structure: `magnet/avatars/`, `magnet/posts/`, `magnet/channels/`

### 14.4 Firebase Setup

1. Create a Firebase project at console.firebase.google.com
2. Enable Cloud Messaging under Project Settings
3. Generate a web push certificate (VAPID key) for frontend
4. Generate a service account key (JSON) for backend
5. Download the service account JSON file (used by firebase-admin SDK)

### 14.5 Backend Deployment (Render)

1. Push backend code to GitHub
2. Create a new Web Service on Render
3. Connect the GitHub repository
4. Configure:
   - **Runtime:** Docker (using Dockerfile)
   - **Port:** 8000
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Set environment variables in Render dashboard
6. Upload Firebase service account JSON as a secret file
7. Enable auto-deploy on main branch push
8. Verify the service at `https://magnet-api.onrender.com/docs`

### 14.6 Frontend Deployment (Vercel)

1. Push frontend code to GitHub
2. Create a new project on Vercel
3. Connect the GitHub repository
4. Configure:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Set environment variables in Vercel dashboard
6. Enable auto-deploy on main branch push
7. Configure custom domain if needed (e.g., magnet.yourdomain.com)

### 14.7 Post-Deployment Checklist

| #  | Item                                                             |
| -- | ---------------------------------------------------------------- |
| 1  | Verify frontend loads at Vercel URL                              |
| 2  | Verify backend responds at Render URL                            |
| 3  | Verify frontend can communicate with backend (CORS)             |
| 4  | Verify user registration and login flow end-to-end              |
| 5  | Verify image upload and display                                 |
| 6  | Verify real-time messaging via WebSocket                        |
| 7  | Verify push notifications work end-to-end                       |
| 8  | Verify database connections are stable (no connection leaks)    |
| 9  | Monitor Render logs for errors                                  |
| 10 | Monitor Supabase dashboard for query performance                |
| 11 | Test on mobile browsers for responsive layout                   |
| 12 | Verify rate limiting is active                                  |

---

## Appendix A: Environment Variable Reference

| Variable                   | Required | Description                          |
| -------------------------- | -------- | ------------------------------------ |
| DATABASE_URL               | Yes      | PostgreSQL connection string         |
| SECRET_KEY                 | Yes      | JWT signing secret                   |
| ACCESS_TOKEN_EXPIRE_MINUTES| No       | Access token lifetime (default: 1440)|
| REFRESH_TOKEN_EXPIRE_DAYS  | No       | Refresh token lifetime (default: 7)  |
| CLOUDINARY_CLOUD_NAME      | Yes      | Cloudinary cloud name                |
| CLOUDINARY_API_KEY         | Yes      | Cloudinary API key                   |
| CLOUDINARY_API_SECRET      | Yes      | Cloudinary API secret                |
| FIREBASE_CREDENTIALS_PATH  | Yes      | Path to Firebase service account JSON|
| SMTP_HOST                  | Yes      | Email SMTP host                      |
| SMTP_PORT                  | Yes      | Email SMTP port                      |
| SMTP_USER                  | Yes      | Email SMTP username                  |
| SMTP_PASS                  | Yes      | Email SMTP password                  |
| ALLOWED_ORIGINS            | Yes      | Comma-separated allowed CORS origins |
| VITE_API_URL               | Yes      | Backend API base URL (frontend)      |
| VITE_WS_URL                | Yes      | WebSocket URL (frontend)             |
| VITE_FIREBASE_VAPID_KEY    | Yes      | Firebase VAPID key (frontend)        |

---

## Appendix B: API Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 1,
    "page_size": 20,
    "has_next": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is already registered"
  }
}
```

---

*End of SRS Document — Magnet v1.0*
