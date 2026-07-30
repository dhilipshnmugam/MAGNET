# Magnet API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Versioning

All endpoints are prefixed with `/api/v1`. Future versions will increment the version prefix.

## Authentication

All authenticated endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are JWT-based with two types:

| Token Type | Purpose | Lifetime |
|---|---|---|
| `access_token` | Access protected endpoints | Short-lived |
| `refresh_token` | Obtain new access tokens | Long-lived |

**Roles:** `student` | `faculty` | `admin`

**Standard Response Envelope:**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Paginated Response Envelope:**

```json
{
  "success": true,
  "data": [ ... ],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

---

## Authentication

### `POST /auth/register`

Register a new user account.

- **Auth required:** No
- **Request Body:**

```json
{
  "email": "student@college.edu",
  "password": "securepass123",
  "full_name": "John Doe",
  "department_id": "uuid-or-null",
  "college_id": "string-or-null",
  "employee_id": "string-or-null",
  "designation": "string-or-null",
  "year_of_study": 3,
  "semester": 5,
  "section": "A",
  "phone": "1234567890",
  "admission_year": 2022
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string (email) | Yes | Valid email |
| `password` | string | Yes | 8-128 chars |
| `full_name` | string | Yes | 1-150 chars |
| `department_id` | UUID | No | |
| `college_id` | string | No | Max 50 chars |
| `employee_id` | string | No | Max 50 chars |
| `designation` | string | No | |
| `year_of_study` | int | No | 1-5 |
| `semester` | int | No | 1-10 |
| `section` | string | No | Max 10 chars |
| `phone` | string | No | Max 15 chars |
| `admission_year` | int | No | 2000-2030 |

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "id": "uuid",
    "email": "student@college.edu",
    "full_name": "John Doe",
    "role": "student",
    "avatar_url": null,
    "bio": null,
    "department_id": null,
    "is_verified": false,
    "is_active": true,
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

---

### `POST /auth/login`

Authenticate and receive tokens.

- **Auth required:** No
- **Request Body:**

```json
{
  "email": "student@college.edu",
  "password": "securepass123"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string (email) | Yes |
| `password` | string | Yes |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer"
  }
}
```

---

### `POST /auth/refresh`

Get a new access token using a refresh token.

- **Auth required:** No
- **Request Body:**

```json
{
  "refresh_token": "eyJ..."
}
```

| Field | Type | Required |
|---|---|---|
| `refresh_token` | string | Yes |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer"
  }
}
```

---

### `POST /auth/forgot-password`

Request a password reset email.

- **Auth required:** No
- **Request Body:**

```json
{
  "email": "student@college.edu"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string (email) | Yes |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent",
  "data": null
}
```

---

### `POST /auth/reset-password`

Reset password using a token from the email link.

- **Auth required:** No
- **Request Body:**

```json
{
  "token": "reset-token-from-email",
  "new_password": "newsecurepass123"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `token` | string | Yes | |
| `new_password` | string | Yes | 8-128 chars |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

---

### `GET /auth/me`

Get the currently authenticated user's basic info.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "uuid",
    "email": "student@college.edu",
    "full_name": "John Doe",
    "role": "student",
    "avatar_url": "https://...",
    "bio": "Hello!",
    "department_id": "uuid",
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

---

## Users

### `GET /users/me`

Get the current user's full profile including role-specific data.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@college.edu",
      "full_name": "John Doe",
      "role": "student",
      "avatar_url": "https://...",
      "bio": "Hello!",
      "department_id": "uuid",
      "is_verified": true,
      "is_active": true,
      "created_at": "2026-01-15T10:30:00Z"
    },
    "student": {
      "id": "uuid",
      "user_id": "uuid",
      "college_id": "COL001",
      "roll_number": "CS-2022-042",
      "year_of_study": 3,
      "semester": 5,
      "section": "A",
      "phone": "1234567890",
      "admission_year": 2022,
      "graduation_year": 2026
    },
    "faculty": null
  }
}
```

---

### `PUT /users/me`

Update the current user's basic profile.

- **Auth required:** Yes
- **Request Body:**

```json
{
  "full_name": "John Updated",
  "bio": "Updated bio",
  "avatar_url": "https://new-avatar.url",
  "department_id": "uuid"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `full_name` | string | No | 1-150 chars |
| `bio` | string | No | Max 500 chars |
| `avatar_url` | string | No | |
| `department_id` | UUID | No | |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Profile updated",
  "data": { "id": "uuid", "full_name": "John Updated", "..." : "..." }
}
```

---

### `PUT /users/me/student`

Update the student-specific profile. Only users with role `student` can access this.

- **Auth required:** Yes (student only)
- **Request Body:**

```json
{
  "roll_number": "CS-2022-042",
  "year_of_study": 3,
  "semester": 5,
  "section": "A",
  "phone": "1234567890",
  "graduation_year": 2026
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `roll_number` | string | No | Max 30 chars |
| `year_of_study` | int | No | 1-5 |
| `semester` | int | No | 1-10 |
| `section` | string | No | Max 10 chars |
| `phone` | string | No | Max 15 chars |
| `graduation_year` | int | No | |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Student profile updated",
  "data": null
}
```

---

### `PUT /users/me/faculty`

Update the faculty-specific profile. Only users with role `faculty` can access this.

- **Auth required:** Yes (faculty only)
- **Request Body:**

```json
{
  "designation": "Assistant Professor",
  "qualification": "Ph.D.",
  "specialization": "Machine Learning",
  "office_room": "B-204",
  "phone": "9876543210"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `designation` | string | No | Max 100 chars |
| `qualification` | string | No | Max 255 chars |
| `specialization` | string | No | Max 255 chars |
| `office_room` | string | No | Max 50 chars |
| `phone` | string | No | Max 15 chars |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Faculty profile updated",
  "data": null
}
```

---

### `GET /users/`

List users with optional filters. Paginated.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default | Constraints |
|---|---|---|---|
| `search` | string | null | Search by name/email |
| `department_id` | UUID | null | Filter by department |
| `role` | string | null | `student`, `faculty`, `admin` |
| `page` | int | 1 | >= 1 |
| `page_size` | int | 20 | 1-100 |

- **Response:** `200 OK` (Paginated)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "jane@college.edu",
      "full_name": "Jane Smith",
      "role": "student",
      "avatar_url": null,
      "bio": null,
      "department_id": "uuid",
      "is_verified": true,
      "is_active": true,
      "created_at": "2026-01-20T08:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

---

### `GET /users/{user_id}`

Get a specific user's public profile by ID.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `user_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "uuid",
    "email": "jane@college.edu",
    "full_name": "Jane Smith",
    "role": "student",
    "avatar_url": null,
    "bio": null,
    "department_id": "uuid",
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-01-20T08:00:00Z"
  }
}
```

---

## Posts

### `POST /posts/`

Create a new post.

- **Auth required:** Yes
- **Request Body:**

```json
{
  "content": "Hello Magnet community!",
  "channel_id": "uuid-or-null",
  "club_id": "uuid-or-null",
  "visibility": "public"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | Yes | 1-5000 chars |
| `channel_id` | UUID | No | Post to a channel |
| `club_id` | UUID | No | Post to a club |
| `visibility` | string | No | `public` (default), `department`, `private` |

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Post created",
  "data": {
    "id": "uuid",
    "author_id": "uuid",
    "content": "Hello Magnet community!",
    "channel_id": null,
    "club_id": null,
    "visibility": "public",
    "is_pinned": false,
    "is_approved": true,
    "like_count": 0,
    "comment_count": 0,
    "images": [],
    "author": {
      "id": "uuid",
      "full_name": "John Doe",
      "avatar_url": "https://...",
      "role": "student"
    },
    "is_liked_by_user": false,
    "created_at": "2026-07-13T12:00:00Z",
    "updated_at": "2026-07-13T12:00:00Z"
  }
}
```

---

### `GET /posts/`

Get the feed (paginated). Supports filtering.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filter_type` | string | `"all"` | Feed filter |
| `page` | int | 1 | >= 1 |
| `page_size` | int | 20 | 1-100 |

- **Response:** `200 OK` (Paginated, same `PostOut` schema)

---

### `GET /posts/{post_id}`

Get a single post by ID.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `post_id` | UUID |

- **Response:** `200 OK` (single `PostOut`)

---

### `PUT /posts/{post_id}`

Update a post (owner only).

- **Auth required:** Yes (post author)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `post_id` | UUID |

- **Request Body:**

```json
{
  "content": "Updated post content",
  "visibility": "department"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | No | 1-5000 chars |
| `visibility` | string | No | `public`, `department`, `private` |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Post updated",
  "data": { "..." : "updated PostOut" }
}
```

---

### `DELETE /posts/{post_id}`

Delete a post (owner only).

- **Auth required:** Yes (post author)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `post_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Post deleted",
  "data": null
}
```

---

### `POST /posts/{post_id}/like`

Toggle like on a post. Returns the new like state.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `post_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "liked": true,
    "like_count": 42
  }
}
```

---

### `GET /posts/{post_id}/comments`

Get comments for a post (paginated).

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `post_id` | UUID |

- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated `CommentOut`)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "post_id": "uuid",
      "author_id": "uuid",
      "parent_id": null,
      "content": "Great post!",
      "is_deleted": false,
      "author": {
        "id": "uuid",
        "full_name": "Jane Smith",
        "avatar_url": null,
        "role": "student"
      },
      "reply_count": 2,
      "created_at": "2026-07-13T12:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```

---

### `POST /posts/{post_id}/comments`

Add a comment to a post.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `post_id` | UUID |

- **Request Body:**

```json
{
  "content": "Nice work!",
  "parent_id": "uuid-or-null"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | Yes | 1-2000 chars |
| `parent_id` | UUID | No | For reply threading |

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Comment added",
  "data": {
    "id": "uuid",
    "post_id": "uuid",
    "author_id": "uuid",
    "parent_id": null,
    "content": "Nice work!",
    "is_deleted": false,
    "author": { "..." : "PostAuthorOut" },
    "reply_count": 0,
    "created_at": "2026-07-13T12:35:00Z"
  }
}
```

---

### `DELETE /posts/comments/{comment_id}`

Delete a comment (owner only).

- **Auth required:** Yes (comment author)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `comment_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Comment deleted",
  "data": null
}
```

---

## Messages

### `GET /messages/conversations`

Get all conversations for the current user.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "other_user_id": "uuid",
      "other_user_name": "Jane Smith",
      "other_user_avatar": "https://...",
      "last_message": "Hey, how are you?",
      "last_message_at": "2026-07-13T11:00:00Z",
      "unread_count": 3
    }
  ]
}
```

---

### `GET /messages/conversations/{user_id}`

Get message history with a specific user (paginated).

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `user_id` | UUID |

- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 50 |

- **Response:** `200 OK` (Paginated `MessageOut`, returned in reverse chronological order)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "receiver_id": "uuid",
      "content": "Hey!",
      "image_url": null,
      "is_read": true,
      "is_deleted": false,
      "created_at": "2026-07-13T10:30:00Z"
    }
  ],
  "total": 120,
  "page": 1,
  "page_size": 50,
  "has_next": true
}
```

---

### `POST /messages/`

Send a direct message.

- **Auth required:** Yes
- **Request Body:**

```json
{
  "receiver_id": "uuid",
  "content": "Hello there!",
  "image_url": "https://..."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `receiver_id` | UUID | Yes | |
| `content` | string | No* | Max 5000 chars |
| `image_url` | string | No | |

*At least one of `content` or `image_url` should be provided.

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": "uuid",
    "sender_id": "uuid",
    "receiver_id": "uuid",
    "content": "Hello there!",
    "image_url": null,
    "is_read": false,
    "is_deleted": false,
    "created_at": "2026-07-13T12:00:00Z"
  }
}
```

---

### `PUT /messages/{message_id}/read`

Mark a message as read.

- **Auth required:** Yes (sender or receiver)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `message_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Marked as read",
  "data": null
}
```

---

### `DELETE /messages/{message_id}`

Delete a message (sender only).

- **Auth required:** Yes (message sender)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `message_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Message deleted",
  "data": null
}
```

---

## Channels

### `POST /channels/`

Create a new channel. Only faculty can create channels.

- **Auth required:** Yes (faculty only)
- **Request Body:**

```json
{
  "name": "CS Department",
  "description": "Computer Science department channel",
  "type": "public",
  "department_id": "uuid-or-null"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | 1-100 chars |
| `description` | string | No | |
| `type` | string | No | `public` (default), `private` |
| `department_id` | UUID | No | |

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Channel created",
  "data": {
    "id": "uuid",
    "name": "CS Department",
    "slug": "cs-department",
    "description": "Computer Science department channel",
    "type": "public",
    "icon_url": null,
    "owner_id": "uuid",
    "department_id": "uuid",
    "member_count": 1,
    "is_active": true,
    "is_member": true,
    "user_role": "admin",
    "created_at": "2026-07-13T12:00:00Z"
  }
}
```

---

### `GET /channels/`

List channels the current user can see.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `search` | string | null |
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated `ChannelOut`)

---

### `GET /channels/{channel_id}`

Get channel details.

- **Auth required:** Yes (channel member)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Response:** `200 OK` (single `ChannelOut`)

---

### `PUT /channels/{channel_id}`

Update channel info (owner/admin only).

- **Auth required:** Yes (channel owner or admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Request Body:**

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "icon_url": "https://..."
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string | No |
| `description` | string | No |
| `icon_url` | string | No |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Channel updated",
  "data": { "..." : "ChannelOut" }
}
```

---

### `DELETE /channels/{channel_id}`

Delete a channel (owner only).

- **Auth required:** Yes (channel owner)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Channel deleted",
  "data": null
}
```

---

### `POST /channels/{channel_id}/join`

Join a public channel.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Joined channel",
  "data": null
}
```

---

### `POST /channels/{channel_id}/leave`

Leave a channel.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Left channel",
  "data": null
}
```

---

### `GET /channels/{channel_id}/members`

List all members of a channel.

- **Auth required:** Yes (channel member)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "admin",
      "joined_at": "2026-07-13T12:00:00Z",
      "full_name": "Jane Smith",
      "avatar_url": "https://..."
    }
  ]
}
```

---

### `POST /channels/{channel_id}/members/{user_id}`

Add a member to the channel (owner/admin only).

- **Auth required:** Yes (channel owner or admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |
| `user_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Member added",
  "data": null
}
```

---

### `DELETE /channels/{channel_id}/members/{user_id}`

Remove a member from the channel (owner/admin only).

- **Auth required:** Yes (channel owner or admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |
| `user_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Member removed",
  "data": null
}
```

---

### `GET /channels/{channel_id}/messages`

Get channel message history (paginated, newest first).

- **Auth required:** Yes (channel member)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 50 |

- **Response:** `200 OK` (Paginated `ChannelMessageOut`)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "channel_id": "uuid",
      "sender_id": "uuid",
      "content": "Hello everyone!",
      "image_url": null,
      "is_deleted": false,
      "sender_name": "John Doe",
      "sender_avatar": "https://...",
      "created_at": "2026-07-13T12:00:00Z"
    }
  ],
  "total": 200,
  "page": 1,
  "page_size": 50,
  "has_next": true
}
```

---

### `POST /channels/{channel_id}/messages`

Send a message to a channel.

- **Auth required:** Yes (channel member)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Request Body:**

```json
{
  "content": "Hello everyone!",
  "image_url": "https://..."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | No* | Max 5000 chars |
| `image_url` | string | No | |

*At least one of `content` or `image_url` should be provided.

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": "uuid",
    "channel_id": "uuid",
    "sender_id": "uuid",
    "content": "Hello everyone!",
    "image_url": null,
    "is_deleted": false,
    "sender_name": "John Doe",
    "sender_avatar": "https://...",
    "created_at": "2026-07-13T12:05:00Z"
  }
}
```

---

## Announcements

### `POST /announcements/`

Create an announcement. Only faculty can create announcements.

- **Auth required:** Yes (faculty only)
- **Request Body:**

```json
{
  "title": "Mid-Term Schedule",
  "content": "Mid-terms start on Oct 15th.",
  "target_type": "all",
  "target_value": null
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 1-255 chars |
| `content` | string | Yes | |
| `target_type` | string | No | `all` (default), `department`, `channel`, `users` |
| `target_value` | string | No | ID or slug depending on `target_type` |

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Announcement created",
  "data": {
    "id": "uuid",
    "author_id": "uuid",
    "title": "Mid-Term Schedule",
    "content": "Mid-terms start on Oct 15th.",
    "target_type": "all",
    "target_value": null,
    "is_pinned": false,
    "is_active": true,
    "author_name": "Prof. Smith",
    "author_avatar": "https://...",
    "created_at": "2026-07-13T12:00:00Z"
  }
}
```

---

### `GET /announcements/`

List announcements visible to the current user (paginated).

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated `AnnouncementOut`)

---

### `GET /announcements/{announcement_id}`

Get a single announcement by ID.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `announcement_id` | UUID |

- **Response:** `200 OK` (single `AnnouncementOut`)

---

### `DELETE /announcements/{announcement_id}`

Delete an announcement (author or admin only).

- **Auth required:** Yes (author or admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `announcement_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Announcement deleted",
  "data": null
}
```

---

## Events

### `POST /events/`

Create an event. Only faculty can create events.

- **Auth required:** Yes (faculty only)
- **Request Body:**

```json
{
  "title": "Annual Tech Fest",
  "description": "3-day tech festival",
  "event_date": "2026-10-15T09:00:00Z",
  "end_date": "2026-10-17T18:00:00Z",
  "venue": "Main Auditorium",
  "event_type": "technical",
  "banner_url": "https://..."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 1-255 chars |
| `description` | string | No | |
| `event_date` | datetime | Yes | ISO 8601 |
| `end_date` | datetime | No | ISO 8601 |
| `venue` | string | No | Max 255 chars |
| `event_type` | string | No | Max 50 chars (default: `general`) |
| `banner_url` | string | No | |

- **Response:** `201 Created`

```json
{
  "success": true,
  "message": "Event created",
  "data": {
    "id": "uuid",
    "creator_id": "uuid",
    "title": "Annual Tech Fest",
    "description": "3-day tech festival",
    "event_date": "2026-10-15T09:00:00Z",
    "end_date": "2026-10-17T18:00:00Z",
    "venue": "Main Auditorium",
    "event_type": "technical",
    "banner_url": "https://...",
    "rsvp_count": 0,
    "creator_name": "Prof. Smith",
    "user_rsvp_status": null,
    "created_at": "2026-07-13T12:00:00Z"
  }
}
```

---

### `GET /events/`

List events with optional type filter (paginated).

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `event_type` | string | null |
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated `EventOut`)

---

### `GET /events/{event_id}`

Get a single event by ID.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `event_id` | UUID |

- **Response:** `200 OK` (single `EventOut` with `user_rsvp_status` populated)

---

### `PUT /events/{event_id}`

Update an event (creator or admin only).

- **Auth required:** Yes (event creator or admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `event_id` | UUID |

- **Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "event_date": "2026-10-20T09:00:00Z",
  "end_date": "2026-10-20T18:00:00Z",
  "venue": "New Venue",
  "event_type": "cultural",
  "banner_url": "https://new-banner.url"
}
```

| Field | Type | Required |
|---|---|---|
| `title` | string | No |
| `description` | string | No |
| `event_date` | datetime | No |
| `end_date` | datetime | No |
| `venue` | string | No |
| `event_type` | string | No |
| `banner_url` | string | No |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Event updated",
  "data": { "..." : "updated EventOut" }
}
```

---

### `DELETE /events/{event_id}`

Delete an event (creator or admin only).

- **Auth required:** Yes (event creator or admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `event_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Event deleted",
  "data": null
}
```

---

### `POST /events/{event_id}/rsvp`

RSVP to an event (toggle/update status).

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `event_id` | UUID |

- **Request Body:**

```json
{
  "status": "going"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `status` | string | Yes | `going`, `interested`, `not_going` |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "RSVP updated",
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "user_id": "uuid",
    "status": "going",
    "created_at": "2026-07-13T12:00:00Z"
  }
}
```

---

### `GET /events/{event_id}/rsvps`

Get all RSVPs for an event.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `event_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "user_id": "uuid",
      "status": "going",
      "created_at": "2026-07-13T12:00:00Z"
    }
  ]
}
```

---

## Notifications

### `GET /notifications/`

Get the current user's notifications (paginated).

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | >= 1 |
| `page_size` | int | 20 | 1-100 |
| `unread_only` | bool | false | Filter unread only |
| `type` | string | null | Filter by notification type |

- **Response:** `200 OK` (Paginated `NotificationOut`)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "sender_id": "uuid",
      "type": "like",
      "title": "New Like",
      "body": "Jane liked your post",
      "ref_type": "post",
      "ref_id": "uuid",
      "sender_name": "Jane Smith",
      "sender_avatar": "https://...",
      "is_read": false,
      "created_at": "2026-07-13T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

---

### `GET /notifications/unread-count`

Get the count of unread notifications.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "count": 7
  }
}
```

---

### `PUT /notifications/{notification_id}/read`

Mark a single notification as read.

- **Auth required:** Yes
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `notification_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Marked as read",
  "data": null
}
```

---

### `PUT /notifications/read-all`

Mark all notifications as read.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": null
}
```

---

### `POST /notifications/fcm-token`

Register a Firebase Cloud Messaging token for push notifications.

- **Auth required:** Yes
- **Request Body:**

```json
{
  "token": "fcm-device-token-string",
  "device_info": "iPhone 15 Pro"
}
```

| Field | Type | Required |
|---|---|---|
| `token` | string | Yes |
| `device_info` | string | No |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "FCM token registered",
  "data": null
}
```

---

### `DELETE /notifications/fcm-token`

Remove an FCM token (e.g. on logout).

- **Auth required:** Yes
- **Request Body:**

```json
{
  "token": "fcm-device-token-string"
}
```

| Field | Type | Required |
|---|---|---|
| `token` | string | Yes |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "FCM token removed",
  "data": null
}
```

---

### `GET /notifications/preferences`

Get the current notification preferences.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "push_enabled": true,
    "email_enabled": false,
    "post_notifs": true,
    "like_notifs": true,
    "comment_notifs": true,
    "mention_notifs": true,
    "event_notifs": true,
    "approval_notifs": false,
    "leaderboard_notifs": true,
    "message_notifs": true,
    "announcement_notifs": true,
    "channel_notifs": true
  }
}
```

---

### `PUT /notifications/preferences`

Update notification preferences (partial update).

- **Auth required:** Yes
- **Request Body:** (all fields optional)

```json
{
  "push_enabled": true,
  "email_enabled": true,
  "post_notifs": false,
  "like_notifs": true,
  "comment_notifs": true,
  "mention_notifs": true,
  "event_notifs": true,
  "approval_notifs": false,
  "leaderboard_notifs": false,
  "message_notifs": true,
  "announcement_notifs": true,
  "channel_notifs": true
}
```

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Preferences updated",
  "data": { "..." : "updated NotificationPrefsOut" }
}
```

---

## Search

### `GET /search/`

Global search across users, posts, channels, and events.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default | Constraints |
|---|---|---|---|
| `q` | string | *(required)* | Min 1 char |
| `limit` | int | 10 | 1-50 |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "users": [ { "id": "uuid", "full_name": "Jane", "role": "student", "avatar_url": null } ],
    "posts": [ { "id": "uuid", "content": "Hello...", "author_name": "John" } ],
    "channels": [ { "id": "uuid", "name": "CS Dept" } ],
    "events": [ { "id": "uuid", "title": "Tech Fest" } ]
  }
}
```

---

## Upload

### `POST /upload/image`

Upload an image file.

- **Auth required:** Yes
- **Request:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file | Yes | Image file |
| `folder` | string | No | Storage folder (default: `"magnet"`) |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Image uploaded",
  "data": {
    "url": "https://storage.magnet.app/magnet/abc123.jpg",
    "filename": "abc123.jpg"
  }
}
```

---

## Admin

All admin endpoints require the `admin` role.

### `GET /admin/dashboard`

Get admin dashboard statistics.

- **Auth required:** Yes (admin)
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "total_users": 520,
    "total_students": 480,
    "total_faculty": 35,
    "total_posts": 1200,
    "total_channels": 15,
    "pending_approvals": 3,
    "active_users_today": 89
  }
}
```

---

### `GET /admin/users`

List all users with admin filters (paginated).

- **Auth required:** Yes (admin)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `search` | string | null |
| `role` | string | null |
| `is_active` | bool | null |
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated `UserOut`)

---

### `PUT /admin/users/{user_id}/role`

Change a user's role.

- **Auth required:** Yes (admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `user_id` | UUID |

- **Request Body:**

```json
{
  "role": "faculty"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `role` | string | Yes | `student`, `faculty`, `admin` |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Role updated",
  "data": { "..." : "updated UserOut" }
}
```

---

### `PUT /admin/users/{user_id}/status`

Activate or deactivate a user account.

- **Auth required:** Yes (admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `user_id` | UUID |

- **Request Body:**

```json
{
  "is_active": false
}
```

| Field | Type | Required |
|---|---|---|
| `is_active` | bool | Yes |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Status updated",
  "data": { "..." : "updated UserOut" }
}
```

---

### `DELETE /admin/users/{user_id}`

Permanently delete a user.

- **Auth required:** Yes (admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `user_id` | UUID |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "User deleted",
  "data": null
}
```

---

### `GET /admin/channels`

List all channels with admin view (paginated).

- **Auth required:** Yes (admin)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "CS Department",
      "type": "public",
      "member_count": 45
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```

---

### `GET /admin/approvals`

List pending approval requests (paginated).

- **Auth required:** Yes (admin)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated `ApprovalRequestOut`)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "request_type": "registration",
      "target_type": null,
      "target_id": null,
      "status": "pending",
      "request_note": "New student registration",
      "reviewed_by": null,
      "review_note": null,
      "user_name": "John Doe",
      "created_at": "2026-07-13T12:00:00Z",
      "reviewed_at": null
    }
  ],
  "total": 3,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```

---

### `PUT /admin/approvals/{request_id}`

Approve or reject an approval request.

- **Auth required:** Yes (admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `request_id` | UUID |

- **Request Body:**

```json
{
  "status": "approved",
  "review_note": "Looks good"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `status` | string | Yes | `approved`, `rejected` |
| `review_note` | string | No | |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Request reviewed",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "request_type": "registration",
    "target_type": null,
    "target_id": null,
    "status": "approved",
    "request_note": "New student registration",
    "reviewed_by": "uuid",
    "review_note": "Looks good",
    "user_name": "John Doe",
    "created_at": "2026-07-13T12:00:00Z",
    "reviewed_at": "2026-07-13T14:00:00Z"
  }
}
```

---

## Leaderboard

### `GET /leaderboard/top/students`

Get the top-ranked students.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `limit` | int | 10 (1-100) |
| `department_id` | UUID | null |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "rank": 1,
      "user_id": "uuid",
      "full_name": "John Doe",
      "avatar_url": "https://...",
      "total_points": 1520,
      "department_name": "Computer Science"
    }
  ]
}
```

---

### `GET /leaderboard/top/clubs`

Get the top-ranked clubs.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `limit` | int | 10 (1-100) |
| `department_id` | UUID | null |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "rank": 1,
      "club_id": "uuid",
      "name": "Coding Club",
      "total_points": 3200
    }
  ]
}
```

---

### `GET /leaderboard/top/departments`

Get the top-ranked departments.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `limit` | int | 10 (1-100) |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "rank": 1,
      "department_id": "uuid",
      "name": "Computer Science",
      "total_points": 15000
    }
  ]
}
```

---

### `GET /leaderboard/weekly`

Get weekly leaderboard rankings.

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default | Constraints |
|---|---|---|---|
| `entity_type` | string | `"user"` | `user`, `club`, `department` |
| `limit` | int | 10 | 1-100 |
| `department_id` | UUID | null | |

- **Response:** `200 OK` (array of ranked entities with `weekly_points`)

---

### `GET /leaderboard/monthly`

Get monthly leaderboard rankings.

- **Auth required:** Yes
- **Query Parameters:** Same as `/weekly`.

- **Response:** `200 OK` (array of ranked entities with `monthly_points`)

---

### `GET /leaderboard/yearly`

Get yearly leaderboard rankings.

- **Auth required:** Yes
- **Query Parameters:** Same as `/weekly`.

- **Response:** `200 OK` (array of ranked entities with `yearly_points`)

---

### `GET /leaderboard/overall`

Get all-time leaderboard rankings.

- **Auth required:** Yes
- **Query Parameters:** Same as `/weekly`.

- **Response:** `200 OK` (array of ranked entities with `total_points`)

---

### `GET /leaderboard/me`

Get the current user's own ranking and stats.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "user_id": "uuid",
    "total_points": 420,
    "overall_rank": 15,
    "weekly_points": 50,
    "monthly_points": 180,
    "yearly_points": 420,
    "level": 5
  }
}
```

---

### `GET /leaderboard/points/history`

Get the current user's points earning history (paginated).

- **Auth required:** Yes
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `page_size` | int | 20 |

- **Response:** `200 OK` (Paginated)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "activity_type": "post_created",
      "points_value": 10,
      "ref_type": "post",
      "ref_id": "uuid",
      "description": "Created a new post",
      "created_at": "2026-07-13T12:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

---

### `GET /leaderboard/stats`

Get general leaderboard statistics.

- **Auth required:** Yes
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "total_participants": 480,
    "total_points_awarded": 125000,
    "top_activity": "post_created",
    "average_points_per_user": 260
  }
}
```

---

### `POST /leaderboard/snapshots/{period_type}`

Compute leaderboard snapshots for a given period. Admin only.

- **Auth required:** Yes (admin)
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `period_type` | string |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Computed 480 weekly snapshots",
  "data": null
}
```

---

### `POST /leaderboard/recalculate`

Force a full recalculation of all rankings. Admin only.

- **Auth required:** Yes (admin)
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "All rankings recalculated successfully",
  "data": null
}
```

---

## Analytics

### `GET /analytics/student-growth`

Student enrollment growth over time.

- **Auth required:** Yes (any authenticated user)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `months` | int | 12 (1-36) |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    { "month": "2026-01", "count": 45 },
    { "month": "2026-02", "count": 52 }
  ]
}
```

---

### `GET /analytics/activity-graph`

Platform activity graph (posts, comments, logins per day).

- **Auth required:** Yes (any authenticated user)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `days` | int | 30 (7-365) |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    { "date": "2026-07-01", "logins": 89, "posts": 12, "comments": 34 }
  ]
}
```

---

### `GET /analytics/event-participation`

Event participation trends.

- **Auth required:** Yes (any authenticated user)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `months` | int | 6 (1-24) |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    { "month": "2026-01", "events": 3, "total_rsvps": 120 }
  ]
}
```

---

### `GET /analytics/monthly-statistics`

Current month's summary statistics.

- **Auth required:** Yes (any authenticated user)
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "new_users": 25,
    "posts_created": 80,
    "comments_made": 210,
    "events_hosted": 4,
    "active_users": 150
  }
}
```

---

### `GET /analytics/department-performance`

Performance metrics for all departments. Faculty and admin only.

- **Auth required:** Yes (faculty or admin)
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "department_id": "uuid",
      "name": "Computer Science",
      "student_count": 120,
      "active_users": 85,
      "total_posts": 340,
      "avg_points": 280
    }
  ]
}
```

---

### `GET /analytics/club-performance`

Performance metrics for clubs.

- **Auth required:** Yes (faculty or admin)
- **Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `department_id` | UUID | null |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "club_id": "uuid",
      "name": "Coding Club",
      "member_count": 45,
      "total_points": 3200,
      "events_hosted": 8
    }
  ]
}
```

---

### `GET /analytics/hod-dashboard`

Head of Department dashboard. Faculty only.

- **Auth required:** Yes (faculty)
- **Query Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `department_id` | UUID | Yes |

- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "department_name": "Computer Science",
    "total_students": 120,
    "active_students": 85,
    "top_students": [ { "..." : "user with points" } ],
    "recent_posts": 15,
    "club_stats": [ { "..." : "club with stats" } ]
  }
}
```

---

### `GET /analytics/faculty-dashboard`

Personal dashboard for a faculty member.

- **Auth required:** Yes (faculty)
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "my_channels": 3,
    "my_events": 5,
    "my_announcements": 8,
    "channel_members_reached": 150,
    "pending_approvals": 2
  }
}
```

---

### `GET /analytics/principal-dashboard`

Institution-wide dashboard. Admin only.

- **Auth required:** Yes (admin)
- **Response:** `200 OK`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "total_students": 480,
    "total_faculty": 35,
    "total_posts": 1200,
    "total_events": 60,
    "total_channels": 15,
    "department_rankings": [ { "..." : "department with stats" } ],
    "monthly_growth": [ { "..." : "monthly data" } ]
  }
}
```

---

## WebSocket Endpoints

WebSocket connections use the `ws://` protocol. Authentication is done via a query parameter `token` (the JWT access token).

**Common behavior:**
- Send `{"type": "ping"}` to receive `{"type": "pong"}` (keep-alive)
- Invalid JSON results in `{"type": "error", "message": "Invalid JSON"}`
- Invalid/expired token closes the connection with code `4001`

---

### `WS /ws/notifications`

Real-time notification delivery. The server pushes notification objects when new events occur (likes, comments, mentions, etc.).

- **Auth required:** Yes (via `?token=` query param)
- **Query Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `token` | string | Yes |

**Client to Server:**

```json
{ "type": "ping" }
```

**Server to Client (push):**

```json
{
  "type": "new_notification",
  "id": "uuid",
  "sender_id": "uuid",
  "sender_name": "Jane Smith",
  "sender_avatar": "https://...",
  "type": "like",
  "title": "New Like",
  "body": "Jane liked your post",
  "ref_type": "post",
  "ref_id": "uuid",
  "created_at": "2026-07-13T12:00:00Z"
}
```

---

### `WS /ws/messages`

Real-time direct messaging. Supports sending and receiving messages in real time.

- **Auth required:** Yes (via `?token=` query param)
- **Query Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `token` | string | Yes |

**Client to Server - Send message:**

```json
{
  "type": "message",
  "receiver_id": "uuid",
  "content": "Hey there!",
  "image_url": null
}
```

**Client to Server - Keep alive:**

```json
{ "type": "ping" }
```

**Server to Client (push):**

```json
{
  "type": "new_message",
  "sender_id": "uuid",
  "content": "Hey there!",
  "image_url": null
}
```

---

### `WS /ws/channels/{channel_id}`

Real-time channel messaging. Only members of the channel can connect.

- **Auth required:** Yes (via `?token=` query param + channel membership)
- **Close codes:**
  - `4001` - Invalid token
  - `4003` - Not a channel member
- **Path Parameters:**

| Parameter | Type |
|---|---|
| `channel_id` | UUID |

- **Query Parameters:**

| Parameter | Type | Required |
|---|---|---|
| `token` | string | Yes |

**Client to Server - Send message:**

```json
{
  "type": "message",
  "content": "Hello channel!",
  "image_url": null
}
```

**Client to Server - Keep alive:**

```json
{ "type": "ping" }
```

**Server to Client (push, broadcast to all other members):**

```json
{
  "type": "new_channel_message",
  "channel_id": "uuid",
  "sender_id": "uuid",
  "content": "Hello channel!",
  "image_url": null
}
```

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Missing or invalid token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource does not exist |
| `409` | Conflict - Resource already exists |
| `422` | Unprocessable Entity - Validation error |
| `500` | Internal Server Error |
uhdgdghio