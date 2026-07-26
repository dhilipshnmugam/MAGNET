# MAGNET — Complete Database Design

**Version:** 1.0
**Date:** July 13, 2026
**Database:** PostgreSQL (Supabase)
**ORM:** SQLAlchemy 2.x + Alembic

---

## Table of Contents

1. [ER Diagram](#1-er-diagram)
2. [Tables](#2-tables)
3. [Relationships Summary](#3-relationships-summary)
4. [Indexes](#4-indexes)
5. [Constraints](#5-constraints)
6. [Normalization Analysis](#6-normalization-analysis)
7. [SQL Migration](#7-sql-migration)
8. [SQLAlchemy Models](#8-sqlalchemy-models)
9. [Seed Data](#9-seed-data)

---

## 1. ER Diagram

### 1.1 Full Textual ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MAGNET DATABASE — ER DIAGRAM                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────┐
                                    │   departments     │
                                    │──────────────────│
                                    │ id          (PK) │
                                    │ name        (UQ) │
                                    │ code        (UQ) │
                                    │ description      │
                                    │ head_id     (FK) │──┐
                                    │ is_active        │  │
                                    │ created_at       │  │
                                    └──────┬───────────┘  │
                                           │              │
                            ┌──────────────┘              │
                            │ 1:N                         │ self-ref
                            ▼                             │
  ┌────────────┐      ┌──────────────────┐         ┌─────┘
  │  clubs      │      │     users         │         │
  │────────────│      │──────────────────│         │
  │ id     (PK)│◄────│ department_id(FK)│         │
  │ name       │  N:1│ id          (PK) │         │
  │ icon_url   │     │ email       (UQ) │         │
  │ description│     │ password_hash    │         │
  │ owner_id   │◄────│ full_name        │         │
  │ (FK→users) │     │ role             │         │
  │ dept_id    │◄────│ avatar_url       │         │
  │ (FK→depts) │     │ is_verified      │         │
  │ is_active  │     │ is_active        │         │
  │ created_at │     │ created_at       │         │
  └────────────┘     │ updated_at       │         │
                     └────┬─────────────┘         │
                          │                       │
          ┌───────────────┼───────────────────────┼────────────────────────┐
          │               │                       │                        │
          ▼ 1:1           ▼ 1:1                   ▼ 1:N                    ▼ 1:N
   ┌──────────────┐ ┌──────────────┐     ┌──────────────┐       ┌──────────────┐
   │  students    │ │   faculty    │     │    posts      │       │ notifications│
   │──────────────│ │──────────────│     │──────────────│       │──────────────│
   │ id      (PK) │ │ id      (PK) │     │ id      (PK) │       │ id      (PK) │
   │ user_id (FK) │ │ user_id (FK) │     │ author_id(FK)│       │ user_id (FK) │
   │ college_id   │ │ employee_id  │     │ channel_id(FK)│      │ type         │
   │ roll_number  │ │ designation  │     │ club_id  (FK)│       │ title        │
   │ year_of_study│ │ qualification│     │ content      │       │ body         │
   │ section      │ │ join_date    │     │ is_pinned    │       │ ref_type     │
   │ semester     │ │ bio          │     │ is_approved  │       │ ref_id       │
   │ phone        │ │ office_room  │     │ created_at   │       │ is_read      │
   │ admission_yr │ │ created_at   │     │ updated_at   │       │ created_at   │
   └──────────────┘ └──────────────┘     └──────┬───────┘       └──────────────┘
                                                │
                           ┌─────────────────────┼──────────────────────┐
                           │                     │                      │
                           ▼ N:M                 ▼ 1:N                  ▼ 1:N
                    ┌──────────────┐     ┌──────────────┐       ┌──────────────┐
                    │   likes      │     │  comments    │       │  post_images │
                    │──────────────│     │──────────────│       │──────────────│
                    │ id      (PK) │     │ id      (PK) │       │ id      (PK) │
                    │ post_id (FK) │     │ post_id (FK) │       │ post_id (FK) │
                    │ user_id (FK) │     │ author_id(FK)│       │ image_url    │
                    │ created_at   │     │ parent_id(FK)│──┐    │ cloudinary_id│
                    └──────────────┘     │ content      │  │    │ sort_order   │
                                         │ created_at   │  │    │ created_at   │
                                         └──────────────┘  │    └──────────────┘
                                                           │
                              ┌─────────────────────┐      │ self-ref
                              │  channel_messages    │      │
                              │─────────────────────│      │
                              │ id      (PK)        │      │
                              │ channel_id (FK)     │      │
                              │ sender_id  (FK)     │      │
                              │ content             │      │
                              │ image_url           │      │
                              │ created_at          │      │
                              └─────────────────────┘      │
                                                           │
   ┌──────────────┐     ┌──────────────┐    ┌─────────────┴────┐
   │   channels    │     │  announcements│   │ direct_messages   │
   │──────────────│     │──────────────│    │──────────────────│
   │ id      (PK) │     │ id      (PK) │    │ id      (PK)     │
   │ name         │     │ author_id(FK)│    │ sender_id (FK)   │
   │ description  │     │ title        │    │ receiver_id (FK) │
   │ type         │     │ content      │    │ content          │
   │ icon_url     │     │ target_type  │    │ image_url        │
   │ owner_id(FK) │     │ target_value │    │ is_read          │
   │ dept_id (FK) │     │ is_pinned    │    │ is_deleted       │
   │ is_active    │     │ created_at   │    │ created_at       │
   │ created_at   │     └──────────────┘    └──────────────────┘
   └──────┬───────┘
          │
          ▼ 1:N
   ┌──────────────┐
   │channel_members│
   │──────────────│
   │ id      (PK) │
   │ channel_id   │
   │ user_id (FK) │
   │ role         │
   │ joined_at    │
   └──────────────┘

   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │   events      │     │    rsvps     │     │    clubs      │
   │──────────────│     │──────────────│     │──────────────│
   │ id      (PK) │     │ id      (PK) │     │ id      (PK) │
   │ creator_id(FK│     │ event_id(FK) │     │ name         │
   │ title        │     │ user_id (FK) │     │ description  │
   │ description  │     │ status       │     │ icon_url     │
   │ event_date   │     │ created_at   │     │ owner_id(FK) │
   │ end_date     │     └──────────────┘     │ dept_id (FK) │
   │ venue        │                          │ is_active    │
   │ event_type   │                          │ created_at   │
   │ created_at   │                          └──────────────┘
   └──────────────┘

   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │   points      │     │ leaderboard  │     │approval_reqs │
   │──────────────│     │──────────────│     │──────────────│
   │ id      (PK) │     │ id      (PK) │     │ id      (PK) │
   │ user_id (FK) │     │ user_id (FK) │     │ user_id (FK) │
   │ activity_type│     │ total_points │     │ request_type │
   │ points_value │     │ rank         │     │ target_type  │
   │ ref_type     │     │ streak       │     │ target_id    │
   │ ref_id       │     │ updated_at   │     │ status       │
   │ description  │     └──────────────┘     │ reviewed_by  │
   │ created_at   │                          │ review_note  │
   └──────────────┘                          │ created_at   │
                                             │ reviewed_at  │
   ┌──────────────┐                          └──────────────┘
   │activity_logs │
   │──────────────│
   │ id      (PK) │
   │ user_id (FK) │
   │ action       │
   │ entity_type  │
   │ entity_id    │
   │ ip_address   │
   │ user_agent   │
   │ metadata     │
   │ created_at   │
   └──────────────┘

   ┌──────────────┐     ┌────────────────────┐
   │ fcm_tokens    │     │notification_prefs  │
   │──────────────│     │────────────────────│
   │ id      (PK) │     │ id      (PK)       │
   │ user_id (FK) │     │ user_id (FK)       │
   │ token        │     │ push_enabled       │
   │ device_info  │     │ message_notifs     │
   │ created_at   │     │ announcement_notifs│
   └──────────────┘     │ event_notifs       │
                        │ like_notifs        │
                        │ comment_notifs     │
                        └────────────────────┘
```

### 1.2 Visual Relationship Map (Simplified)

```
                    ┌───────────┐
                    │departments│
                    └─────┬─────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
       ┌────────┐   ┌────────┐   ┌────────┐
       │ users  │──▶│students│   │ clubs  │
       └───┬────┘   └────────┘   └────────┘
           │
    ┌──────┼──────────┬──────────┬──────────┐
    ▼      ▼          ▼          ▼          ▼
 posts  channels  messages  events  notifications
    │      │
    ▼      ▼
comments channel_messages
likes    channel_members
images
```

---

## 2. Tables

### 2.1 departments

> Reference table for all college departments.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| name          | VARCHAR(150)             | NO       |                    | Department name (unique)           |
| code          | VARCHAR(20)              | NO       |                    | Short code e.g. "CSE", "ECE"      |
| description   | TEXT                     | YES      | NULL               | Department description             |
| head_id       | UUID                     | YES      | NULL               | FK → users.id (HOD)                |
| is_active     | BOOLEAN                  | NO       | true               | Whether dept is active             |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- UQ: `name`, `code`
- FK: `head_id` → `users.id` ON DELETE SET NULL

---

### 2.2 users

> Central authentication and profile table. All user types share this table.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| email         | VARCHAR(255)             | NO       |                    | Login email (unique)               |
| password_hash | VARCHAR(255)             | NO       |                    | bcrypt hashed password             |
| full_name     | VARCHAR(150)             | NO       |                    | Full display name                  |
| role          | VARCHAR(20)              | NO       | 'student'          | Enum: student, faculty, admin      |
| avatar_url    | TEXT                     | YES      | NULL               | Profile photo (Cloudinary URL)     |
| bio           | VARCHAR(500)             | YES      | NULL               | Short bio                          |
| department_id | UUID                     | YES      | NULL               | FK → departments.id                |
| is_verified   | BOOLEAN                  | NO       | false              | Email verified flag                |
| is_active     | BOOLEAN                  | NO       | true               | Active account flag                |
| last_login_at | TIMESTAMP WITH TIME ZONE | YES      | NULL               | Last login timestamp               |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- UQ: `email`
- CK: `role` IN ('student', 'faculty', 'admin')
- FK: `department_id` → `departments.id` ON DELETE SET NULL

---

### 2.3 students

> Extended profile for student-type users. 1:1 with users where role='student'.

| Column          | Type                     | Nullable | Default            | Description                        |
| --------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id              | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| user_id         | UUID                     | NO       |                    | FK → users.id (unique, 1:1)        |
| college_id      | VARCHAR(50)              | NO       |                    | Unique college enrollment number   |
| roll_number     | VARCHAR(30)              | YES      | NULL               | Class roll number                  |
| year_of_study   | SMALLINT                 | YES      | NULL               | Current year (1-5)                 |
| semester        | SMALLINT                 | YES      | NULL               | Current semester (1-10)            |
| section         | VARCHAR(10)              | YES      | NULL               | Class section (A, B, C...)         |
| phone           | VARCHAR(15)              | YES      | NULL               | Phone number                       |
| admission_year  | SMALLINT                 | YES      | NULL               | Year of admission                  |
| graduation_year | SMALLINT                 | YES      | NULL               | Expected graduation year           |
| created_at      | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at      | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- UQ: `user_id`, `college_id`
- CK: `year_of_study` BETWEEN 1 AND 5
- CK: `semester` BETWEEN 1 AND 10
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.4 faculty

> Extended profile for faculty-type users. 1:1 with users where role='faculty'.

| Column          | Type                     | Nullable | Default            | Description                        |
| --------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id              | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| user_id         | UUID                     | NO       |                    | FK → users.id (unique, 1:1)        |
| employee_id     | VARCHAR(50)              | NO       |                    | Unique employee ID                 |
| designation     | VARCHAR(100)             | YES      | NULL               | e.g. "Professor", "Asst. Professor"|
| qualification   | VARCHAR(255)             | YES      | NULL               | e.g. "Ph.D. in Computer Science"  |
| specialization  | VARCHAR(255)             | YES      | NULL               | Area of specialization             |
| join_date       | DATE                     | YES      | NULL               | Date joined the institution        |
| office_room     | VARCHAR(50)              | YES      | NULL               | Office room number                 |
| phone           | VARCHAR(15)              | YES      | NULL               | Contact number                     |
| created_at      | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at      | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- UQ: `user_id`, `employee_id`
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.5 clubs

> College clubs and organizations.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| name          | VARCHAR(150)             | NO       |                    | Club name (unique)                 |
| description   | TEXT                     | YES      | NULL               | Club description                   |
| icon_url      | TEXT                     | YES      | NULL               | Club logo (Cloudinary URL)         |
| banner_url    | TEXT                     | YES      | NULL               | Club banner image                  |
| owner_id      | UUID                     | NO       |                    | FK → users.id (faculty/admin)      |
| department_id | UUID                     | YES      | NULL               | FK → departments.id                |
| email         | VARCHAR(255)             | YES      | NULL               | Club contact email                 |
| is_active     | BOOLEAN                  | NO       | true               | Whether club is active             |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- UQ: `name`
- FK: `owner_id` → `users.id` ON DELETE RESTRICT
- FK: `department_id` → `departments.id` ON DELETE SET NULL

---

### 2.6 club_members

> Junction table for user-club membership.

| Column     | Type                     | Nullable | Default            | Description                     |
| ---------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id         | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| club_id    | UUID                     | NO       |                    | FK → clubs.id                   |
| user_id    | UUID                     | NO       |                    | FK → users.id                   |
| role       | VARCHAR(20)              | NO       | 'member'           | Enum: owner, admin, member      |
| joined_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When the user joined            |

**Constraints:**
- PK: `id`
- UQ: `(club_id, user_id)`
- CK: `role` IN ('owner', 'admin', 'member')
- FK: `club_id` → `clubs.id` ON DELETE CASCADE
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.7 posts

> User-generated content for the feed.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| author_id     | UUID                     | NO       |                    | FK → users.id                      |
| channel_id    | UUID                     | YES      | NULL               | FK → channels.id (if posted in ch) |
| club_id       | UUID                     | YES      | NULL               | FK → clubs.id (if posted in club)  |
| content       | TEXT                     | NO       |                    | Post text body                     |
| visibility    | VARCHAR(20)              | NO       | 'public'           | Enum: public, department, private  |
| is_pinned     | BOOLEAN                  | NO       | false              | Pinned to top of feed              |
| is_approved   | BOOLEAN                  | NO       | true               | Approval status (for moderated ch) |
| like_count    | INTEGER                  | NO       | 0                  | Denormalized like counter          |
| comment_count | INTEGER                  | NO       | 0                  | Denormalized comment counter       |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- CK: `visibility` IN ('public', 'department', 'private')
- CK: `channel_id IS NULL OR club_id IS NULL` (not both)
- FK: `author_id` → `users.id` ON DELETE CASCADE
- FK: `channel_id` → `channels.id` ON DELETE SET NULL
- FK: `club_id` → `clubs.id` ON DELETE SET NULL

---

### 2.8 post_images

> Multiple images per post.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| post_id       | UUID                     | NO       |                    | FK → posts.id                      |
| image_url     | TEXT                     | NO       |                    | Cloudinary URL                     |
| cloudinary_id | VARCHAR(255)             | YES      | NULL               | Cloudinary public_id for deletion  |
| sort_order    | SMALLINT                 | NO       | 0                  | Display order                      |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |

**Constraints:**
- PK: `id`
- FK: `post_id` → `posts.id` ON DELETE CASCADE
- CK: `sort_order` BETWEEN 0 AND 9

---

### 2.9 comments

> Comments on posts. Supports nested replies (1 level).

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| post_id       | UUID                     | NO       |                    | FK → posts.id                      |
| author_id     | UUID                     | NO       |                    | FK → users.id                      |
| parent_id     | UUID                     | YES      | NULL               | FK → comments.id (self-ref reply)  |
| content       | TEXT                     | NO       |                    | Comment text                       |
| is_deleted    | BOOLEAN                  | NO       | false              | Soft delete flag                   |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- FK: `post_id` → `posts.id` ON DELETE CASCADE
- FK: `author_id` → `users.id` ON DELETE CASCADE
- FK: `parent_id` → `comments.id` ON DELETE CASCADE

---

### 2.10 likes

> Like/unlike reactions on posts. One like per user per post.

| Column     | Type                     | Nullable | Default            | Description                     |
| ---------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id         | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| post_id    | UUID                     | NO       |                    | FK → posts.id                   |
| user_id    | UUID                     | NO       |                    | FK → users.id                   |
| created_at | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When the like was created       |

**Constraints:**
- PK: `id`
- UQ: `(post_id, user_id)` — one like per user per post
- FK: `post_id` → `posts.id` ON DELETE CASCADE
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.11 channels

> Communication channels (public or private).

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| name          | VARCHAR(100)             | NO       |                    | Channel display name               |
| slug          | VARCHAR(100)             | NO       |                    | URL-safe unique slug               |
| description   | TEXT                     | YES      | NULL               | Channel description                |
| type          | VARCHAR(10)              | NO       | 'public'           | Enum: public, private              |
| icon_url      | TEXT                     | YES      | NULL               | Channel icon (Cloudinary URL)      |
| owner_id      | UUID                     | NO       |                    | FK → users.id (creator)            |
| department_id | UUID                     | YES      | NULL               | FK → departments.id                |
| member_count  | INTEGER                  | NO       | 0                  | Denormalized member counter        |
| is_active     | BOOLEAN                  | NO       | true               | Whether channel is active          |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- UQ: `slug`
- CK: `type` IN ('public', 'private')
- FK: `owner_id` → `users.id` ON DELETE RESTRICT
- FK: `department_id` → `departments.id` ON DELETE SET NULL

---

### 2.12 channel_members

> Junction table for channel membership.

| Column     | Type                     | Nullable | Default            | Description                     |
| ---------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id         | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| channel_id | UUID                     | NO       |                    | FK → channels.id                |
| user_id    | UUID                     | NO       |                    | FK → users.id                   |
| role       | VARCHAR(10)              | NO       | 'member'           | Enum: owner, admin, member      |
| joined_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When the user joined            |

**Constraints:**
- PK: `id`
- UQ: `(channel_id, user_id)`
- CK: `role` IN ('owner', 'admin', 'member')
- FK: `channel_id` → `channels.id` ON DELETE CASCADE
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.13 channel_messages

> Messages within a channel.

| Column     | Type                     | Nullable | Default            | Description                     |
| ---------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id         | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| channel_id | UUID                     | NO       |                    | FK → channels.id                |
| sender_id  | UUID                     | NO       |                    | FK → users.id                   |
| content    | TEXT                     | YES      | NULL               | Message text                    |
| image_url  | TEXT                     | YES      | NULL               | Optional image attachment       |
| is_deleted | BOOLEAN                  | NO       | false              | Soft delete flag                |
| created_at | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When the message was sent       |

**Constraints:**
- PK: `id`
- CK: `content IS NOT NULL OR image_url IS NOT NULL` (at least one)
- FK: `channel_id` → `channels.id` ON DELETE CASCADE
- FK: `sender_id` → `users.id` ON DELETE RESTRICT

---

### 2.14 direct_messages

> Private 1:1 messages between users.

| Column      | Type                     | Nullable | Default            | Description                     |
| ----------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id          | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| sender_id   | UUID                     | NO       |                    | FK → users.id                   |
| receiver_id | UUID                     | NO       |                    | FK → users.id                   |
| content     | TEXT                     | YES      | NULL               | Message text                    |
| image_url   | TEXT                     | YES      | NULL               | Optional image attachment       |
| is_read     | BOOLEAN                  | NO       | false              | Read receipt                    |
| is_deleted  | BOOLEAN                  | NO       | false              | Soft delete (sender's side)     |
| created_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When the message was sent       |

**Constraints:**
- PK: `id`
- CK: `sender_id != receiver_id` (no self-messaging)
- CK: `content IS NOT NULL OR image_url IS NOT NULL`
- FK: `sender_id` → `users.id` ON DELETE RESTRICT
- FK: `receiver_id` → `users.id` ON DELETE RESTRICT

---

### 2.15 announcements

> Official announcements from Faculty/Admin.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| author_id     | UUID                     | NO       |                    | FK → users.id (faculty/admin)      |
| title         | VARCHAR(255)             | NO       |                    | Announcement headline              |
| content       | TEXT                     | NO       |                    | Rich text body                     |
| target_type   | VARCHAR(20)              | NO       | 'all'              | Enum: all, department, channel, users |
| target_value  | TEXT                     | YES      | NULL               | Dept name / channel_id / JSON user IDs |
| is_pinned     | BOOLEAN                  | NO       | true               | Pinned at top of feed              |
| is_active     | BOOLEAN                  | NO       | true               | Active/hidden toggle               |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp          |
| updated_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp              |

**Constraints:**
- PK: `id`
- CK: `target_type` IN ('all', 'department', 'channel', 'users')
- FK: `author_id` → `users.id` ON DELETE CASCADE

---

### 2.16 events

> College events, workshops, seminars.

| Column      | Type                     | Nullable | Default            | Description                     |
| ----------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id          | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| creator_id  | UUID                     | NO       |                    | FK → users.id (faculty/admin)   |
| title       | VARCHAR(255)             | NO       |                    | Event title                     |
| description | TEXT                     | YES      | NULL               | Event description               |
| event_date  | TIMESTAMP WITH TIME ZONE | NO       |                    | Start date/time                 |
| end_date    | TIMESTAMP WITH TIME ZONE | YES      | NULL               | End date/time                   |
| venue       | VARCHAR(255)             | YES      | NULL               | Physical location               |
| event_type  | VARCHAR(50)              | NO       | 'general'          | academic, cultural, sports, etc |
| banner_url  | TEXT                     | YES      | NULL               | Event banner image              |
| rsvp_count  | INTEGER                  | NO       | 0                  | Denormalized RSVP counter       |
| created_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp       |
| updated_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp           |

**Constraints:**
- PK: `id`
- CK: `event_date >= NOW()` (no past events on create)
- FK: `creator_id` → `users.id` ON DELETE RESTRICT

---

### 2.17 rsvps

> User RSVP responses to events.

| Column     | Type                     | Nullable | Default            | Description                     |
| ---------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id         | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| event_id   | UUID                     | NO       |                    | FK → events.id                  |
| user_id    | UUID                     | NO       |                    | FK → users.id                   |
| status     | VARCHAR(15)              | NO       |                    | Enum: going, interested, not_going |
| created_at | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp       |
| updated_at | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp           |

**Constraints:**
- PK: `id`
- UQ: `(event_id, user_id)` — one RSVP per user per event
- CK: `status` IN ('going', 'interested', 'not_going')
- FK: `event_id` → `events.id` ON DELETE CASCADE
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.18 notifications

> All user notifications (inbox).

| Column      | Type                     | Nullable | Default            | Description                     |
| ----------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id          | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| user_id     | UUID                     | NO       |                    | FK → users.id (recipient)       |
| type        | VARCHAR(30)              | NO       |                    | Notification category           |
| title       | VARCHAR(255)             | NO       |                    | Notification title              |
| body        | TEXT                     | NO       |                    | Notification body               |
| ref_type    | VARCHAR(30)              | YES      | NULL               | Reference entity type           |
| ref_id      | UUID                     | YES      | NULL               | Reference entity ID             |
| is_read     | BOOLEAN                  | NO       | false              | Read status                     |
| created_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp       |

**Constraints:**
- PK: `id`
- CK: `type` IN ('message', 'announcement', 'event', 'like', 'comment', 'channel_invite', 'approval')
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.19 fcm_tokens

> Firebase Cloud Messaging device tokens per user.

| Column      | Type                     | Nullable | Default            | Description                     |
| ----------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id          | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| user_id     | UUID                     | NO       |                    | FK → users.id                   |
| token       | TEXT                     | NO       |                    | FCM device token (unique)        |
| device_info | VARCHAR(255)             | YES      | NULL               | Browser/device description      |
| is_active   | BOOLEAN                  | NO       | true               | Token active flag                |
| created_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Record creation timestamp       |

**Constraints:**
- PK: `id`
- UQ: `token` (one row per unique FCM token)
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.20 notification_preferences

> Per-user notification toggle settings.

| Column              | Type                     | Nullable | Default            | Description               |
| ------------------- | ------------------------ | -------- | ------------------ | ------------------------- |
| id                  | UUID                     | NO       | uuid_generate_v4() | Primary key               |
| user_id             | UUID                     | NO       |                    | FK → users.id (unique)    |
| push_enabled        | BOOLEAN                  | NO       | true               | Master push toggle        |
| message_notifs      | BOOLEAN                  | NO       | true               | DM notifications          |
| announcement_notifs | BOOLEAN                  | NO       | true               | Announcement notifications|
| event_notifs        | BOOLEAN                  | NO       | true               | Event notifications       |
| like_notifs         | BOOLEAN                  | NO       | true               | Like notifications        |
| comment_notifs      | BOOLEAN                  | NO       | true               | Comment notifications     |
| channel_notifs      | BOOLEAN                  | NO       | true               | Channel message notifs    |
| updated_at          | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last update timestamp     |

**Constraints:**
- PK: `id`
- UQ: `user_id` — one preferences row per user
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.21 points

> Gamification: records of points earned by users.

| Column          | Type                     | Nullable | Default            | Description                     |
| --------------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id              | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| user_id         | UUID                     | NO       |                    | FK → users.id                   |
| activity_type   | VARCHAR(30)              | NO       |                    | What earned the points          |
| points_value    | SMALLINT                 | NO       |                    | Points awarded (+ or -)         |
| ref_type        | VARCHAR(30)              | YES      | NULL               | Related entity type             |
| ref_id          | UUID                     | YES      | NULL               | Related entity ID               |
| description     | VARCHAR(255)             | YES      | NULL               | Human-readable reason           |
| created_at      | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When points were earned         |

**Constraints:**
- PK: `id`
- CK: `activity_type` IN ('post_created', 'comment_added', 'post_liked', 'event_attended', 'announcement_made', 'daily_login', 'streak_bonus', 'penalty', 'admin_adjustment')
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.22 leaderboard

> Aggregated leaderboard (materialized/computed from points).

| Column      | Type                     | Nullable | Default            | Description                     |
| ----------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id          | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| user_id     | UUID                     | NO       |                    | FK → users.id (unique)          |
| total_points| INTEGER                  | NO       | 0                  | Sum of all points               |
| rank        | INTEGER                  | YES      | NULL               | Current rank (NULL = unranked)  |
| streak_days | SMALLINT                 | NO       | 0                  | Consecutive active days         |
| last_active | DATE                     | YES      | NULL               | Last day points were earned     |
| updated_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Last calculation timestamp      |

**Constraints:**
- PK: `id`
- UQ: `user_id` — one leaderboard row per user
- FK: `user_id` → `users.id` ON DELETE CASCADE

---

### 2.23 approval_requests

> Registration approvals or content moderation requests.

| Column        | Type                     | Nullable | Default            | Description                        |
| ------------- | ------------------------ | -------- | ------------------ | ---------------------------------- |
| id            | UUID                     | NO       | uuid_generate_v4() | Primary key                        |
| user_id       | UUID                     | NO       |                    | FK → users.id (requester)          |
| request_type  | VARCHAR(30)              | NO       |                    | Type of request                    |
| target_type   | VARCHAR(30)              | YES      | NULL               | Entity type being approved         |
| target_id     | UUID                     | YES      | NULL               | Entity ID being approved           |
| status        | VARCHAR(15)              | NO       | 'pending'          | Enum: pending, approved, rejected  |
| request_note  | TEXT                     | YES      | NULL               | Requester's note                   |
| reviewed_by   | UUID                     | YES      | NULL               | FK → users.id (admin reviewer)     |
| review_note   | TEXT                     | YES      | NULL               | Reviewer's comment                 |
| created_at    | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | Request submitted timestamp        |
| reviewed_at   | TIMESTAMP WITH TIME ZONE | YES      | NULL               | When reviewed                      |

**Constraints:**
- PK: `id`
- CK: `request_type` IN ('registration', 'channel_create', 'announcement', 'event', 'content_flag')
- CK: `status` IN ('pending', 'approved', 'rejected')
- FK: `user_id` → `users.id` ON DELETE CASCADE
- FK: `reviewed_by` → `users.id` ON DELETE SET NULL

---

### 2.24 activity_logs

> Audit trail for all user actions.

| Column      | Type                     | Nullable | Default            | Description                     |
| ----------- | ------------------------ | -------- | ------------------ | ------------------------------- |
| id          | UUID                     | NO       | uuid_generate_v4() | Primary key                     |
| user_id     | UUID                     | YES      | NULL               | FK → users.id (NULL for system) |
| action      | VARCHAR(50)              | NO       |                    | Action performed                |
| entity_type | VARCHAR(30)              | YES      | NULL               | Target entity type              |
| entity_id   | UUID                     | YES      | NULL               | Target entity ID                |
| ip_address  | INET                     | YES      | NULL               | Client IP address               |
| user_agent  | VARCHAR(500)             | YES      | NULL               | Browser user agent string       |
| metadata    | JSONB                    | YES      | NULL               | Additional context data         |
| created_at  | TIMESTAMP WITH TIME ZONE | NO       | NOW()              | When the action occurred        |

**Constraints:**
- PK: `id`
- CK: `action` IN ('login', 'logout', 'register', 'post_create', 'post_delete', 'comment_create', 'like_toggle', 'message_send', 'channel_create', 'announcement_create', 'event_create', 'profile_update', 'role_change', 'account_ban', 'account_delete')
- FK: `user_id` → `users.id` ON DELETE SET NULL

---

## 3. Relationships Summary

### 3.1 One-to-One (1:1)

| Parent Table | Child Table  | FK Column       | On Delete  | Description                          |
| ------------ | ------------ | --------------- | ---------- | ------------------------------------ |
| users        | students     | students.user_id| CASCADE    | Student profile extends user         |
| users        | faculty      | faculty.user_id | CASCADE    | Faculty profile extends user         |
| users        | notification_preferences | notification_preferences.user_id | CASCADE | One prefs row per user |
| users        | leaderboard  | leaderboard.user_id | CASCADE | One leaderboard row per user         |

### 3.2 One-to-Many (1:N)

| Parent Table | Child Table       | FK Column          | On Delete  | Description                |
| ------------ | ----------------- | ------------------ | ---------- | -------------------------- |
| users        | posts             | posts.author_id    | CASCADE    | User creates many posts    |
| users        | comments          | comments.author_id | CASCADE    | User writes many comments  |
| users        | channels          | channels.owner_id  | RESTRICT   | User owns many channels    |
| users        | announcements     | announcements.author_id | CASCADE | User makes many announcements |
| users        | events            | events.creator_id  | RESTRICT   | User creates many events   |
| users        | direct_messages   | direct_messages.sender_id | RESTRICT | User sends many DMs |
| users        | notifications     | notifications.user_id | CASCADE  | User receives many notifs  |
| users        | fcm_tokens        | fcm_tokens.user_id | CASCADE   | User has many device tokens|
| users        | points            | points.user_id     | CASCADE    | User earns many point records |
| users        | activity_logs     | activity_logs.user_id | SET NULL | User has many log entries  |
| departments  | users             | users.department_id | SET NULL  | Dept has many users        |
| departments  | channels          | channels.department_id | SET NULL | Dept has many channels  |
| departments  | clubs             | clubs.department_id | SET NULL  | Dept has many clubs        |
| posts        | post_images       | post_images.post_id | CASCADE   | Post has many images       |
| posts        | comments          | comments.post_id   | CASCADE   | Post has many comments     |
| posts        | likes             | likes.post_id      | CASCADE   | Post has many likes        |
| channels     | channel_messages  | channel_messages.channel_id | CASCADE | Channel has many messages |
| channels     | channel_members   | channel_members.channel_id | CASCADE | Channel has many members  |
| events       | rsvps             | rsvps.event_id     | CASCADE   | Event has many RSVPs       |
| comments     | comments          | comments.parent_id | CASCADE   | Comment has many replies   |

### 3.3 Many-to-Many (N:M) via Junction

| Entity A  | Entity B  | Junction Table   | FK Columns                      | Description            |
| --------- | --------- | ---------------- | ------------------------------- | ---------------------- |
| users     | channels  | channel_members  | channel_id, user_id             | Users join channels    |
| users     | clubs     | club_members     | club_id, user_id                | Users join clubs       |
| users     | posts     | likes            | post_id, user_id                | Users like posts       |
| users     | events    | rsvps            | event_id, user_id               | Users RSVP to events   |

---

## 4. Indexes

### 4.1 Primary Key Indexes (Automatic)

All `id` columns marked as PK automatically get a clustered unique index.

### 4.2 Unique Constraint Indexes (Automatic)

All `UQ` constraints automatically create a unique index.

### 4.3 Performance Indexes

```sql
-- ============================================================
-- USERS
-- ============================================================
-- Fast login lookup
CREATE INDEX idx_users_email ON users(email);

-- Filter by department
CREATE INDEX idx_users_department_id ON users(department_id);

-- Filter by role
CREATE INDEX idx_users_role ON users(role);

-- Full-text search on name (trigram for LIKE '%query%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_full_name_trgm ON users USING gin(full_name gin_trgm_ops);

-- Active users filter
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

-- ============================================================
-- STUDENTS
-- ============================================================
-- Lookup by college_id
CREATE INDEX idx_students_college_id ON students(college_id);

-- Filter by year
CREATE INDEX idx_students_year_of_study ON students(year_of_study);

-- Filter by semester
CREATE INDEX idx_students_semester ON students(semester);

-- ============================================================
-- DEPARTMENTS
-- ============================================================
-- Search by name
CREATE INDEX idx_departments_name_trgm ON departments USING gin(name gin_trgm_ops);

-- ============================================================
-- POSTS
-- ============================================================
-- Feed query: posts by author
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- Feed query: posts in a channel
CREATE INDEX idx_posts_channel_id ON posts(channel_id) WHERE channel_id IS NOT NULL;

-- Feed query: posts in a club
CREATE INDEX idx_posts_club_id ON posts(club_id) WHERE club_id IS NOT NULL;

-- Feed ordering: newest first
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Pinned posts filter
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned) WHERE is_pinned = true;

-- Approval filter
CREATE INDEX idx_posts_is_approved ON posts(is_approved) WHERE is_approved = true;

-- Full-text search on content
CREATE INDEX idx_posts_content_trgm ON posts USING gin(content gin_trgm_ops);

-- Composite: feed page (author + created_at for "my posts" view)
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);

-- ============================================================
-- POST_IMAGES
-- ============================================================
CREATE INDEX idx_post_images_post_id ON post_images(post_id);

-- ============================================================
-- COMMENTS
-- ============================================================
-- All comments on a post
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Replies to a comment
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Comments by author
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Newest comments first
CREATE INDEX idx_comments_created_at ON comments(post_id, created_at DESC);

-- ============================================================
-- LIKES
-- ============================================================
-- All likes on a post
CREATE INDEX idx_likes_post_id ON likes(post_id);

-- All posts liked by a user
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- ============================================================
-- CHANNELS
-- ============================================================
-- Search by name
CREATE INDEX idx_channels_name_trgm ON channels USING gin(name gin_trgm_ops);

-- Filter by type
CREATE INDEX idx_channels_type ON channels(type);

-- Filter by owner
CREATE INDEX idx_channels_owner_id ON channels(owner_id);

-- Filter by department
CREATE INDEX idx_channels_department_id ON channels(department_id) WHERE department_id IS NOT NULL;

-- Active channels
CREATE INDEX idx_channels_is_active ON channels(is_active) WHERE is_active = true;

-- ============================================================
-- CHANNEL_MEMBERS
-- ============================================================
-- All members of a channel
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);

-- All channels a user belongs to
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);

-- ============================================================
-- CHANNEL_MESSAGES
-- ============================================================
-- Messages in a channel (ordered by time)
CREATE INDEX idx_channel_messages_channel_created ON channel_messages(channel_id, created_at DESC);

-- Messages by sender
CREATE INDEX idx_channel_messages_sender_id ON channel_messages(sender_id);

-- ============================================================
-- DIRECT_MESSAGES
-- ============================================================
-- Conversation between two users (both directions)
CREATE INDEX idx_dm_sender_receiver ON direct_messages(sender_id, receiver_id);
CREATE INDEX idx_dm_receiver_sender ON direct_messages(receiver_id, sender_id);

-- Newest messages first
CREATE INDEX idx_dm_created_at ON direct_messages(created_at DESC);

-- Unread messages for a user
CREATE INDEX idx_dm_receiver_unread ON direct_messages(receiver_id, is_read) WHERE is_read = false;

-- ============================================================
-- CHANNEL_MESSAGES / DIRECT_MESSAGES (text search)
-- ============================================================
CREATE INDEX idx_dm_content_trgm ON direct_messages USING gin(content gin_trgm_ops);
CREATE INDEX idx_cm_content_trgm ON channel_messages USING gin(content gin_trgm_ops);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
-- Announcements by author
CREATE INDEX idx_announcements_author_id ON announcements(author_id);

-- Active pinned announcements
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned, created_at DESC) WHERE is_active = true;

-- Target type filter
CREATE INDEX idx_announcements_target_type ON announcements(target_type);

-- ============================================================
-- EVENTS
-- ============================================================
-- Events by creator
CREATE INDEX idx_events_creator_id ON events(creator_id);

-- Upcoming events
CREATE INDEX idx_events_event_date ON events(event_date) WHERE event_date >= NOW();

-- Event type filter
CREATE INDEX idx_events_event_type ON events(event_type);

-- ============================================================
-- RSVPS
-- ============================================================
-- RSVPs for an event
CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);

-- User's RSVPs
CREATE INDEX idx_rsvps_user_id ON rsvps(user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
-- User's notifications (newest first)
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Unread notifications for a user
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- FCM TOKENS
-- ============================================================
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_token ON fcm_tokens(token) WHERE is_active = true;

-- ============================================================
-- POINTS
-- ============================================================
-- Points earned by a user
CREATE INDEX idx_points_user_id ON points(user_id);

-- Points by activity type
CREATE INDEX idx_points_activity_type ON points(activity_type);

-- Points earned recently
CREATE INDEX idx_points_created_at ON points(created_at DESC);

-- ============================================================
-- LEADERBOARD
-- ============================================================
-- Ranked leaderboard query
CREATE INDEX idx_leaderboard_total_points ON leaderboard(total_points DESC);

-- Streak ranking
CREATE INDEX idx_leaderboard_streak ON leaderboard(streak_days DESC);

-- ============================================================
-- APPROVAL_REQUESTS
-- ============================================================
-- Pending requests for admin
CREATE INDEX idx_approval_requests_status ON approval_requests(status) WHERE status = 'pending';

-- Requests by user
CREATE INDEX idx_approval_requests_user_id ON approval_requests(user_id);

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================
-- Logs by user
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

-- Logs by action
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

-- Logs by entity
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Recent activity logs
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- CLUBS
-- ============================================================
CREATE INDEX idx_clubs_name_trgm ON clubs USING gin(name gin_trgm_ops);
CREATE INDEX idx_clubs_owner_id ON clubs(owner_id);
CREATE INDEX idx_clubs_department_id ON clubs(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_clubs_is_active ON clubs(is_active) WHERE is_active = true;

-- ============================================================
-- CLUB_MEMBERS
-- ============================================================
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
```

---

## 5. Constraints

### 5.1 Check Constraints (Enforced at DB Level)

```sql
-- Role validation on users
ALTER TABLE users ADD CONSTRAINT chk_users_role
    CHECK (role IN ('student', 'faculty', 'admin'));

-- Post visibility
ALTER TABLE posts ADD CONSTRAINT chk_posts_visibility
    CHECK (visibility IN ('public', 'department', 'private'));

-- Post must not belong to both channel and club
ALTER TABLE posts ADD CONSTRAINT chk_posts_scope
    CHECK (NOT (channel_id IS NOT NULL AND club_id IS NOT NULL));

-- Channel type
ALTER TABLE channels ADD CONSTRAINT chk_channels_type
    CHECK (type IN ('public', 'private'));

-- Channel member role
ALTER TABLE channel_members ADD CONSTRAINT chk_channel_members_role
    CHECK (role IN ('owner', 'admin', 'member'));

-- Club member role
ALTER TABLE club_members ADD CONSTRAINT chk_club_members_role
    CHECK (role IN ('owner', 'admin', 'member'));

-- Student year of study
ALTER TABLE students ADD CONSTRAINT chk_students_year
    CHECK (year_of_study IS NULL OR (year_of_study >= 1 AND year_of_study <= 5));

-- Student semester
ALTER TABLE students ADD CONSTRAINT chk_students_semester
    CHECK (semester IS NULL OR (semester >= 1 AND semester <= 10));

-- RSVP status
ALTER TABLE rsvps ADD CONSTRAINT chk_rsvps_status
    CHECK (status IN ('going', 'interested', 'not_going'));

-- Announcement target type
ALTER TABLE announcements ADD CONSTRAINT chk_announcements_target
    CHECK (target_type IN ('all', 'department', 'channel', 'users'));

-- Notification type
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('message', 'announcement', 'event', 'like', 'comment', 'channel_invite', 'approval'));

-- Approval request type
ALTER TABLE approval_requests ADD CONSTRAINT chk_approval_request_type
    CHECK (request_type IN ('registration', 'channel_create', 'announcement', 'event', 'content_flag'));

-- Approval request status
ALTER TABLE approval_requests ADD CONSTRAINT chk_approval_status
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- Points activity type
ALTER TABLE points ADD CONSTRAINT chk_points_activity_type
    CHECK (activity_type IN ('post_created', 'comment_added', 'post_liked', 'event_attended', 'announcement_made', 'daily_login', 'streak_bonus', 'penalty', 'admin_adjustment'));

-- Activity log action
ALTER TABLE activity_logs ADD CONSTRAINT chk_activity_logs_action
    CHECK (action IN ('login', 'logout', 'register', 'post_create', 'post_delete', 'comment_create', 'like_toggle', 'message_send', 'channel_create', 'announcement_create', 'event_create', 'profile_update', 'role_change', 'account_ban', 'account_delete'));

-- DM: no self-messaging
ALTER TABLE direct_messages ADD CONSTRAINT chk_dm_no_self
    CHECK (sender_id != receiver_id);

-- DM: must have content or image
ALTER TABLE direct_messages ADD CONSTRAINT chk_dm_content
    CHECK (content IS NOT NULL OR image_url IS NOT NULL);

-- Channel message: must have content or image
ALTER TABLE channel_messages ADD CONSTRAINT chk_cm_content
    CHECK (content IS NOT NULL OR image_url IS NOT NULL);

-- Post image sort order
ALTER TABLE post_images ADD CONSTRAINT chk_post_images_order
    CHECK (sort_order >= 0 AND sort_order <= 9);

-- Student admission year reasonable
ALTER TABLE students ADD CONSTRAINT chk_students_admission_year
    CHECK (admission_year IS NULL OR (admission_year >= 2000 AND admission_year <= 2100));

-- Post image limit (application-level enforced, but DB constraint as backup)
-- This requires a trigger (see below)
```

### 5.2 Trigger: Max 10 Images Per Post

```sql
CREATE OR REPLACE FUNCTION check_post_image_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM post_images WHERE post_id = NEW.post_id) >= 10 THEN
        RAISE EXCEPTION 'Maximum 10 images per post';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_image_limit
    BEFORE INSERT ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION check_post_image_limit();
```

### 5.3 Trigger: Auto-Update Denormalized Counters

```sql
-- Like count on posts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_count_insert
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER trg_like_count_delete
    AFTER DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();

-- Comment count on posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_count_insert
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comment_count();

CREATE TRIGGER trg_comment_count_delete
    AFTER DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comment_count();

-- Member count on channels
CREATE OR REPLACE FUNCTION update_channel_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE channels SET member_count = member_count + 1 WHERE id = NEW.channel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE channels SET member_count = member_count - 1 WHERE id = OLD.channel_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_channel_member_count_insert
    AFTER INSERT ON channel_members
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_member_count();

CREATE TRIGGER trg_channel_member_count_delete
    AFTER DELETE ON channel_members
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_member_count();

-- RSVP count on events
CREATE OR REPLACE FUNCTION update_event_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events SET rsvp_count = rsvp_count - 1 WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rsvp_count_insert
    AFTER INSERT ON rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_event_rsvp_count();

CREATE TRIGGER trg_rsvp_count_delete
    AFTER DELETE ON rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_event_rsvp_count();
```

### 5.4 Trigger: Auto-Update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_faculty_updated_at BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_clubs_updated_at BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rsvps_updated_at BEFORE UPDATE ON rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notification_prefs_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_leaderboard_updated_at BEFORE UPDATE ON leaderboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Normalization Analysis

### 6.1 First Normal Form (1NF)

**Rule:** Each column contains atomic values; no repeating groups.

| Table          | 1NF Status | Notes                                                     |
| -------------- | ---------- | --------------------------------------------------------- |
| users          | Compliant  | All fields are atomic (single email, single name)         |
| students       | Compliant  | Each column holds one value                               |
| posts          | Compliant  | Content is a single text field; images are in post_images  |
| post_images    | Compliant  | One image per row (not an array)                          |
| comments       | Compliant  | One comment per row; replies use parent_id (not nesting)  |
| likes          | Compliant  | One like per row                                          |
| channels       | Compliant  | All atomic fields                                         |
| channel_members| Compliant  | One membership per row                                    |
| direct_messages| Compliant  | One message per row                                       |
| announcements  | Compliant  | target_value stores a single value (or JSON for 'users') |
| events         | Compliant  | All atomic                                                |
| rsvps          | Compliant  | One RSVP per row                                          |
| notifications  | Compliant  | One notification per row                                  |
| points         | Compliant  | One points record per row                                 |
| leaderboard    | Compliant  | One row per user, all atomic                              |
| approval_requests | Compliant | One request per row                                    |
| activity_logs  | Compliant  | One log entry per row; metadata uses JSONB (acceptable)   |

**Verdict: All tables satisfy 1NF.**

### 6.2 Second Normal Form (2NF)

**Rule:** 1NF + no partial dependencies (all non-key attributes depend on the full primary key).

All tables use single-column UUID primary keys. There are no composite primary keys, so partial dependency is impossible.

| Table          | 2NF Status | Notes                                              |
| -------------- | ---------- | -------------------------------------------------- |
| All tables     | Compliant  | Single UUID PK on every table; no composite keys   |

**Verdict: All tables satisfy 2NF.**

### 6.3 Third Normal Form (3NF)

**Rule:** 2NF + no transitive dependencies (non-key attributes depend only on the PK, not on other non-key attributes).

| Table          | 3NF Status | Potential Transitive Dependency                     | Resolution                       |
| -------------- | ---------- | --------------------------------------------------- | -------------------------------- |
| users          | Compliant  | `department_id` → department data                   | FK reference, not embedded       |
| students       | Compliant  | No transitive dependencies                          | All fields relate to the student |
| posts          | Compliant  | `author_id` → user data, `channel_id` → channel data | FK references only            |
| channels       | Compliant  | `owner_id` → user data                              | FK reference only                |
| announcements  | Compliant  | `author_id` → user data                             | FK reference only                |
| events         | Compliant  | `creator_id` → user data                            | FK reference only                |
| leaderboard    | Compliant  | `total_points` could be computed from points table  | **Denormalized intentionally** — see below |
| points         | Compliant  | No transitive dependencies                          | Each field depends on `id`       |

**Leaderboard Denormalization Note:**

The `leaderboard` table is an **intentional denormalization**. The `total_points` and `rank` values can be computed from the `points` table via aggregation:

```sql
-- This query computes what leaderboard stores:
SELECT user_id, SUM(points_value) as total_points
FROM points
GROUP BY user_id
ORDER BY total_points DESC;
```

**Why denormalize?**
1. Leaderboard queries are frequent (every page load on leaderboard view)
2. Computing `SUM()` over millions of point records is expensive
3. Rank requires window functions (`RANK() OVER (ORDER BY total_points DESC)`)
4. The leaderboard is updated via triggers when points are added/removed
5. This is a standard OLAP-style denormalization for read-heavy aggregated data

**Verdict: All tables satisfy 3NF, with one intentional denormalization (leaderboard).**

### 6.4 Boyce-Codd Normal Form (BCNF)

**Rule:** For every functional dependency X → Y, X must be a superkey.

| Table          | BCNF Status | Notes                                                  |
| -------------- | ----------- | ------------------------------------------------------ |
| users          | Compliant   | `email` → all user fields; email is unique (superkey)  |
| students       | Compliant   | `user_id` → all student fields; user_id is unique      |
| faculty        | Compliant   | `user_id` → all faculty fields; user_id is unique      |
| posts          | Compliant   | `id` → all fields; id is PK                            |
| comments       | Compliant   | `id` → all fields; id is PK                            |
| likes          | Compliant   | `id` → all fields; UQ constraint on (post_id, user_id) |
| All others     | Compliant   | All functional dependencies have superkey determinants  |

**Verdict: All tables satisfy BCNF.**

### 6.5 Denormalization Summary

| Table          | Denormalized Field  | Source                  | Update Method        | Purpose             |
| -------------- | ------------------- | ----------------------- | -------------------- | ------------------- |
| posts          | like_count          | COUNT(likes)            | Trigger              | Fast feed display   |
| posts          | comment_count       | COUNT(comments)         | Trigger              | Fast feed display   |
| channels       | member_count        | COUNT(channel_members)  | Trigger              | Fast channel listing|
| events         | rsvp_count          | COUNT(rsvps)            | Trigger              | Fast event display  |
| leaderboard    | total_points        | SUM(points)             | Trigger / Cron       | Fast leaderboard    |
| leaderboard    | rank                | RANK() OVER (...)       | Cron job             | Fast rank display   |

All denormalized counters are maintained via PostgreSQL triggers (see Section 5.3). Leaderboard rank is refreshed via a scheduled job (daily or on-demand).

---

## 7. SQL Migration

### 7.1 Enable Extensions

```sql
-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 7.2 Create Tables (Ordered by Dependencies)

```sql
-- ============================================================
-- 1. departments
-- ============================================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    head_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'faculty', 'admin')),
    avatar_url TEXT,
    bio VARCHAR(500),
    department_id UUID,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_head
    FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
    ADD CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ============================================================
-- 3. students
-- ============================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    college_id VARCHAR(50) NOT NULL UNIQUE,
    roll_number VARCHAR(30),
    year_of_study SMALLINT CHECK (year_of_study IS NULL OR (year_of_study >= 1 AND year_of_study <= 5)),
    semester SMALLINT CHECK (semester IS NULL OR (semester >= 1 AND semester <= 10)),
    section VARCHAR(10),
    phone VARCHAR(15),
    admission_year SMALLINT CHECK (admission_year IS NULL OR (admission_year >= 2000 AND admission_year <= 2100)),
    graduation_year SMALLINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE students
    ADD CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 4. faculty
-- ============================================================
CREATE TABLE faculty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100),
    qualification VARCHAR(255),
    specialization VARCHAR(255),
    join_date DATE,
    office_room VARCHAR(50),
    phone VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE faculty
    ADD CONSTRAINT fk_faculty_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 5. clubs
-- ============================================================
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    owner_id UUID NOT NULL,
    department_id UUID,
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE clubs
    ADD CONSTRAINT fk_clubs_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE clubs
    ADD CONSTRAINT fk_clubs_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ============================================================
-- 6. club_members
-- ============================================================
CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

ALTER TABLE club_members
    ADD CONSTRAINT fk_club_members_club
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE club_members
    ADD CONSTRAINT fk_club_members_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 7. channels
-- ============================================================
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(10) NOT NULL DEFAULT 'public'
        CHECK (type IN ('public', 'private')),
    icon_url TEXT,
    owner_id UUID NOT NULL,
    department_id UUID,
    member_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE channels
    ADD CONSTRAINT fk_channels_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE channels
    ADD CONSTRAINT fk_channels_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ============================================================
-- 8. channel_members
-- ============================================================
CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

ALTER TABLE channel_members
    ADD CONSTRAINT fk_channel_members_channel
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
ALTER TABLE channel_members
    ADD CONSTRAINT fk_channel_members_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 9. posts
-- ============================================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL,
    channel_id UUID,
    club_id UUID,
    content TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'department', 'private')),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (NOT (channel_id IS NOT NULL AND club_id IS NOT NULL))
);

ALTER TABLE posts
    ADD CONSTRAINT fk_posts_author
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE posts
    ADD CONSTRAINT fk_posts_channel
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL;
ALTER TABLE posts
    ADD CONSTRAINT fk_posts_club
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- ============================================================
-- 10. post_images
-- ============================================================
CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    cloudinary_id VARCHAR(255),
    sort_order SMALLINT NOT NULL DEFAULT 0
        CHECK (sort_order >= 0 AND sort_order <= 9),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE post_images
    ADD CONSTRAINT fk_post_images_post
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- ============================================================
-- 11. comments
-- ============================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    author_id UUID NOT NULL,
    parent_id UUID,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE comments
    ADD CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE comments
    ADD CONSTRAINT fk_comments_author
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comments
    ADD CONSTRAINT fk_comments_parent
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;

-- ============================================================
-- 12. likes
-- ============================================================
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

ALTER TABLE likes
    ADD CONSTRAINT fk_likes_post
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE likes
    ADD CONSTRAINT fk_likes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 13. channel_messages
-- ============================================================
CREATE TABLE channel_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT,
    image_url TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

ALTER TABLE channel_messages
    ADD CONSTRAINT fk_channel_messages_channel
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
ALTER TABLE channel_messages
    ADD CONSTRAINT fk_channel_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================
-- 14. direct_messages
-- ============================================================
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    content TEXT,
    image_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (sender_id != receiver_id),
    CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

ALTER TABLE direct_messages
    ADD CONSTRAINT fk_dm_sender
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE direct_messages
    ADD CONSTRAINT fk_dm_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================
-- 15. announcements
-- ============================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_type VARCHAR(20) NOT NULL DEFAULT 'all'
        CHECK (target_type IN ('all', 'department', 'channel', 'users')),
    target_value TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE announcements
    ADD CONSTRAINT fk_announcements_author
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 16. events
-- ============================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    venue VARCHAR(255),
    event_type VARCHAR(50) NOT NULL DEFAULT 'general',
    banner_url TEXT,
    rsvp_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE events
    ADD CONSTRAINT fk_events_creator
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================
-- 17. rsvps
-- ============================================================
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(15) NOT NULL
        CHECK (status IN ('going', 'interested', 'not_going')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE rsvps
    ADD CONSTRAINT fk_rsvps_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE rsvps
    ADD CONSTRAINT fk_rsvps_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 18. notifications
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('message', 'announcement', 'event', 'like', 'comment', 'channel_invite', 'approval')),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    ref_type VARCHAR(30),
    ref_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 19. fcm_tokens
-- ============================================================
CREATE TABLE fcm_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_info VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE fcm_tokens
    ADD CONSTRAINT fk_fcm_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 20. notification_preferences
-- ============================================================
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    message_notifs BOOLEAN NOT NULL DEFAULT true,
    announcement_notifs BOOLEAN NOT NULL DEFAULT true,
    event_notifs BOOLEAN NOT NULL DEFAULT true,
    like_notifs BOOLEAN NOT NULL DEFAULT true,
    comment_notifs BOOLEAN NOT NULL DEFAULT true,
    channel_notifs BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences
    ADD CONSTRAINT fk_notif_prefs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 21. points
-- ============================================================
CREATE TABLE points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(30) NOT NULL
        CHECK (activity_type IN ('post_created', 'comment_added', 'post_liked', 'event_attended', 'announcement_made', 'daily_login', 'streak_bonus', 'penalty', 'admin_adjustment')),
    points_value SMALLINT NOT NULL,
    ref_type VARCHAR(30),
    ref_id UUID,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE points
    ADD CONSTRAINT fk_points_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 22. leaderboard
-- ============================================================
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    total_points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    streak_days SMALLINT NOT NULL DEFAULT 0,
    last_active DATE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE leaderboard
    ADD CONSTRAINT fk_leaderboard_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 23. approval_requests
-- ============================================================
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    request_type VARCHAR(30) NOT NULL
        CHECK (request_type IN ('registration', 'channel_create', 'announcement', 'event', 'content_flag')),
    target_type VARCHAR(30),
    target_id UUID,
    status VARCHAR(15) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    request_note TEXT,
    reviewed_by UUID,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE approval_requests
    ADD CONSTRAINT fk_approval_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE approval_requests
    ADD CONSTRAINT fk_approval_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 24. activity_logs
-- ============================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(50) NOT NULL
        CHECK (action IN ('login', 'logout', 'register', 'post_create', 'post_delete', 'comment_create', 'like_toggle', 'message_send', 'channel_create', 'announcement_create', 'event_create', 'profile_update', 'role_change', 'account_ban', 'account_delete')),
    entity_type VARCHAR(30),
    entity_id UUID,
    ip_address INET,
    user_agent VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE activity_logs
    ADD CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

### 7.3 Create All Indexes

*(See Section 4 for the complete index listing.)*

---

## 8. SQLAlchemy Models

### 8.1 `backend/app/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 8.2 `backend/app/models/user.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    avatar_url = Column(Text, nullable=True)
    bio = Column(String(500), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    faculty_profile = relationship("Faculty", back_populates="user", uselist=False, cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    owned_channels = relationship("Channel", back_populates="owner", foreign_keys="Channel.owner_id")
    channel_memberships = relationship("ChannelMember", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("DirectMessage", back_populates="sender", foreign_keys="DirectMessage.sender_id")
    received_messages = relationship("DirectMessage", back_populates="receiver", foreign_keys="DirectMessage.receiver_id")
    announcements = relationship("Announcement", back_populates="author", cascade="all, delete-orphan")
    created_events = relationship("Event", back_populates="creator", foreign_keys="Event.creator_id")
    rsvps = relationship("RSVP", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    fcm_tokens = relationship("FCMToken", back_populates="user", cascade="all, delete-orphan")
    notification_prefs = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    points = relationship("Point", back_populates="user", cascade="all, delete-orphan")
    leaderboard_entry = relationship("Leaderboard", back_populates="user", uselist=False, cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user")
    owned_clubs = relationship("Club", back_populates="owner", foreign_keys="Club.owner_id")
    club_memberships = relationship("ClubMember", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("role IN ('student', 'faculty', 'admin')", name="chk_users_role"),
    )

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college_id = Column(String(50), unique=True, nullable=False, index=True)
    roll_number = Column(String(30), nullable=True)
    year_of_study = Column(SmallInteger, nullable=True)
    semester = Column(SmallInteger, nullable=True)
    section = Column(String(10), nullable=True)
    phone = Column(String(15), nullable=True)
    admission_year = Column(SmallInteger, nullable=True)
    graduation_year = Column(SmallInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student_profile")

    __table_args__ = (
        CheckConstraint("year_of_study IS NULL OR (year_of_study >= 1 AND year_of_study <= 5)", name="chk_students_year"),
        CheckConstraint("semester IS NULL OR (semester >= 1 AND semester <= 10)", name="chk_students_semester"),
        CheckConstraint("admission_year IS NULL OR (admission_year >= 2000 AND admission_year <= 2100)", name="chk_students_admission_year"),
    )

    def __repr__(self):
        return f"<Student {self.college_id}>"


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    designation = Column(String(100), nullable=True)
    qualification = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)
    join_date = Column(DateTime(timezone=True), nullable=True)
    office_room = Column(String(50), nullable=True)
    phone = Column(String(15), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="faculty_profile")

    def __repr__(self):
        return f"<Faculty {self.employee_id}>"
```

### 8.3 `backend/app/models/department.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    head_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    head = relationship("User", foreign_keys=[head_id])
    users = relationship("User", back_populates="department", foreign_keys="User.department_id")
    channels = relationship("Channel", back_populates="department", foreign_keys="Channel.department_id")
    clubs = relationship("Club", back_populates="department", foreign_keys="Club.department_id")

    def __repr__(self):
        return f"<Department {self.code}>"
```

### 8.4 `backend/app/models/club.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon_url = Column(Text, nullable=True)
    banner_url = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    email = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_clubs")
    department = relationship("Department", back_populates="clubs", foreign_keys=[department_id])
    members = relationship("ClubMember", back_populates="club", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="club", foreign_keys="Post.club_id")

    def __repr__(self):
        return f"<Club {self.name}>"


class ClubMember(Base):
    __tablename__ = "club_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    club = relationship("Club", back_populates="members")
    user = relationship("User", back_populates="club_memberships")

    __table_args__ = (
        UniqueConstraint("club_id", "user_id", name="uq_club_members_club_user"),
        CheckConstraint("role IN ('owner', 'admin', 'member')", name="chk_club_members_role"),
    )

    def __repr__(self):
        return f"<ClubMember club={self.club_id} user={self.user_id}>"
```

### 8.5 `backend/app/models/post.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger, Integer,
    ForeignKey, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="SET NULL"), nullable=True, index=True)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    visibility = Column(String(20), nullable=False, default="public")
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_approved = Column(Boolean, nullable=False, default=True)
    like_count = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author = relationship("User", back_populates="posts", foreign_keys=[author_id])
    channel = relationship("Channel", back_populates="posts", foreign_keys=[channel_id])
    club = relationship("Club", back_populates="posts", foreign_keys=[club_id])
    images = relationship("PostImage", back_populates="post", cascade="all, delete-orphan", order_by="PostImage.sort_order")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("visibility IN ('public', 'department', 'private')", name="chk_posts_visibility"),
        CheckConstraint("NOT (channel_id IS NOT NULL AND club_id IS NOT NULL)", name="chk_posts_scope"),
    )

    def __repr__(self):
        return f"<Post {self.id} by {self.author_id}>"


class PostImage(Base):
    __tablename__ = "post_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    cloudinary_id = Column(String(255), nullable=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="images")

    __table_args__ = (
        CheckConstraint("sort_order >= 0 AND sort_order <= 9", name="chk_post_images_order"),
    )

    def __repr__(self):
        return f"<PostImage {self.id} for post {self.post_id}>"


class Like(Base):
    __tablename__ = "likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_likes_post_user"),
    )

    def __repr__(self):
        return f"<Like post={self.post_id} user={self.user_id}>"
```

### 8.6 `backend/app/models/comment.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="comments", foreign_keys=[post_id])
    author = relationship("User", back_populates="comments", foreign_keys=[author_id])
    parent = relationship("Comment", remote_side="Comment.id", backref="replies")

    def __repr__(self):
        return f"<Comment {self.id} on post {self.post_id}>"
```

### 8.7 `backend/app/models/channel.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Channel(Base):
    __tablename__ = "channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(10), nullable=False, default="public", index=True)
    icon_url = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    member_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_channels")
    department = relationship("Department", back_populates="channels", foreign_keys=[department_id])
    members = relationship("ChannelMember", back_populates="channel", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="channel", foreign_keys="Post.channel_id")
    messages = relationship("ChannelMessage", back_populates="channel", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("type IN ('public', 'private')", name="chk_channels_type"),
    )

    def __repr__(self):
        return f"<Channel {self.slug} ({self.type})>"


class ChannelMember(Base):
    __tablename__ = "channel_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False, default="member")
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    channel = relationship("Channel", back_populates="members")
    user = relationship("User", back_populates="channel_memberships")

    __table_args__ = (
        UniqueConstraint("channel_id", "user_id", name="uq_channel_members_channel_user"),
        CheckConstraint("role IN ('owner', 'admin', 'member')", name="chk_channel_members_role"),
    )

    def __repr__(self):
        return f"<ChannelMember channel={self.channel_id} user={self.user_id}>"


class ChannelMessage(Base):
    __tablename__ = "channel_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    channel = relationship("Channel", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])

    __table_args__ = (
        CheckConstraint("content IS NOT NULL OR image_url IS NOT NULL", name="chk_cm_content"),
    )

    def __repr__(self):
        return f"<ChannelMessage {self.id} in {self.channel_id}>"
```

### 8.8 `backend/app/models/message.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])

    __table_args__ = (
        CheckConstraint("sender_id != receiver_id", name="chk_dm_no_self"),
        CheckConstraint("content IS NOT NULL OR image_url IS NOT NULL", name="chk_dm_content"),
    )

    def __repr__(self):
        return f"<DirectMessage {self.id} from {self.sender_id} to {self.receiver_id}>"
```

### 8.9 `backend/app/models/announcement.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    target_type = Column(String(20), nullable=False, default="all")
    target_value = Column(Text, nullable=True)
    is_pinned = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author = relationship("User", back_populates="announcements", foreign_keys=[author_id])

    __table_args__ = (
        CheckConstraint("target_type IN ('all', 'department', 'channel', 'users')", name="chk_announcements_target"),
    )

    def __repr__(self):
        return f"<Announcement {self.title}>"
```

### 8.10 `backend/app/models/event.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Integer,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    venue = Column(String(255), nullable=True)
    event_type = Column(String(50), nullable=False, default="general", index=True)
    banner_url = Column(Text, nullable=True)
    rsvp_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_events")
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Event {self.title}>"


class RSVP(Base):
    __tablename__ = "rsvps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(15), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="rsvps")
    user = relationship("User", back_populates="rsvps")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_rsvps_event_user"),
        CheckConstraint("status IN ('going', 'interested', 'not_going')", name="chk_rsvps_status"),
    )

    def __repr__(self):
        return f"<RSVP event={self.event_id} user={self.user_id} status={self.status}>"
```

### 8.11 `backend/app/models/notification.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(30), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    ref_type = Column(String(30), nullable=True)
    ref_id = Column(UUID(as_uuid=True), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        CheckConstraint(
            "type IN ('message', 'announcement', 'event', 'like', 'comment', 'channel_invite', 'approval')",
            name="chk_notifications_type"
        ),
    )

    def __repr__(self):
        return f"<Notification {self.type} for {self.user_id}>"


class FCMToken(Base):
    __tablename__ = "fcm_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(Text, unique=True, nullable=False)
    device_info = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="fcm_tokens")

    def __repr__(self):
        return f"<FCMToken user={self.user_id}>"


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    push_enabled = Column(Boolean, nullable=False, default=True)
    message_notifs = Column(Boolean, nullable=False, default=True)
    announcement_notifs = Column(Boolean, nullable=False, default=True)
    event_notifs = Column(Boolean, nullable=False, default=True)
    like_notifs = Column(Boolean, nullable=False, default=True)
    comment_notifs = Column(Boolean, nullable=False, default=True)
    channel_notifs = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notification_prefs")

    def __repr__(self):
        return f"<NotificationPreference user={self.user_id}>"
```

### 8.12 `backend/app/models/points.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Integer, SmallInteger,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Point(Base):
    __tablename__ = "points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(30), nullable=False, index=True)
    points_value = Column(SmallInteger, nullable=False)
    ref_type = Column(String(30), nullable=True)
    ref_id = Column(UUID(as_uuid=True), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="points")

    __table_args__ = (
        CheckConstraint(
            "activity_type IN ('post_created', 'comment_added', 'post_liked', 'event_attended', 'announcement_made', 'daily_login', 'streak_bonus', 'penalty', 'admin_adjustment')",
            name="chk_points_activity_type"
        ),
    )

    def __repr__(self):
        return f"<Point {self.points_value} for {self.activity_type}>"


class Leaderboard(Base):
    __tablename__ = "leaderboard"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_points = Column(Integer, nullable=False, default=0, index=True)
    rank = Column(Integer, nullable=True)
    streak_days = Column(SmallInteger, nullable=False, default=0, index=True)
    last_active = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="leaderboard_entry")

    def __repr__(self):
        return f"<Leaderboard user={self.user_id} points={self.total_points}>"
```

### 8.13 `backend/app/models/approval.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String(30), nullable=False)
    target_type = Column(String(30), nullable=True)
    target_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(15), nullable=False, default="pending", index=True)
    request_note = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        CheckConstraint(
            "request_type IN ('registration', 'channel_create', 'announcement', 'event', 'content_flag')",
            name="chk_approval_request_type"
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="chk_approval_status"
        ),
    )

    def __repr__(self):
        return f"<ApprovalRequest {self.request_type} status={self.status}>"
```

### 8.14 `backend/app/models/activity_log.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(30), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(String(500), nullable=True)
    metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="activity_logs")

    __table_args__ = (
        CheckConstraint(
            "action IN ('login', 'logout', 'register', 'post_create', 'post_delete', 'comment_create', 'like_toggle', 'message_send', 'channel_create', 'announcement_create', 'event_create', 'profile_update', 'role_change', 'account_ban', 'account_delete')",
            name="chk_activity_logs_action"
        ),
    )

    def __repr__(self):
        return f"<ActivityLog {self.action} user={self.user_id}>"
```

### 8.15 `backend/app/models/__init__.py`

```python
from app.database import Base
from app.models.user import User, Student, Faculty
from app.models.department import Department
from app.models.club import Club, ClubMember
from app.models.post import Post, PostImage, Like
from app.models.comment import Comment
from app.models.channel import Channel, ChannelMember, ChannelMessage
from app.models.message import DirectMessage
from app.models.announcement import Announcement
from app.models.event import Event, RSVP
from app.models.notification import Notification, FCMToken, NotificationPreference
from app.models.points import Point, Leaderboard
from app.models.approval import ApprovalRequest
from app.models.activity_log import ActivityLog

__all__ = [
    "Base",
    "User",
    "Student",
    "Faculty",
    "Department",
    "Club",
    "ClubMember",
    "Post",
    "PostImage",
    "Like",
    "Comment",
    "Channel",
    "ChannelMember",
    "ChannelMessage",
    "DirectMessage",
    "Announcement",
    "Event",
    "RSVP",
    "Notification",
    "FCMToken",
    "NotificationPreference",
    "Point",
    "Leaderboard",
    "ApprovalRequest",
    "ActivityLog",
]
```

---

## 9. Seed Data

### 9.1 Departments

```sql
INSERT INTO departments (id, name, code, is_active) VALUES
    (uuid_generate_v4(), 'Computer Science and Engineering', 'CSE', true),
    (uuid_generate_v4(), 'Electronics and Communication Engineering', 'ECE', true),
    (uuid_generate_v4(), 'Electrical and Electronics Engineering', 'EEE', true),
    (uuid_generate_v4(), 'Mechanical Engineering', 'MECH', true),
    (uuid_generate_v4(), 'Civil Engineering', 'CIVIL', true),
    (uuid_generate_v4(), 'Information Technology', 'IT', true),
    (uuid_generate_v4(), 'Chemical Engineering', 'CHEM', true),
    (uuid_generate_v4(), 'Biotechnology', 'BIOTECH', true),
    (uuid_generate_v4(), 'Master of Computer Applications', 'MCA', true),
    (uuid_generate_v4(), 'Master of Business Administration', 'MBA', true),
    (uuid_generate_v4(), 'Administration', 'ADMIN', true);
```

### 9.2 Point Values Configuration (Application-Level)

```python
# backend/app/utils/points_config.py

POINT_VALUES = {
    "post_created":     10,
    "comment_added":    5,
    "post_liked":       2,   # awarded to post author when someone likes
    "event_attended":   20,
    "announcement_made": 15,
    "daily_login":      1,
    "streak_bonus":     5,   # per day of consecutive activity
    "penalty":          -10,
    "admin_adjustment": 0,   # custom value set by admin
}
```

### 9.3 Default Notification Preferences

When a user registers, create their notification preferences:

```python
# In registration service
default_prefs = NotificationPreference(
    user_id=new_user.id,
    push_enabled=True,
    message_notifs=True,
    announcement_notifs=True,
    event_notifs=True,
    like_notifs=True,
    comment_notifs=True,
    channel_notifs=True,
)
db.add(default_prefs)

# Also create leaderboard entry
leaderboard_entry = Leaderboard(
    user_id=new_user.id,
    total_points=0,
    streak_days=0,
)
db.add(leaderboard_entry)
```

---

## Table Count Summary

| #  | Table                     | Type        | Purpose                          |
| -- | ------------------------- | ----------- | -------------------------------- |
| 1  | departments               | Reference   | College departments              |
| 2  | users                     | Core        | Authentication & profiles        |
| 3  | students                  | Extended    | Student-specific data            |
| 4  | faculty                   | Extended    | Faculty-specific data            |
| 5  | clubs                     | Entity      | College clubs                    |
| 6  | club_members              | Junction    | User ↔ Club membership           |
| 7  | posts                     | Core        | Feed content                     |
| 8  | post_images               | Child       | Images on posts                  |
| 9  | comments                  | Core        | Post comments (1-level nested)   |
| 10 | likes                     | Junction    | User ↔ Post reactions            |
| 11 | channels                  | Entity      | Communication channels           |
| 12 | channel_members           | Junction    | User ↔ Channel membership        |
| 13 | channel_messages          | Core        | Channel chat messages            |
| 14 | direct_messages           | Core        | Private 1:1 messages             |
| 15 | announcements             | Core        | Official announcements           |
| 16 | events                    | Entity      | College events                   |
| 17 | rsvps                     | Junction    | User ↔ Event RSVP                |
| 18 | notifications             | Core        | User notification inbox          |
| 19 | fcm_tokens                | System      | Push notification device tokens  |
| 20 | notification_preferences  | Settings    | Per-user notification toggles    |
| 21 | points                    | Gamification| Points earned records            |
| 22 | leaderboard               | Gamification| Aggregated leaderboard           |
| 23 | approval_requests         | Workflow    | Content/user approval flow       |
| 24 | activity_logs             | Audit       | User action audit trail          |

**Total: 24 tables**

---

*End of Database Design — Magnet v1.0*
