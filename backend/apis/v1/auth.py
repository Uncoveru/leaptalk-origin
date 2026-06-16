# 用户管理
from fastapi import APIRouter
from sqlalchemy.orm import Session

from models import User, engine

router = APIRouter()


@router.get("/user")
def get_user():
    with Session(engine) as session:
        test_id = "c05d3d7f-28f8-4277-88cd-bea5ace34c7f"
        test = session.get(User, test_id)
        if test is None:
            test = User(
                id=test_id,
                name="测试",
                password="<PASSWORD>",
            )
            session.add(test)
            session.commit()
            session.refresh(test)
    return {"status": 1, "user_id": test.id}
