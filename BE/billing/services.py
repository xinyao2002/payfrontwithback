from django.utils import timezone
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Bill, BillSplit

def notify_bill_update(bill):
    """Send bill update notification to all related users"""
    channel_layer = get_channel_layer()
    bill_data = bill_snapshot(bill.id)
    
    # Notify participants of a specific bill
    async_to_sync(channel_layer.group_send)(
        f"bill_{bill.id}",
        {"type": "broadcast_state", "data": bill_data}
    )
    
    # Notify bill list for all participants
    print("notify_bill_update: bill id", bill.id)
    for split in bill.splits.all():
        print("notify_bill_update: push to user", split.user.id, split.user.username)
        async_to_sync(channel_layer.group_send)(
            f"user_{split.user.id}_bills",
            {"type": "bill_update", "data": bill_data}
        )

@transaction.atomic
def create_bill(serializer, request):
    splits_data = request.data.get("splits", [])
    bill = serializer.save(created_by=request.user)
    for s in splits_data:
        BillSplit.objects.create(
            bill=bill,
            user_id=s["user_id"],
            amount=s["amount"],
        )
    notify_bill_update(bill)
    return bill

def accept_split(user, bill_id):
    split = BillSplit.objects.select_for_update().get(bill_id=bill_id, user=user)
    split.agree = True
    split.responded_at = timezone.now()
    split.save(update_fields=["agree", "responded_at"])
    notify_bill_update(split.bill)

def reject_split(user, bill_id):
    split = BillSplit.objects.select_for_update().get(bill_id=bill_id, user=user)
    split.agree = False
    split.responded_at = timezone.now()
    split.save(update_fields=["agree", "responded_at"])
    notify_bill_update(split.bill)

def update_amount(user, bill_id, amount):
    split = BillSplit.objects.select_for_update().get(bill_id=bill_id, user=user)
    split.amount = amount
    split.save(update_fields=["amount"])
    notify_bill_update(split.bill)

def bill_snapshot(bill_id):
    bill = Bill.objects.prefetch_related("splits__user").get(id=bill_id)
    from .serializers import BillSer
    data = BillSer(bill).data
    #print("bill_snapshot data:", data)
    return data
