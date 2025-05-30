from rest_framework import generics, permissions
from .models import Bill
from .serializers import BillSer
from .services import create_bill
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import BillSplit
from .services import bill_snapshot
import json
from django.db import transaction
from django.utils import timezone
from django.db import models

class BillListCreate(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BillSer

    def get_queryset(self):
        
        return Bill.objects.filter(splits__user=self.request.user).distinct()

    def perform_create(self, serializer):
        
        create_bill(serializer, self.request)
@csrf_exempt
def personal_bill(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    # Calculate total spend
    total_spend = BillSplit.objects.filter(user=request.user).aggregate(total=models.Sum('amount'))['total'] or 0

    # Calculate month spend
    now = timezone.now()
    month_spend = BillSplit.objects.filter(user=request.user, responded_at__year=now.year, responded_at__month=now.month).aggregate(total=models.Sum('amount'))['total'] or 0

    # Calculate number of bills
    num_bills = Bill.objects.filter(splits__user=request.user).distinct().count()

    return JsonResponse({
        'total_spend': total_spend,
        'month_spend': month_spend,
        'num_bills': num_bills
    })

@csrf_exempt
def bill_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        # 获取用户相关的所有账单
        user_bills = Bill.objects.filter(splits__user=request.user).distinct()
        
        bills_data = []
        for bill in user_bills:
            try:
                bill_data = bill_snapshot(bill.id)
                if bill_data:
                    # 确定账单状态
                    if bill_data['status'] == 'pending':
                        # 检查用户是否已接受
                        user_split = next((split for split in bill_data['splits'] if split['user_id'] == request.user.id), None)
                        if user_split and user_split['agree']:
                            bill_data['status'] = 'pending'
                        else:
                            bill_data['status'] = 'unpaid'
                    bills_data.append(bill_data)
            except Exception as e:
                print(f"Error processing bill {bill.id}: {str(e)}")
                continue
        
        return JsonResponse(bills_data, safe=False)
    except Exception as e:
        print(f"Error in bill_list: {str(e)}")
        return JsonResponse([], safe=False)  # 返回空列表而不是错误

@csrf_exempt
def bill_detail(request, bill_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    bill_data = bill_snapshot(bill_id)
    if not bill_data:
        return JsonResponse({'error': 'Bill not found'}, status=404)
    
    return JsonResponse(bill_data)

@csrf_exempt
@transaction.atomic
def accept_bill(request, bill_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        data = json.loads(request.body)
        amount = data.get('amount')
        from .services import accept_split
        result = accept_split(request.user, bill_id)
        print("accept_bill: result", result)
        if result is None:
            return JsonResponse({'status': 'success'}, safe=False)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@transaction.atomic
def reject_bill(request, bill_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        from .services import reject_split
        result = reject_split(request.user, bill_id)
        print("reject_bill: result", result)
        if result is None:
            return JsonResponse({'status': 'success'}, safe=False)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def update_amount(request, bill_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        data = json.loads(request.body)
        amount = data.get('amount')
        from .services import update_amount
        result = update_amount(bill_id, request.user.id, amount)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
