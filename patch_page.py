import sys

with open('app/(resident)/workspaces/restaurantos/[slug]/management/capabilities/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''import CapabilityManager from '@/components/restaurantos/management/CapabilityManager';'''
replacement = '''import CapabilityManager from '@/components/restaurantos/management/CapabilityManager';
import GeneralSettings from '@/components/restaurantos/management/GeneralSettings';'''

content = content.replace(target, replacement)

target2 = '''<h1 className="text-3xl font-black text-slate-900 tracking-tight">Capabilities</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          RestaurantOS adapts to your operational needs. Enable only the capabilities you want to use. You can disable them later without losing your historical data.
        </p>
      </div>

      <CapabilityManager organizationId={slug} initialSettings={settings} />'''

replacement2 = '''<h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Capabilities</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Configure your daily operations, taxes, service fees, and enable advanced capabilities like Inventory or Food Costing to adapt RestaurantOS to your specific needs.
        </p>
      </div>

      <GeneralSettings organizationId={slug} initialSettings={settings} />

      <div className="pt-6 border-t border-slate-200">
        <h2 className="text-xl font-black text-slate-900 mb-6">Advanced Capabilities</h2>
        <CapabilityManager organizationId={slug} initialSettings={settings} />
      </div>'''

content = content.replace(target2, replacement2)

with open('app/(resident)/workspaces/restaurantos/[slug]/management/capabilities/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
