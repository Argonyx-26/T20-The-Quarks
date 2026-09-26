import asyncio
import websockets
import json

async def test_ws():
    async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
        print("Connected")
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print("Received:", data["type"])

asyncio.run(test_ws())
