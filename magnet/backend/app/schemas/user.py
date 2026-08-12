from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime

ROLES_PATTERN = r"^(student|department_admin|super_admin|club_admin|principal)$"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=150)
    role: str = Field(default="student", pattern=ROLES_PATTERN)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    department_id: Optional[UUID] = None


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=150)
    department_id: UUID
    register_number: str = Field(..., max_length=50)
    year: str = Field(..., pattern=r"^(1st|2nd|3rd|4th)$")
    college_name: Optional[str] = Field(None, max_length=255)
    college_id: Optional[str] = Field(None, max_length=50)
    year_of_study: Optional[int] = Field(None, ge=1, le=5)
    semester: Optional[int] = Field(None, ge=1, le=10)
    section: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=15)
    admission_year: Optional[int] = None


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    password: str
    user_identifier: Optional[str] = None
    department_id: Optional[UUID] = None
    club_id: Optional[UUID] = None

    @model_validator(mode="after")
    def _check_identifier(self):
        if not self.email and not (self.user_identifier or "").strip():
            raise ValueError("email or user_identifier is required")
        return self


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    department_id: Optional[UUID] = None


class StudentProfileUpdate(BaseModel):
    roll_number: Optional[str] = Field(None, max_length=30)
    year_of_study: Optional[int] = Field(None, ge=1, le=5)
    semester: Optional[int] = Field(None, ge=1, le=10)
    section: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=15)
    graduation_year: Optional[int] = None


class DepartmentAdminProfileUpdate(BaseModel):
    designation: Optional[str] = Field(None, max_length=100)
    qualification: Optional[str] = Field(None, max_length=255)
    specialization: Optional[str] = Field(None, max_length=255)
    office_room: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=15)


HodProfileUpdate = DepartmentAdminProfileUpdate


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ForgotPassword(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None
    department_id: Optional[UUID] = None
    year: Optional[str] = None
    register_number: Optional[str] = None
    college_name: Optional[str] = None
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserDetailOut(UserOut):
    last_login_at: Optional[datetime] = None
    department_name: Optional[str] = None


class StudentOut(BaseModel):
    id: UUID
    user_id: UUID
    college_id: str
    roll_number: Optional[str] = None
    year_of_study: Optional[int] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    phone: Optional[str] = None
    admission_year: Optional[int] = None
    graduation_year: Optional[int] = None

    class Config:
        from_attributes = True


class HodOut(BaseModel):
    id: UUID
    user_id: UUID
    employee_id: str
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    join_date: Optional[datetime] = None
    office_room: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class UserWithProfile(BaseModel):
    user: UserOut
    student: Optional[StudentOut] = None
    hod: Optional[HodOut] = None

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: str = Field(..., pattern=ROLES_PATTERN)


class AccountStatusUpdate(BaseModel):
    is_active: bool


class ProfileView(BaseModel):
    user: UserOut
    student: Optional[StudentOut] = None
    hod: Optional[HodOut] = None
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    is_following: bool = False
    is_followed_by: bool = False
    is_self: bool = False
    clubs: List["ProfileClub"] = []
    achievements: List["ProfileAchievement"] = []
    projects: List["ProfileProject"] = []


class UserListItem(UserOut):
    department_name: Optional[str] = None
    is_following: bool = False
    is_followed_by: bool = False


class ProfileClub(BaseModel):
    id: UUID
    name: str
    club_code: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    domain: Optional[str] = None
    club_type: Optional[str] = None
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    member_count: int = 0
    role: Optional[str] = None
    roles: List[str] = []
    is_active: bool = True
    status: Optional[str] = None


class ProfileAchievement(BaseModel):
    id: UUID
    title: Optional[str] = None
    description: Optional[str] = None
    achievement_type: Optional[str] = None
    achievement_score: Optional[int] = None
    certificate_url: Optional[str] = None
    date: Optional[datetime] = None
    image_url: Optional[str] = None


class ProfileProject(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    category: Optional[str] = None
    status: Optional[str] = None
    member_count: int = 0
    task_count: int = 0
    completed_task_count: int = 0
    my_role: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
