from django.urls import re_path
from .consumers import BillConsumer, BillsListConsumer

websocket_urlpatterns = [
    re_path(r"^ws/bill/(?P<bill_id>[0-9a-f-]+)/$", BillConsumer.as_asgi()),
    re_path(r"^ws/bills/$", BillsListConsumer.as_asgi()),
]
