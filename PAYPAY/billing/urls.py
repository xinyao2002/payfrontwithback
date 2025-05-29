from django.urls import path
from . import views
from .views import BillListCreate, bill_list, bill_detail, accept_bill, reject_bill, update_amount
urlpatterns = [
    path('', views.bill_list, name='bill-list'),
    path('create/', BillListCreate.as_view(), name='bill-create'),
    path('<uuid:bill_id>/', bill_detail, name='bill-detail'),
    path('<uuid:bill_id>/accept/', accept_bill, name='accept-bill'),
    path('<uuid:bill_id>/reject/', reject_bill, name='reject-bill'),
    path('<uuid:bill_id>/update-amount/', update_amount, name='update-amount'),
]
