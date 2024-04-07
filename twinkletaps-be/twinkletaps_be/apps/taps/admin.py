from django.contrib import admin

from .models import Device, Tap

admin.site.register(Tap)
admin.site.register(Device)
