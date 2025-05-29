from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Bill(models.Model):
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('ready', 'Ready'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    created_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.status}"

    def all_accepted(self):
        """
        返回 True 表示：
        * 每个参与人都已经表态 (agree 不为 None)
        * 且没有人拒绝 (agree 为 False)
        """
        splits = self.splits.all()
        # 还在等待有人回应
        if splits.filter(agree__isnull=True).exists():
            return False
        # 已有人拒绝
        if splits.filter(agree=False).exists():
            return False
        return True
   

class BillSplit(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    agree = models.BooleanField(null=True, default=None)   # None=未响应, True=接受, False=拒绝
    paid = models.BooleanField(default=False)
    responded_at = models.DateTimeField(null=True, blank=True)
    paid_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.amount} - Agree: {self.agree} - Paid: {self.paid}"

    
    class Meta:
        unique_together = ('bill', 'user')   # 一张账单里同一个人只能出现一次
    