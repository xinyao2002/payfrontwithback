from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BillSplit, Bill
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .services import bill_snapshot

@receiver(post_save, sender=BillSplit)
def update_bill_status(sender, instance, **kwargs):
    bill = instance.bill
    action_taken = False # Flag to mark if any status change action occurred

    if instance.agree is False:
        if bill.status != 'failed': # Only operate when status actually needs to change
            bill.status = 'failed'
            bill.save(update_fields=["status"])
            print(f"DEBUG: Bill {bill.id} status in memory set to FAILED. Saved to DB.")
            action_taken = True
    elif bill.all_accepted():
        if bill.status != 'ready': # Only operate when status actually needs to change
            bill.status = 'ready'
            bill.save(update_fields=["status"])
            print(f"DEBUG: Bill {bill.id} status in memory set to READY. Saved to DB.")
            action_taken = True
    
    # Fetch Bill object from database again to ensure we get the latest persisted state
    refreshed_bill = Bill.objects.get(id=bill.id)
    print(f"DEBUG: Bill {bill.id} status RE-FETCHED from DB: {refreshed_bill.status}")

    # Broadcast latest status
    # Even if the status hasn't changed from pending -> failed/ready (e.g., already failed, and another reject comes in),
    # The split change itself might need to notify frontend to update UI (e.g., which user rejected)
    # So always broadcast here
    layer = get_channel_layer()
    # Use refreshed bill object to generate snapshot, or ensure bill_snapshot always gets latest from database internally
    final_snapshot_data = bill_snapshot(refreshed_bill.id) # Pass bill.id to let snapshot get it internally
    print(f"DEBUG: Bill {bill.id} snapshot data for broadcast: {final_snapshot_data}")
    
    async_to_sync(layer.group_send)(
        f"bill_{bill.id}",
        {"type": "broadcast_state", "data": final_snapshot_data}
    )
