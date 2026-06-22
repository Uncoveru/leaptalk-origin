from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = ""
    openai_base_url: str = "https://api.deepseek.com"
    openai_model: str = "deepseek-v4-pro"

    dashscope_api_key: str = ""

    xunfei_appid: str = ""
    xunfei_api_secret: str = ""
    xunfei_api_key: str = ""

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/leaptalk"

    history_root: Path = PROJECT_ROOT / "data" / "history"
    audio_root: Path = PROJECT_ROOT / "data" / "tmp"
    report_root: Path = PROJECT_ROOT / "data" / "reports"
    pron_root: Path = PROJECT_ROOT / "data" / "pron"


_settings = Settings()

for _dir in (
    _settings.history_root,
    _settings.audio_root,
    _settings.report_root,
    _settings.pron_root,
):
    _dir.mkdir(parents=True, exist_ok=True)

openai_api_key = _settings.openai_api_key
openai_base_url = _settings.openai_base_url
openai_model = _settings.openai_model
dashscope_api_key = _settings.dashscope_api_key
xunfei_appid = _settings.xunfei_appid
xunfei_api_secret = _settings.xunfei_api_secret
xunfei_api_key = _settings.xunfei_api_key
history_root = _settings.history_root
audio_root = _settings.audio_root
report_root = _settings.report_root
pron_root = _settings.pron_root
