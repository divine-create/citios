import sys

with open('app/business/hotelos/register/HotelRegisterForm.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
'''      const orgId = result.organizationId;
      const destination = orgId ? /workspaces/HOTELos/ : '/HOTEL/admin';
      try {
        if (orgId) {
          localStorage.setItem('cityconnect_active_business_id', orgId);
        }
      } catch {}
      window.location.href = destination;''',
'''      const orgId = result.organizationId;
      const destination = '/hotel/manager';
      try {
        if (orgId) {
          localStorage.setItem('cityconnect_active_business_id', orgId);
        }
      } catch {}
      window.location.href = destination;'''
)

with open('app/business/hotelos/register/HotelRegisterForm.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
