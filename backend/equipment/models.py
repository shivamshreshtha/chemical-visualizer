from django.db import models


class Dataset(models.Model):
    filename = models.CharField(max_length=200)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    summary = models.JSONField()

    def __str__(self):
        return f"{self.filename} ({self.uploaded_at})"


class UploadHistory(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    filename = models.CharField(max_length=255)

    rows = models.IntegerField(default=0)
    columns = models.JSONField(default=list)
    preview = models.JSONField(default=list)
    averages = models.JSONField(default=dict)
    equipment_distribution = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.filename} ({self.created_at})"
