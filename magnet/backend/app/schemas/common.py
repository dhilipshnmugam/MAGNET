from typing import Optional, Any, Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar("T")


class ResponseBase(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = "Operation completed successfully"


class ResponseModel(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[List[T]] = None
    total: int = 0
    page: int = 1
    page_size: int = 20
    has_next: bool = False


class ErrorResponse(BaseModel):
    success: bool = False
    error: dict


class ErrorDetail(BaseModel):
    code: str
    message: str
