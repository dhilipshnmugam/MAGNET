from app.schemas.common import (
    ResponseBase, ResponseModel, PaginatedResponse, ErrorResponse, ErrorDetail
)
from app.schemas.user import (
    UserBase, UserRegister, UserLogin, UserUpdate, UserOut, UserDetailOut,
    StudentOut, HodOut, UserWithProfile, TokenResponse, RefreshTokenRequest,
    PasswordReset, ForgotPassword, RoleUpdate, AccountStatusUpdate,
    StudentProfileUpdate, DepartmentAdminProfileUpdate, HodProfileUpdate
)
from app.schemas.post import (
    PostCreate, PostUpdate, PostOut, PostMediaOut, PostAuthorOut,
    CommentCreate, CommentOut, LikeOut, PostAnalyticsOut, TrendingTagOut
)
from app.schemas.channel import (
    ChannelCreate, ChannelUpdate, ChannelOut, ChannelMemberOut,
    ChannelMessageCreate, ChannelMessageOut
)
from app.schemas.message import (
    MessageCreate, MessageOut, MessageUpdate, ConversationOut, ConversationParticipantOut
)
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut
from app.schemas.event import EventCreate, EventUpdate, EventOut, RSVPCreate, RSVOUt
from app.schemas.notification import (
    NotificationOut, FCMTokenRegister, NotificationPrefsOut,
    NotificationPrefsUpdate, UnreadCountOut
)
from app.schemas.points import PointOut, LeaderboardEntryOut
from app.schemas.approval import ApprovalRequestCreate, ApprovalRequestOut, ApprovalReview
from app.schemas.club import ClubCreate, ClubUpdate, ClubOut, ClubDetailOut
