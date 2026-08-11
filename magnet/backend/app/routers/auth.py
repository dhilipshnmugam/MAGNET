from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.user import (
    UserRegister, UserLogin, UserOut, TokenResponse, RefreshTokenRequest,
    ForgotPassword, PasswordReset
)
from app.schemas.common import ResponseModel
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=ResponseModel, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await auth_service.register_user(db, data)
    return ResponseModel(
        data=UserOut.model_validate(user).model_dump(),
        message="Registration successful. Please verify your email."
    )


@router.post("/login", response_model=ResponseModel)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await auth_service.login_user(db, data)
    role = result.get("user", {}).get("role")
    message = (
        "Department Admin login successful"
        if role == "department_admin"
        else "Club Admin login successful"
        if role == "club_admin"
        else "Login successful"
    )
    return ResponseModel(data=result, message=message)


@router.post("/refresh", response_model=ResponseModel)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    result = await auth_service.refresh_access_token(db, data.refresh_token)
    return ResponseModel(data=result, message="Token refreshed")


@router.post("/forgot-password", response_model=ResponseModel)
async def forgot_password(data: ForgotPassword, db: AsyncSession = Depends(get_db)):
    await auth_service.forgot_password(db, data.email)
    return ResponseModel(message="If the email exists, a reset link has been sent")


@router.post("/reset-password", response_model=ResponseModel)
async def reset_password(data: PasswordReset, db: AsyncSession = Depends(get_db)):
    await auth_service.reset_password(db, data.token, data.new_password)
    return ResponseModel(message="Password reset successful")


@router.get("/me", response_model=ResponseModel)
async def get_me(current_user: User = Depends(get_current_user)):
    return ResponseModel(data=UserOut.model_validate(current_user).model_dump())
