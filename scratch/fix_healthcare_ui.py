import re

with open('components/HealthcareBookingView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "onClick={() => bookAppointment(provider.id, day.date, slot, 'General Visit')}",
    "onClick={() => bookAppointment('org1', 'patient1', provider.id, day.date, slot, 'General Visit')}"
)

with open('components/HealthcareBookingView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed HealthcareBookingView")
