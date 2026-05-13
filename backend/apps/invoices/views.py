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
    pagination_class = None
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

            # Flexible Column Mapping
            df.columns = [str(c).strip() for c in df.columns]
            
            mapping = {
                'date': ['Date', 'Invoice Date'],
                'invoice_no': ['Invoice No', 'Invoice Number', 'Inv No'],
                'client_number': ['Client Number', 'Client No', 'Client ID', 'Client'],
                'project_name': ['Project Name', 'Project', 'Project Nam'],
                'work_order_no': ['Work Order No', 'Work Order', 'WO No', 'WO'],
                'pr_no': ['PR No', 'PR Number', 'PR'],
                'invoice_value': ['Invoice Value', 'Value', 'Amount', 'Invoice Valu'],
                'retention_pct': ['Retention %', 'Retention Pct'],
                'gst_pct': ['GST %', 'GST Pct'],
                'retention_amt': ['Retention', 'Retention Amount'],
                'gst_amt': ['GST', 'GST Amount']
            }

            col_map = {}
            for field, aliases in mapping.items():
                for alias in aliases:
                    if alias in df.columns:
                        col_map[field] = alias
                        break
            
            mandatory = ['date', 'invoice_no', 'client_number', 'project_name', 'work_order_no', 'pr_no', 'invoice_value']
            missing = [m.replace('_', ' ').title() for m in mandatory if m not in col_map]
            
            if missing:
                return Response({"error": f"Missing required columns: {', '.join(missing)} (Check your Excel headers)"}, status=status.HTTP_400_BAD_REQUEST)

            existing_nos = set(Invoice.objects.values_list('invoice_no', flat=True))
            
            to_create = []
            errors = []
            success_count = 0
            from decimal import Decimal

            for index, row in df.iterrows():
                invoice_no = str(row[col_map['invoice_no']]).strip()
                if pd.isna(row[col_map['invoice_no']]):
                    continue
                
                if invoice_no in existing_nos:
                    errors.append(f"Row {index + 2}: Invoice No {invoice_no} already exists.")
                    continue

                try:
                    invoice_value = float(row[col_map['invoice_value']])
                    date_val = pd.to_datetime(row[col_map['date']]).date()
                except (ValueError, TypeError, Exception):
                    errors.append(f"Row {index + 2}: Invalid Invoice Value or Date format.")
                    continue

                # Retention
                ret_val = None
                if 'retention_amt' in col_map and not pd.isna(row[col_map['retention_amt']]):
                    ret_val = Decimal(str(row[col_map['retention_amt']]))
                elif 'retention_pct' in col_map and not pd.isna(row[col_map['retention_pct']]):
                    pct = float(row[col_map['retention_pct']]) / 100
                    ret_val = Decimal(str(round(invoice_value * pct, 2)))
                else:
                    ret_val = Decimal(str(round(invoice_value * 0.10, 2)))
                
                # GST
                gst_val = None
                if 'gst_amt' in col_map and not pd.isna(row[col_map['gst_amt']]):
                    gst_val = Decimal(str(row[col_map['gst_amt']]))
                elif 'gst_pct' in col_map and not pd.isna(row[col_map['gst_pct']]):
                    pct = float(row[col_map['gst_pct']]) / 100
                    gst_val = Decimal(str(round((invoice_value - float(ret_val)) * pct, 2)))
                else:
                    gst_val = Decimal(str(round((invoice_value - float(ret_val)) * 0.18, 2)))

                total_val = Decimal(str(invoice_value)) - ret_val + gst_val

                to_create.append(Invoice(
                    date=date_val,
                    invoice_no=invoice_no,
                    client_number=str(row[col_map['client_number']]).strip() if not pd.isna(row[col_map['client_number']]) else '',
                    project_name=str(row[col_map['project_name']]).strip() if not pd.isna(row[col_map['project_name']]) else '',
                    work_order_no=str(row[col_map['work_order_no']]).strip() if not pd.isna(row[col_map['work_order_no']]) else '',
                    pr_no=str(row[col_map['pr_no']]).strip() if not pd.isna(row[col_map['pr_no']]) else '',
                    invoice_value=invoice_value,
                    retention=ret_val,
                    gst=gst_val,
                    total=total_val
                ))
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
