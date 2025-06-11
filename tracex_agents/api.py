import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from address_provider.executor import provide_wallet_address

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class WalletRequest(BaseModel):
    email: str
    caseid: int


class WalletResponse(BaseModel):
    wallet_address: str
    instructions: str
    message: str



@app.post("/api/agent/wallet", response_model=WalletResponse)
async def get_wallet_address(req: WalletRequest):
    try:
        result = provide_wallet_address(req.email, req.caseid)
        return result
    except Exception as e:
        logger.exception("Wallet agent error:")
        raise HTTPException(status_code=500, detail=f"Wallet agent error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
