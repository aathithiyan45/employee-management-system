from employees.models import Employee, User

count = 0

for emp in Employee.objects.all():
    if not emp.user:

        user, created = User.objects.get_or_create(
            username=emp.emp_id,
            defaults={"role": "employee"}
        )

        if created:
            user.set_password(emp.emp_id)
            user.must_change_password = True
            user.save()

        emp.user = user
        emp.save()

        count += 1

print("✅ Users created:", count)