from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Identifier = Annotated[str, Field(min_length=1, max_length=120, pattern=r'^[A-Za-z0-9_-]+$')]

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Register(Input):
    email: str = Field(min_length=3, max_length=254)
    nickname: str = Field(pattern=r'^[a-z]{3,24}$')
    password: str = Field(min_length=8, max_length=128)

class Login(Input):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class ProfilePatch(Input):
    nickname: str | None = Field(default=None, pattern=r'^[a-z]{3,24}$')
    avatarUrl: str | None = Field(default=None, max_length=22000)
    displayName: str | None = Field(default=None, min_length=1, max_length=40)
    bio: str | None = Field(default=None, max_length=300)

    @model_validator(mode='after')
    def nonempty(self):
        if not self.model_fields_set or any(getattr(self,k) is None for k in self.model_fields_set if k!='avatarUrl'):
            raise ValueError('Provide a non-null profile field; only avatarUrl may be null.')
        return self

class Code(Input):
    code: str = Field(min_length=1, max_length=20000)

class Example(Code):
    args: list | None = Field(default=None, max_length=10)

class TraceGuess(Input):
    answer: str = Field(max_length=2000)

class Complete(Input):
    lesson_id: Identifier

class LessonCreate(Input):
    id: Identifier | None = None
    topicId: Identifier
    title: str = Field(min_length=5,max_length=80)
    theoryMd: str = Field(min_length=10,max_length=30000)
    position: int = Field(ge=1,le=10000)
    prerequisiteId: Identifier | None = None

class LessonPatch(Input):
    title: str | None = Field(default=None,min_length=5,max_length=80)
    theoryMd: str | None = Field(default=None,min_length=10,max_length=30000)
    prerequisiteId: Identifier | None = None

    @model_validator(mode='after')
    def nonempty(self):
        if not self.model_fields_set or any(getattr(self,k) is None for k in self.model_fields_set if k!='prerequisiteId'):
            raise ValueError('Provide a non-null field; only prerequisiteId may be null.')
        return self

class Case(Input):
    args: list = Field(max_length=20)
    expected: object
    isSample: bool = False

class ProblemCreate(Input):
    id: Identifier | None = None
    lessonId: Identifier | None = None
    title: str = Field(min_length=5,max_length=80)
    statement: str = Field(min_length=10,max_length=30000)
    topicSlug: str = Field(pattern=r'^[a-z0-9-]{1,40}$')
    difficulty: Literal['EASY','MEDIUM','HARD'] = 'EASY'
    functionName: str = Field(pattern=r'^[A-Za-z_][A-Za-z0-9_]{0,79}$')
    starterCode: str = Field(min_length=1,max_length=20000)
    rewardXp: int = Field(default=20,ge=0,le=100)
    rewardCoins: int = Field(default=5,ge=0,le=50)
    isPublished: bool = False
    testCases: list[Case] = Field(min_length=1,max_length=30)

    @model_validator(mode='after')
    def sample(self):
        if not any(c.isSample for c in self.testCases):
            raise ValueError('At least one public sample is required.')
        return self

class ProblemPatch(Input):
    title: str | None = Field(default=None,min_length=5,max_length=80)
    statement: str | None = Field(default=None,min_length=10,max_length=30000)
    starterCode: str | None = Field(default=None,min_length=1,max_length=20000)
    isPublished: bool | None = None

    @model_validator(mode='after')
    def nonempty(self):
        if not self.model_fields_set or any(getattr(self,k) is None for k in self.model_fields_set):
            raise ValueError('Provide non-null fields.')
        return self

class CredentialsPatch(Input):
    currentPassword: str = Field(min_length=1,max_length=128)
    email: str | None = Field(default=None,max_length=254,pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password: str | None = Field(default=None,min_length=8,max_length=128)

    @model_validator(mode='after')
    def change(self):
        if self.email is None and self.password is None:raise ValueError('Provide email or password.')
        return self
