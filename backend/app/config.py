from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Token World Sandbox"
    environment: str = "sandbox"
    api_prefix: str = "/api/v1"
    enable_live_trading: bool = False
    database_url: str = "sqlite:///./token_world_demo.db"
    chain_id: int = 31337
    settlement_contract: str | None = None
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
