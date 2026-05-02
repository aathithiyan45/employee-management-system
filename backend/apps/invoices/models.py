from django.db import models
from decimal import Decimal

class Invoice(models.Model):
    date = models.DateField()
    invoice_no = models.CharField(max_length=100, unique=True, db_index=True)
    client_number = models.CharField(max_length=100, db_index=True)
    project_name = models.CharField(max_length=255, db_index=True)
    work_order_no = models.CharField(max_length=100)
    pr_no = models.CharField(max_length=100)
    invoice_value = models.DecimalField(max_digits=12, decimal_places=2)
    
    retention = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    gst = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        inv_val = Decimal(str(self.invoice_value or '0'))
        ret = Decimal(str(self.retention or '0'))
        gst_val = Decimal(str(self.gst or '0'))
        
        # If retention or gst are not provided, we can still default them, 
        # but the request is to make them fields like manual entry.
        # We'll calculate the total based on whatever values are saved.
        
        self.total = inv_val - ret + gst_val
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.invoice_no
