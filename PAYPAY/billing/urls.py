from django.urls import path
from . import views
from .views import BillListCreate, personal_bill,bill_list, bill_detail, accept_bill, reject_bill, update_amount
urlpatterns = [
    path('', views.bill_list, name='bill-list'),
    path('personalbill/',views.personal_bill,name='personal-bill'),
    path('accept_bill/<int:bill_id>/', accept_bill, name='accept_bill'),
    path('reject_bill/<int:bill_id>/', reject_bill, name='reject_bill'),
    path('create/', BillListCreate.as_view(), name='bill-create'),
    path('<int:bill_id>/', bill_detail, name='bill-detail'),
    path('<int:bill_id>/accept/', accept_bill, name='accept-bill'),
    path('<int:bill_id>/reject/', reject_bill, name='reject-bill'),
    path('<int:bill_id>/update-amount/', update_amount, name='update-amount'),
]
