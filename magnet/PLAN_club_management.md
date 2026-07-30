# Club Management System - Implementation Plan

## Current State Analysis

### Backend (What Exists)
- **Club Model** (`models/club.py`): Has basic fields (name, club_code, domain, description, icon_url, banner_url, owner_id, department_id, faculty_coordinator_id, club_admin_id, email, phone, is_active, status). **Missing**: `category`, `club_type` (department/independent).
- **ClubMember Model** (`models/club.py`): Has (id, club_id, user_id, role, joined_at). **Missing**: `status` (pending/approved/rejected), `requested_at`, `approved_at`, `approved_by`.
- **Club Router** (`routers/clubs.py`): Has CRUD endpoints (list, get, create, update, delete, toggle status, assign/remove admin). **Missing**: join/leave/approve members, member listing.
- **Club Service** (`services/club_management_service.py`): Has basic CRUD. **Missing**: member management, join workflow, member listing.
- **Auth Service**: `register_user()` always hardcodes `role="student"` — no way to create club admin accounts during club creation.

### Frontend (What Exists)
- `ManageClubsPage.tsx` — super admin club list with search/filter
- `CreateClubPage.tsx` — super admin club creation form (no club admin creation)
- `ClubDetailsPage.tsx` — super admin read-only club detail
- `ClubDashboardPage.tsx` — analytics dashboard (shared by dept_admin/super_admin/club_admin)
- `PrincipalClubsPage.tsx` — principal analytics view
- No `Club` TypeScript interface (all club data typed as `any`)
- No student-facing club discovery/browse page
- No member management UI

---

## Implementation Steps

### Phase 1: Backend Model Updates

#### 1.1 Update Club Model (`models/club.py`)
Add to Club table:
```python
category = Column(String(50), nullable=True, index=True)  # e.g., "technical", "cultural", "sports"
club_type = Column(String(20), nullable=False, default="department")  # "department" or "independent"
```

#### 1.2 Update ClubMember Model (`models/club.py`)
Add to ClubMember table:
```python
status = Column(String(20), nullable=False, default="approved")  # "pending", "approved", "rejected"
requested_at = Column(DateTime(timezone=True), nullable=True, default=datetime.utcnow)
approved_at = Column(DateTime(timezone=True), nullable=True)
approved_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
```
Update CheckConstraint to include `status IN ('pending', 'approved', 'rejected')`.

### Phase 2: Backend Schema Updates

#### 2.1 Update Club Schemas (`schemas/club.py`)
- Add `category` and `club_type` to `ClubCreate`, `ClubUpdate`, `ClubOut`, `ClubDetailOut`
- Add `ClubMemberOut` schema for returning member data
- Add `ClubAdminCreate` nested schema within `ClubCreate`:
  ```python
  class ClubAdminData(BaseModel):
      full_name: str
      email: EmailStr
      password: str = Field(..., min_length=8)
      phone: Optional[str] = None
  ```
- Update `ClubCreate` to include `admin: Optional[ClubAdminData]` for inline admin creation

### Phase 3: Backend Service Updates

#### 3.1 Update Club Management Service (`services/club_management_service.py`)
- **`create_club()`**: Also create the club admin User (role="club_admin") and optionally add a ClubMember entry for the admin
- **`list_clubs()`**: Fix member_count to actually query counts (currently passes 0). For student-facing list, only return active/approved clubs
- Add **`join_club(db, club_id, user_id)`**: Create ClubMember with status="approved" (open clubs) or status="pending" (approval-required clubs)
- Add **`leave_club(db, club_id, user_id)`**: Remove ClubMember row
- Add **`get_club_members(db, club_id, status_filter, page, page_size)`**: Paginated member list with user details
- Add **`approve_member(db, club_id, member_id, approver_id)`**: Set status="approved", set approved_at/approved_by
- Add **`reject_member(db, club_id, member_id, approver_id)`**: Set status="rejected"
- Add **`remove_member(db, club_id, user_id)`**: Delete ClubMember row
- Add **`reset_club_admin_password(db, club_id, new_password)`**: Hash and update the club admin's password

#### 3.2 Update Auth Service (`services/auth_service.py`)
Add a **`create_user(db, email, password, full_name, role, phone=None)`** helper function that creates a User with any role (used by club creation to make club admins).

### Phase 4: Backend Router Updates

#### 4.1 Update Club Router (`routers/clubs.py`)
Add new endpoints:
```
POST   /clubs/{club_id}/join              — Student joins club (any authenticated user)
DELETE /clubs/{club_id}/leave             — Student leaves club
GET    /clubs/{club_id}/members           — List members (paginated, filterable by status)
PUT    /clubs/{club_id}/members/{member_id}/approve  — Approve pending member (club_admin/super_admin)
PUT    /clubs/{club_id}/members/{member_id}/reject   — Reject pending member (club_admin/super_admin)
DELETE /clubs/{club_id}/members/{user_id}  — Remove member (club_admin/super_admin)
POST   /clubs/{club_id}/reset-admin-password — Reset club admin password (super_admin)
```

Update existing endpoints:
- `GET /clubs/` — Add `club_type` filter, ensure it works for student discovery (public endpoint)
- `POST /clubs/` — Accept nested admin data, create admin account alongside club

### Phase 5: Frontend Type Updates

#### 5.1 Add Club Interface (`types/index.ts`)
```typescript
export interface Club {
  id: string;
  name: string;
  club_code: string;
  category: string | null;
  club_type: 'department' | 'independent';
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  owner_id: string;
  department_id: string | null;
  department_name: string | null;
  faculty_coordinator_id: string | null;
  faculty_coordinator_name: string | null;
  club_admin_id: string | null;
  club_admin_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  status: string;
  member_count: number;
  post_count?: number;
  event_count?: number;
  created_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  approved_at: string | null;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
}
```

### Phase 6: Frontend Service Updates

#### 6.1 Update `clubManagementService` in `services/index.ts`
Add methods:
```typescript
joinClub: (id: string) => api.post(`/clubs/${id}/join`),
leaveClub: (id: string) => api.delete(`/clubs/${id}/leave`),
getMembers: (id: string, params?) => api.get(`/clubs/${id}/members`, { params }),
approveMember: (clubId: string, memberId: string) => api.put(`/clubs/${clubId}/members/${memberId}/approve`),
rejectMember: (clubId: string, memberId: string) => api.put(`/clubs/${clubId}/members/${memberId}/reject`),
removeMember: (clubId: string, userId: string) => api.delete(`/clubs/${clubId}/members/${userId}`),
resetAdminPassword: (id: string, data) => api.post(`/clubs/${id}/reset-admin-password`, data),
```

### Phase 7: Frontend Page Updates

#### 7.1 Update `CreateClubPage.tsx` (Super Admin)
Complete rewrite to include:
- Club Name, Club Code (auto-generated), Category dropdown, Description
- Club Type radio: "Department Club" / "Independent Club"
- If Department Club → Department select (required)
- Logo upload, Cover Image upload
- **Club Admin section** (collapsible): Admin Name, Email, Password, Phone (optional)
- Submit creates both club and admin account in one API call

#### 7.2 Update `ManageClubsPage.tsx` (Super Admin)
- Add Category and Club Type columns
- Add "Assign Admin" and "Reset Admin Password" actions
- Show club type badge (Department/Independent)

#### 7.3 Update `ClubDetailsPage.tsx` (Super Admin)
- Show new fields (category, club type)
- Add **Members tab** with member list
- Add member actions (approve, reject, remove)
- Add "Reset Admin Password" button

#### 7.4 Create `StudentClubsPage.tsx` (Student-Facing)
New page at `/student/clubs`:
- Club card grid: Logo, Name, Category, Type, Department (if applicable), Member Count, Join/Leave button
- Search bar, Category filter, Department filter, Club Type filter
- Click card → Club detail modal or page
- Join button (instant for open clubs, shows "Pending" for approval clubs)
- Leave button for joined clubs

#### 7.5 Update `Sidebar.tsx`
- Add `/student/clubs` link for `student` role (currently only shows `/clubs` for dept_admin/super_admin/club_admin)
- Keep existing `/clubs` link for admin roles

#### 7.6 Update `App.tsx` Routes
Add:
```tsx
<Route path="/student/clubs" element={<ProtectedRoute roles={['student']}><Layout><StudentClubsPage /></Layout></ProtectedRoute>} />
```

### Phase 8: Seed Data & Testing

#### 8.1 Add Sample Departments in `main.py` lifespan
Create a few departments if none exist (CSE, AI&DS, ECE, Mechanical, Civil) for testing department clubs.

#### 8.2 Verification Checklist
- [ ] Super Admin creates a Department Club with admin → club appears in student view
- [ ] Super Admin creates an Independent Club with admin → appears without department
- [ ] Student searches and filters clubs
- [ ] Student joins an open club → immediately a member
- [ ] Student joins an approval-required club → status is "pending"
- [ ] Club Admin approves a pending member → member becomes "approved"
- [ ] Club Admin rejects a pending member → member becomes "rejected"
- [ ] Student leaves a club → removed from members
- [ ] Super Admin toggles club active/inactive → disappears from student view when inactive
- [ ] Super Admin deletes a club → removed from all views
- [ ] Super Admin resets club admin password → admin can login with new password
- [ ] Principal sees all clubs in read-only view
- [ ] Department Admin sees only their department's clubs

---

## Files to Modify (Backend)
1. `app/models/club.py` — Add category, club_type to Club; add status fields to ClubMember
2. `app/schemas/club.py` — Add new fields, ClubMemberOut, ClubAdminData
3. `app/services/club_management_service.py` — Add member management, join workflow, admin creation
4. `app/services/auth_service.py` — Add `create_user()` helper
5. `app/routers/clubs.py` — Add member endpoints, update create to include admin

## Files to Modify (Frontend)
1. `src/types/index.ts` — Add Club and ClubMember interfaces
2. `src/services/index.ts` — Add member management API methods
3. `src/pages/admin/CreateClubPage.tsx` — Full rewrite with admin creation
4. `src/pages/admin/ManageClubsPage.tsx` — Add new fields, member actions
5. `src/pages/admin/ClubDetailsPage.tsx` — Add members tab, admin password reset
6. `src/components/layout/Sidebar.tsx` — Add student clubs link
7. `src/App.tsx` — Add student clubs route

## Files to Create (Frontend)
1. `src/pages/StudentClubsPage.tsx` — Student-facing club discovery page
