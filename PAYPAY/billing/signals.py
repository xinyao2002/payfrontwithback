from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BillSplit, Bill
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .services import bill_snapshot

@receiver(post_save, sender=BillSplit)
def update_bill_status(sender, instance, **kwargs):
    bill = instance.bill
    action_taken = False # 标记是否有状态变更的动作发生

    if instance.agree is False:
        if bill.status != 'failed': # 仅当状态实际需要改变时才操作
            bill.status = 'failed'
            bill.save(update_fields=["status"])
            print(f"DEBUG: Bill {bill.id} status in memory set to FAILED. Saved to DB.")
            action_taken = True
    elif bill.all_accepted():
        if bill.status != 'ready': # 仅当状态实际需要改变时才操作
            bill.status = 'ready'
            bill.save(update_fields=["status"])
            print(f"DEBUG: Bill {bill.id} status in memory set to READY. Saved to DB.")
            action_taken = True
    
    # 从数据库重新获取 Bill 对象，以确保我们得到的是最新的持久化状态
    refreshed_bill = Bill.objects.get(id=bill.id)
    print(f"DEBUG: Bill {bill.id} status RE-FETCHED from DB: {refreshed_bill.status}")

    # 广播最新状态
    # 即使状态没有从 pending -> failed/ready (例如，已经是failed，又来一个reject), 
    # split 本身的变化也可能需要通知前端更新界面（比如哪个用户拒绝了）
    # 所以这里总是广播
    layer = get_channel_layer()
    # 使用刷新后的 bill 对象来生成快照，或确保 bill_snapshot 内部也总是从数据库获取最新
    final_snapshot_data = bill_snapshot(refreshed_bill.id) # 传递 bill.id,让 snapshot 内部自己 get
    print(f"DEBUG: Bill {bill.id} snapshot data for broadcast: {final_snapshot_data}")
    
    async_to_sync(layer.group_send)(
        f"bill_{bill.id}",
        {"type": "broadcast_state", "data": final_snapshot_data}
    )
