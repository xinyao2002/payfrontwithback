from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Bill, BillSplit
from .services import accept_split, reject_split, update_amount, bill_snapshot

class BillConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.bill_id = self.scope["url_route"]["kwargs"]["bill_id"]
        self.group_name = f"bill_{self.bill_id}"
        user = self.scope["user"]

        # 鉴权：必须是账单参与者
        is_member = await database_sync_to_async(
            BillSplit.objects.filter(bill_id=self.bill_id, user=user).exists
        )()
        if not (user.is_authenticated and is_member):
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # 连接后立即把当前状态发给客户端
        state = await database_sync_to_async(bill_snapshot)(self.bill_id)
        await self.send_json(state)

    async def receive_json(self, content):
        user = self.scope["user"]
        t = content.get("type")
        if t == "accept":
            await database_sync_to_async(accept_split)(user, self.bill_id)
        elif t == "reject":
            await database_sync_to_async(reject_split)(user, self.bill_id)
        elif t == "update_amount":
            await database_sync_to_async(update_amount)(
                user, self.bill_id, content["amount"]
            )
        # 其余动作都在信号里统一广播，Consumer 里不直接发

    async def broadcast_state(self, event):
        await self.send_json(event["data"])

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

class BillsListConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{user.id}_bills"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        try:
            # 发送初始账单列表
            bills = await database_sync_to_async(self.get_user_bills)(user)
            await self.send_json(bills)
        except Exception as e:
            print(f"Error in BillsListConsumer.connect: {str(e)}")
            await self.send_json([])  # 发送空列表而不是错误

    def get_user_bills(self, user):
        try:
            bills = Bill.objects.filter(splits__user=user).distinct().prefetch_related("splits", "splits__user")
            results = []
            for bill in bills:
                results.append({
                    "id": bill.id,
                    "name": bill.name,
                    "total_amount": str(bill.total_amount),
                    "status": bill.status,
                    "created_time": bill.created_time.isoformat(),
                    "splits": [
                        {
                            "user": s.user.username,
                            "user_id": s.user.id,
                            "amount": str(s.amount),
                            "agree": s.agree,
                            "paid": s.paid
                        }
                        for s in bill.splits.all()
                    ]
                })
            return results
        except Exception as e:
            print(f"Error in get_user_bills: {str(e)}")
            return []


    async def receive_json(self, content):
        # 这个消费者主要用于接收更新，不需要处理发送的消息
        pass

    async def bill_update(self, event):
        try:
            # 当账单状态更新时，发送更新给用户
            print("BillsListConsumer: bill_update for user", self.scope["user"])
            await self.send_json(event["data"])
        except Exception as e:
            print(f"Error in bill_update: {str(e)}")

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
