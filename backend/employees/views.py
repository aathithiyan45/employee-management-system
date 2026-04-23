import pandas as pd
from datetime import date, timedelta

from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Employee, Division
from .models import User


# =========================
# 🔧 SAFE DATE PARSER
# =========================
def safe_date(value):
    try:
        if pd.isna(value) or value == "":
            return None
        d = pd.to_datetime(value, errors="coerce", dayfirst=True)
        return d.date() if not pd.isna(d) else None
    except:
        return None


# =========================
# 🔧 SAFE GET
# =========================
def safe_get(row, key):
    val = row.get(key)
    if pd.isna(val) or val is None:
        return ""
    return str(val).strip()


# =========================
# 🔐 LOGIN
# =========================
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User

@api_view(['POST'])
def login_view(request):
    username_input = request.data.get("username")  # can be username OR emp_id
    password = request.data.get("password")

    user = None

    # 🔥 STEP 1 — try normal login (admin)
    user = authenticate(username=username_input, password=password)

    # 🔥 STEP 2 — if failed, try employee login
    if user is None:
        try:
            emp_user = User.objects.get(username=username_input)  # emp_id stored as username
            user = authenticate(username=emp_user.username, password=password)
        except User.DoesNotExist:
            pass

    if user:
        emp = getattr(user, "employee", None)

        return Response({
            "status": "success",
            "username": user.username,
            "role": user.role,
            "must_change_password": user.must_change_password,
            "emp_id": emp.emp_id if emp else None,
        })

    return Response({
        "status": "error",
        "message": "Invalid credentials"
    }, status=401)


# =========================
# 📊 DASHBOARD
# =========================
@api_view(['GET'])
def dashboard_view(request):
    division_name = request.GET.get("division")

    if not division_name:
        return Response({"error": "Division required"}, status=400)

    today = date.today()
    next_30_days = today + timedelta(days=30)

    employees = Employee.objects.filter(division__name=division_name)

    total = employees.count()
    active = employees.filter(is_active=True).count()
    inactive = employees.filter(is_active=False).count()

    active_employees = employees.filter(is_active=True)

    wp_expiring = active_employees.filter(
        wp_expiry__range=(today, next_30_days)
    ).count()

    passport_expiring = active_employees.filter(
        passport_expiry__range=(today, next_30_days)
    ).count()

    return Response({
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": inactive,
        "wp_expiring": wp_expiring,
        "passport_expiring": passport_expiring
    })

# =========================
# 📂 EXCEL IMPORT (FINAL)
# =========================
@api_view(['POST'])
def import_excel(request):
    file = request.FILES.get('file')

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        excel = pd.ExcelFile(file)

        print("📄 SHEETS:", excel.sheet_names)

        df_current = pd.read_excel(excel, sheet_name=0)
        df_cancelled = pd.read_excel(excel, sheet_name=1)

    except Exception as e:
        print("❌ Excel Error:", str(e))
        return Response({"error": "Excel read failed"}, status=400)

    # CLEAN
    df_current = df_current.fillna("")
    df_cancelled = df_cancelled.fillna("")

    df_current.columns = df_current.columns.str.strip()
    df_cancelled.columns = df_cancelled.columns.str.strip()

    print("✅ CURRENT COLS:", df_current.columns)
    print("❌ CANCELLED COLS:", df_cancelled.columns)

    division, _ = Division.objects.get_or_create(name="GSI Marine")

    created = 0
    updated = 0
    inactivated = 0

    # =========================
    # ✅ CURRENT EMPLOYEES
    # =========================
    for _, row in df_current.iterrows():

        emp_id = safe_get(row, "EMP ID")

        if not emp_id:
            continue

        obj, created_flag = Employee.objects.update_or_create(
            emp_id=emp_id,
            defaults={
                "name": safe_get(row, "NAME") or f"EMP-{emp_id}",
                "phone": safe_get(row, "HP NUMBER"),
                "nationality": safe_get(row, "NATIONALITY"),
                "dob": safe_date(row.get("D.O.B")),

                "division": division,
                "is_active": True,

                "work_permit_no": safe_get(row, "IC / WP NO"),
                "fin_no": safe_get(row, "FIN NO"),
                "issue_date": safe_date(row.get("ISSUANCE DATE")),
                "wp_expiry": safe_date(row.get("S PASS/ WP EXPRIY")),

                "passport_no": safe_get(row, "PP.NO"),
                "passport_expiry": safe_date(row.get("PP EXPIRY")),
                "passport_issue_date": safe_date(row.get("PP ISSUE DATE")),
                "passport_issue_place": safe_get(row, "PP SSUE PLACE"),

                "designation_ipa": safe_get(row, "DESIGNATION FOR IPA STATUS"),
                "ipa_salary": row.get("IPA SALARY") or 0,
                "per_hr": row.get("PER HR") or 0,
                "designation_aug": safe_get(row, "DESIGNATION AUG 2025"),

                "doa": safe_date(row.get("D.O.A")),
                "arrival_date": safe_date(row.get("Arrival Date")),

                "work_at_height": bool(row.get("WORK-AT-HEIGHT")),
                "confined_space": bool(row.get("CONFINED SPACE")),
                "welder_no": safe_get(row, "WELDER NO"),

                "salary": row.get("SALARY") or 0,
                "bank_account": safe_get(row, "BANK ACCOUNT NUMBER"),

                "qualification": safe_get(row, "QULIFICATION"),
                "accommodation": safe_get(row, "ACCOMODATION"),
                "pcp_status": safe_get(row, "PCP STATUS"),

                "security_bond_no": safe_get(row, "Security Bond Guarantee No"),
                "security_bond_exp": safe_date(row.get("Security Bond Expiry Date")),

                "remarks": safe_get(row, "Remarks"),
            }
        )

        if created_flag:
            created += 1
        else:
            updated += 1


    # =========================
    # ❌ CANCELLED EMPLOYEES (FINAL FIX)
    # =========================
    for _, row in df_cancelled.iterrows():

        emp_id = (
            safe_get(row, "EMP ID") or
            safe_get(row, "EM ID") or
            safe_get(row, "Emp ID")
        )

        if not emp_id:
            continue

        name = safe_get(row, "Name") or f"EMP-{emp_id}"

        obj, created_flag = Employee.objects.update_or_create(
            emp_id=emp_id,
            defaults={
                "name": name,
                "division": division,
                "is_active": False
            }
        )

        if not created_flag:
            inactivated += 1


    # =========================
    # ✅ FINAL RESPONSE
    # =========================
    return Response({
        "message": "Import completed ✅",
        "created": created,
        "updated": updated,
        "inactivated": inactivated
    })
@api_view(['GET'])
def get_divisions(request):
    divisions = Division.objects.all().values("id", "name")
    return Response(list(divisions))
from django.db.models import Q

from datetime import date, timedelta

@api_view(['GET'])
def employee_list(request):
    division    = request.GET.get("division")
    status      = request.GET.get("status")
    search      = request.GET.get("search")
    designation = request.GET.get("designation")
    nationality = request.GET.get("nationality")
    expiry_alert = request.GET.get("expiry_alert")
    joined_from = request.GET.get("joined_from")
    joined_to   = request.GET.get("joined_to")

    employees = Employee.objects.all()

    if search:
        employees = employees.filter(
            Q(emp_id__icontains=search) | Q(name__icontains=search)
        )
    if division:
        employees = employees.filter(division__name=division)
    if status == "active":
        employees = employees.filter(is_active=True)
    elif status == "inactive":
        employees = employees.filter(is_active=False)

    # 🆕 Designation
    if designation:
        employees = employees.filter(
            Q(designation_aug__icontains=designation) |
            Q(designation_ipa__icontains=designation)
        )

    # 🆕 Nationality
    if nationality:
        employees = employees.filter(nationality__icontains=nationality)

    # 🆕 Expiry Alert (30 days)
    if expiry_alert:
        today = date.today()
        next_30 = today + timedelta(days=30)
        if expiry_alert == "wp":
            employees = employees.filter(wp_expiry__range=(today, next_30))
        elif expiry_alert == "passport":
            employees = employees.filter(passport_expiry__range=(today, next_30))

@api_view(['GET'])
def employee_list(request):
    division    = request.GET.get("division")
    status      = request.GET.get("status")
    search      = request.GET.get("search")
    designation = request.GET.get("designation")
    nationality = request.GET.get("nationality")
    expiry_alert = request.GET.get("expiry_alert")
    joined_from = request.GET.get("joined_from")
    joined_to   = request.GET.get("joined_to")

    employees = Employee.objects.all()

    if search:
        employees = employees.filter(
            Q(emp_id__icontains=search) | Q(name__icontains=search)
        )
    if division:
        employees = employees.filter(division__name=division)
    if status == "active":
        employees = employees.filter(is_active=True)
    elif status == "inactive":
        employees = employees.filter(is_active=False)

    # 🆕 Designation
    if designation:
        employees = employees.filter(
            Q(designation_aug__icontains=designation) |
            Q(designation_ipa__icontains=designation)
        )

    # 🆕 Nationality
    if nationality:
        employees = employees.filter(nationality__icontains=nationality)

    # 🆕 Expiry Alert (30 days)
    if expiry_alert:
        today = date.today()
        next_30 = today + timedelta(days=30)
        if expiry_alert == "wp":
            employees = employees.filter(wp_expiry__range=(today, next_30))
        elif expiry_alert == "passport":
            employees = employees.filter(passport_expiry__range=(today, next_30))

    # 🆕 Date Range (joined / doa)
    if joined_from:
        employees = employees.filter(doa__gte=joined_from)
    if joined_to:
        employees = employees.filter(doa__lte=joined_to)

    # Pagination
    paginator = PageNumberPagination()
    paginator.page_size = int(request.GET.get('page_size', 15))
    result_page = paginator.paginate_queryset(employees, request)

    data = []
    for e in result_page:
        data.append({
            "emp_id": e.emp_id,
            "name": e.name,
            "phone": e.phone,
            "designation": e.designation_aug,
            "division": e.division.name,
            "status": "Active" if e.is_active else "Inactive",
            "salary": e.ipa_salary  # Add salary field for editing
        })

    return paginator.get_paginated_response(data)

@api_view(['GET'])
def employee_detail(request, emp_id):
    try:
        e = Employee.objects.get(emp_id=emp_id)

        return Response({
            "emp_id": e.emp_id,
            "name": e.name,
            "phone": e.phone,
            "division": e.division.name,
            "status": "Active" if e.is_active else "Inactive",

            # 🔥 FULL DETAILS
            "designation_ipa": e.designation_ipa,
            "ipa_salary": e.ipa_salary,
            "per_hr": e.per_hr,
            "designation_aug": e.designation_aug,

            "work_permit_no": e.work_permit_no,
            "fin_no": e.fin_no,
            "issue_date": e.issue_date,
            "ic_status": e.ic_status,
            "wp_expiry": e.wp_expiry,

            "passport_no": e.passport_no,
            "passport_expiry": e.passport_expiry,
            "passport_issue_date": e.passport_issue_date,
            "passport_issue_place": e.passport_issue_place,

            "doa": e.doa,
            "arrival_date": e.arrival_date,

            "nationality": e.nationality,
            "dob": e.dob,

            "ssic_gt_sn": e.ssic_gt_sn,
            "ssic_gt_exp": e.ssic_gt_exp,
            "ssic_ht_sn": e.ssic_ht_sn,
            "ssic_ht_exp": e.ssic_ht_exp,

            "work_at_height": e.work_at_height,
            "confined_space": e.confined_space,

            "welder_no": e.welder_no,
            "lssc_sn": e.lssc_sn,

            "signalman_rigger": e.signalman_rigger,
            "firewatchman": e.firewatchman,
            "gas_meter_carrier": e.gas_meter_carrier,

            "dynamac_pass_sn": e.dynamac_pass_sn,
            "dynamac_pass_exp": e.dynamac_pass_exp,

            "salary": e.salary,
            "bank_account": e.bank_account,

            "qualification": e.qualification,
            "accommodation": e.accommodation,
            "pcp_status": e.pcp_status,

            "security_bond_no": e.security_bond_no,
            "security_bond_exp": e.security_bond_exp,

            "remarks": e.remarks,
        })

    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)


@api_view(['PUT'])
def update_employee(request, emp_id):
    try:
        print(f"Update request for emp_id: {emp_id}")
        print(f"Request method: {request.method}")
        print(f"Request data: {request.data}")
        print(f"Request content type: {request.content_type}")

        emp = Employee.objects.get(emp_id=emp_id)
        print(f"Found employee: {emp.name} (ID: {emp.id})")

        # Update only provided fields (partial update)
        updated_fields = []

        if 'name' in request.data and request.data['name']:
            emp.name = request.data['name']
            updated_fields.append('name')
            print(f"Updating name to: {request.data['name']}")

        if 'phone' in request.data:
            emp.phone = request.data['phone'] if request.data['phone'] else None
            updated_fields.append('phone')
            print(f"Updating phone to: {request.data['phone']}")

        if 'salary' in request.data and request.data['salary']:
            try:
                salary_value = float(request.data['salary'])
                emp.ipa_salary = salary_value
                updated_fields.append('ipa_salary')
                print(f"Updating salary to: {salary_value}")
            except (ValueError, TypeError) as e:
                print(f"Error converting salary: {e}")
                return Response({"error": "Invalid salary format"}, status=400)

        if 'designation_ipa' in request.data:
            emp.designation_ipa = request.data['designation_ipa'] if request.data['designation_ipa'] else None
            updated_fields.append('designation_ipa')
            print(f"Updating designation_ipa to: {request.data['designation_ipa']}")

        if 'nationality' in request.data:
            emp.nationality = request.data['nationality'] if request.data['nationality'] else None
            updated_fields.append('nationality')
            print(f"Updating nationality to: {request.data['nationality']}")

        if 'dob' in request.data:
            if request.data['dob']:
                try:
                    from datetime import datetime
                    emp.dob = datetime.strptime(request.data['dob'], '%Y-%m-%d').date()
                    updated_fields.append('dob')
                    print(f"Updating dob to: {request.data['dob']}")
                except ValueError as e:
                    print(f"Error parsing dob: {e}")
                    return Response({"error": "Invalid date format for dob. Use YYYY-MM-DD"}, status=400)
            else:
                emp.dob = None
                updated_fields.append('dob')
                print("Setting dob to None")

        if 'work_permit_no' in request.data:
            emp.work_permit_no = request.data['work_permit_no'] if request.data['work_permit_no'] else None
            updated_fields.append('work_permit_no')
            print(f"Updating work_permit_no to: {request.data['work_permit_no']}")

        if 'fin_no' in request.data:
            emp.fin_no = request.data['fin_no'] if request.data['fin_no'] else None
            updated_fields.append('fin_no')
            print(f"Updating fin_no to: {request.data['fin_no']}")

        if 'passport_no' in request.data:
            emp.passport_no = request.data['passport_no'] if request.data['passport_no'] else None
            updated_fields.append('passport_no')
            print(f"Updating passport_no to: {request.data['passport_no']}")

        if 'qualification' in request.data:
            emp.qualification = request.data['qualification'] if request.data['qualification'] else None
            updated_fields.append('qualification')
            print(f"Updating qualification to: {request.data['qualification']}")

        if 'accommodation' in request.data:
            emp.accommodation = request.data['accommodation'] if request.data['accommodation'] else None
            updated_fields.append('accommodation')
            print(f"Updating accommodation to: {request.data['accommodation']}")

        if 'remarks' in request.data:
            emp.remarks = request.data['remarks'] if request.data['remarks'] else None
            updated_fields.append('remarks')
            print(f"Updating remarks to: {request.data['remarks']}")

        if not updated_fields:
            return Response({"error": "No valid fields to update"}, status=400)

        emp.save()
        print(f"Employee saved successfully. Updated fields: {updated_fields}")

        return Response({
            "message": "Employee updated successfully",
            "updated_fields": updated_fields
        })

    except Employee.DoesNotExist:
        print(f"Employee not found: {emp_id}")
        available_ids = list(Employee.objects.values_list('emp_id', flat=True)[:10])
        print(f"Available emp_ids: {available_ids}")
        return Response({"error": f"Employee not found: {emp_id}"}, status=404)
    except Exception as e:
        print(f"Error updating employee: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=400)