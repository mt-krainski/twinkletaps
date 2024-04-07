import uuid

from django.conf import settings
from django.db import models


class TTModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Device(TTModel):
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # TODO: Fix security
    # API keys should not be stored in plain text, this should use some better mechanism
    # e.g. using https://florimondmanca.github.io/djangorestframework-api-key/
    api_key = models.UUIDField(default=uuid.uuid4, editable=False)


class Tap(TTModel):
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    sequence = models.CharField(max_length=200)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    group = models.CharField(max_length=100)
