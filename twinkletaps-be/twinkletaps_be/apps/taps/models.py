import uuid

from django.conf import settings
from django.db import models


class Tap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    sequence = models.CharField(max_length=200)
    target = models.CharField(max_length=100)
    group = models.CharField(max_length=100)
