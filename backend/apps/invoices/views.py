import pandas as pd
from datetime import datetime
from django.http import HttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Invoice
from .serializers import InvoiceSerializer
from apps.payroll.permissions import IsAdminOrHR

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-date', '-created_at')
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    # pagination_class = None  # Use global default
    filter_backends = [filters.SearchFilter]
    search_fields = ['invoice_no', 'client_number', 'project_name']

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.endswith('.xlsx'):
            return Response({"error": "Only .xlsx files are allowed"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file)
            
            # Safety Guard: Limit file size for performance
            if len(df) > 2000:
                return Response({"error": "File too large. Please limit to 2000 rows per upload."}, status=status.HTTP_400_BAD_REQUEST)

            required_cols = ['Date', 'Invoice No', 'Client Number', 'Project Name', 'Work Order No', 'PR No', 'Invoice Value']
            for col in required_cols:
                if col not in df.columns:
                    return Response({"error": f"Missing required column: {col}"}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Pre-fetch existing invoice numbers for O(1) existence checks
            existing_nos = set(Invoice.objects.values_list('invoice_no', flat=True))
            
            to_create = []
            errors = []
            success_count = 0
            
            from decimal import Decimal

            for index, row in df.iterrows():
                invoice_no = str(row['Invoice No']).strip()
                if pd.isna(row['Invoice No']):
                    continue
                
                if invoice_no in existing_nos:
                    errors.append(f"Row {index + 2}: Invoice No {invoice_no} already exists.")
                    continue

                try:
                    invoice_value = float(row['Invoice Value'])
                    date_val = pd.to_datetime(row['Date']).date()
                except (ValueError, TypeError, Exception):
                    errors.append(f"Row {index + 2}: Invalid Invoice Value or Date format.")
                    continue

                retention = row.get('Retention')
                if pd.isna(retention):
                    retention = round(invoice_value * 0.10, 2)
                
                gst = row.get('GST')
                if pd.isna(gst):
                    # Standard practice: GST is calculated on Gross Value (before retention)
                    gst = round(invoice_value * 0.18, 2)

                # IMPORTANT: bulk_create does NOT call save(), so we must calculate total manually
                inv_val = Decimal(str(invoice_value or 0))
                ret_val = Decimal(str(retention or 0))
                gst_val = Decimal(str(gst or 0))
                total_val = inv_val - ret_val + gst_val

                to_create.append(Invoice(
                    date=date_val,
                    invoice_no=invoice_no,
                    client_number=str(row['Client Number']).strip() if not pd.isna(row['Client Number']) else '',
                    project_name=str(row['Project Name']).strip() if not pd.isna(row['Project Name']) else '',
                    work_order_no=str(row['Work Order No']).strip() if not pd.isna(row['Work Order No']) else '',
                    pr_no=str(row['PR No']).strip() if not pd.isna(row['PR No']) else '',
                    invoice_value=invoice_value,
                    retention=retention,
                    gst=gst,
                    total=total_val
                ))
                # Add to existing_nos to prevent duplicates within the same Excel sheet
                existing_nos.add(invoice_no)

            if to_create:
                Invoice.objects.bulk_create(to_create, batch_size=500)
                success_count = len(to_create)

            return Response({
                "message": f"Successfully uploaded {success_count} invoices.",
                "errors": errors
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def export(self, request):
        invoices = self.filter_queryset(self.get_queryset())
        data = []
        for inv in invoices:
            data.append({
                'Date': inv.date,
                'Invoice No': inv.invoice_no,
                'Client Number': inv.client_number,
                'Project Name': inv.project_name,
                'Work Order No': inv.work_order_no,
                'PR No': inv.pr_no,
                'Invoice Value': float(inv.invoice_value),
                'Retention': float(inv.retention) if inv.retention else 0,
                'GST': float(inv.gst) if inv.gst else 0,
                'Total': float(inv.total) if inv.total else 0,
            })
        
        df = pd.DataFrame(data)
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="invoices.xlsx"'
        df.to_excel(response, index=False)
        return response
