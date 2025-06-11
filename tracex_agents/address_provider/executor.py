from google.adk.sessions import InMemorySessionService
from google.adk.artifacts import InMemoryArtifactService
from google.adk.runners import Runner
from google.genai import types
from .agent import wallet_address_agent

def generate_wallet_address(email: str, caseid: str) -> str:
    
    return f"0x{abs(hash(email + caseid)) % (10 ** 40):040d}"

def provide_wallet_address(email: str, caseid: str) -> dict:
    APP_NAME   = "walletaddressprovider"
    USER_ID    = email
    SESSION_ID = f"session_{email}_{caseid}"

    session_service = InMemorySessionService()
    session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=SESSION_ID
    )

    runner = Runner(
        app_name=APP_NAME,
        agent=wallet_address_agent,
        artifact_service=InMemoryArtifactService(),
        session_service=session_service
    )

    wallet_address = generate_wallet_address(email, caseid)
    import json
    content = types.Content(
        role="user",
        parts=[types.Part(text=json.dumps({"email": email, "caseid": caseid}))]
    )

    events = runner.run(
        user_id=USER_ID,
        session_id=SESSION_ID,
        new_message=content
    )

    # Default output in case agent doesn't return JSON
    result = {
        "wallet_address": wallet_address,
        "caseid": caseid,
        "instructions": "1. Open MetaMask. 2. Go to Import Account. 3. Paste your private key. 4. Confirm.",
        "message": f"Dear user, here is your new wallet address for case {caseid}: {wallet_address}. Please follow the instructions to import it into MetaMask. Keep your private key safe."
    }
    for event in events:
        if event.is_final_response() and event.content and event.content.parts:
            try:
                agent_result = json.loads(event.content.parts[0].text)
                result.update(agent_result)
            except Exception:
                pass
            break
    return result