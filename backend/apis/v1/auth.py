# 用户管理
from fastapi import APIRouter
from sqlalchemy.orm import Session

from models import User
from core.database import engine

router = APIRouter()


@router.get("/user")
def get_user():
    with Session(engine) as session:
        test_id = "c05d3d7f-28f8-4277-88cd-bea5ace34c7f"
        test = session.get(User, test_id)
        if test is None:
        test = User(
            id=test_id,
            email="test@leaptalk.com",
            display_name="测试",
            password_hash="<PLEASE_REPLACE_WITH_HASH>",
        )
            session.add(test)
            session.commit()
            session.refresh(test)
    return {"status": 1, "user_id": test.id}
