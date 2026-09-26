import asyncio
import websockets
import json

async def test_ws():
    device_id = "c4066430-b633-4456-a11f-7a5acd5c1e61"
    token = "9QLDrA_k-1DgsqaELajywNf3KRp_FBHCJdex11enMdU"
    url = f"ws://127.0.0.1:8000/ws?role=paired_device&device_id={device_id}&token={token}"
    async with websockets.connect(url) as ws:
        print("Connected as device")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print("Received:", data["type"])

asyncio.run(test_ws())
