from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BillSplit, Bill
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .services import bill_snapshot

@receiver(post_save, sender=BillSplit)
def update_bill_status(sender, instance, **kwargs):
    bill = instance.bill
    # 有人拒绝 → failed
    if instance.agree is False:
        bill.status = 'failed'
        bill.save(update_fields=["status"])
    # 所有人同意 → ready
    elif bill.all_accepted():
        bill.status = 'ready'
        bill.save(update_fields=["status"])

    # 广播最新状态
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        f"bill_{bill.id}",
        {"type": "broadcast_state", "data": bill_snapshot(bill.id)}
    )
